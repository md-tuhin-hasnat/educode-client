'use client';

import React, { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';

interface XtermTerminalProps {
  height?: number;
}

export default function XtermTerminal({ height }: XtermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  // Using generic object type for dynamic xterm references to satisfy linter
  const termInstanceRef = useRef<{ cols: number; rows: number; focus: () => void; dispose: () => void } | null>(null);
  const fitAddonRef = useRef<{ fit: () => void } | null>(null);

  useEffect(() => {
    let cleanupOnData: (() => void) | null = null;
    let isMounted = true;

    async function initXterm() {
      if (!terminalRef.current || termInstanceRef.current) return;

      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      if (!isMounted || !terminalRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#0e131f',
          foreground: '#e2e8f0',
          cursor: '#10b981',
          selectionBackground: '#334155',
          black: '#1e293b',
          red: '#f43f5e',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f8fafc',
          brightBlack: '#475569',
          brightRed: '#fb7185',
          brightGreen: '#34d399',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(terminalRef.current);
      fitAddon.fit();

      termInstanceRef.current = term as unknown as { cols: number; rows: number; focus: () => void; dispose: () => void };
      fitAddonRef.current = fitAddon;

      // Handle user key input -> send to PTY IPC
      term.onData((data: string) => {
        window.educode?.pty?.write(data);
      });

      // Handle output from PTY IPC -> write to term
      if (window.educode?.pty) {
        await window.educode.pty.init();
        cleanupOnData = window.educode.pty.onData((output: string) => {
          term.write(output);
        });

        // Notify backend of initial terminal dimensions
        window.educode.pty.resize(term.cols, term.rows);
      } else {
        term.writeln('\x1b[33m[EduCode Web Shell Demo]\x1b[0m Native PTY service unavailable in standard browser mode.');
        term.writeln('Press the top \x1b[32mRun Code\x1b[0m button to trigger code execution.');
        term.write('\r\n\x1b[32mstudent@educode:~/workspace$\x1b[0m ');
      }
    }

    initXterm();

    const handleResize = () => {
      if (fitAddonRef.current && termInstanceRef.current) {
        try {
          fitAddonRef.current.fit();
          window.educode?.pty?.resize(
            termInstanceRef.current.cols,
            termInstanceRef.current.rows
          );
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (cleanupOnData) cleanupOnData();
      if (termInstanceRef.current) {
        termInstanceRef.current.dispose();
        termInstanceRef.current = null;
      }
    };
  }, []);

  // Fit terminal on height prop change
  useEffect(() => {
    if (fitAddonRef.current && termInstanceRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          if (termInstanceRef.current) {
            window.educode?.pty?.resize(
              termInstanceRef.current.cols,
              termInstanceRef.current.rows
            );
          }
        } catch {
          // ignore
        }
      }, 50);
    }
  }, [height]);

  return (
    <div
      onClick={() => termInstanceRef.current?.focus()}
      className="w-full h-full p-2 bg-[#0e131f] overflow-hidden"
    >
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
