'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faExpand,
  faCompress,
  faRotateLeft,
  faCopy,
  faCheck,
  faFont,
  faPalette,
  faFileCode,
  faTerminal,
} from '@fortawesome/free-solid-svg-icons';
import { PRESET_THEMES } from '@/components/themes';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export interface TemplateCodeIDEProps {
  value: string;
  onChange: (val: string) => void;
  language: 'c' | 'cpp' | 'java' | 'python' | string;
  title?: string;
  className?: string;
}

const DEFAULT_BOILERPLATES: Record<string, string> = {
  c: `#include <stdio.h>\n\nint main() {\n    // Write your starter code here\n    printf("Hello, EduCode!\\n");\n    return 0;\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your starter code here\n    cout << "Hello, EduCode!" << endl;\n    return 0;\n}\n`,
  java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your starter code here\n        System.out.println("Hello, EduCode!");\n    }\n}\n`,
  python: `def solve():\n    # Write your starter code here\n    print("Hello, EduCode!")\n\nif __name__ == "__main__":\n    solve()\n`,
};

const FILE_NAMES: Record<string, string> = {
  c: 'solution.c',
  cpp: 'solution.cpp',
  java: 'Solution.java',
  python: 'solution.py',
};

export default function TemplateCodeIDE({
  value,
  onChange,
  language,
  title = 'Starter / Template Code for Students',
  className = '',
}: TemplateCodeIDEProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [themeId, setThemeId] = useState<string>('educode-dark');
  const [fontSize, setFontSize] = useState<number>(13);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [lineCount, setLineCount] = useState(1);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normLang = (language || 'cpp').toLowerCase();
  const fileName = FILE_NAMES[normLang] || `solution.${normLang}`;
  const monacoLang = normLang === 'c' ? 'c' : normLang === 'cpp' ? 'cpp' : normLang === 'java' ? 'java' : 'python';

  // Calculate line count from value
  useEffect(() => {
    const lines = (value || '').split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Load saved theme and settings from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.themeId) setThemeId(parsed.themeId);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard shortcut listener for Fullscreen (Esc / F11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Register preset themes before mount
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    PRESET_THEMES.forEach((t) => monaco.editor.defineTheme(t.id, t.data));
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };

  const handleResetToBoilerplate = useCallback(() => {
    const defaultCode = DEFAULT_BOILERPLATES[normLang] || DEFAULT_BOILERPLATES.cpp;
    if (!value || confirm('Reset template code to default boilerplate for this language?')) {
      onChange(defaultCode);
    }
  }, [normLang, value, onChange]);

  const handleCopyCode = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-200 ${
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-[#090d16] flex flex-col p-4 md:p-6 w-screen h-screen'
          : `glass-panel p-5 md:p-7 rounded-3xl border border-slate-800 space-y-4 shadow-xl ${className}`
      }`}
    >
      {/* IDE Section Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <FontAwesomeIcon icon={faCode} className="text-sm" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <span>{title}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Students will receive this initial code in their IDE workspace
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Theme Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1">
            <FontAwesomeIcon icon={faPalette} className="text-slate-400 text-xs" />
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
              title="Editor Theme"
            >
              {PRESET_THEMES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Adjust */}
          <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1">
            <FontAwesomeIcon icon={faFont} className="text-slate-400 text-xs mr-1" />
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              className="px-1.5 text-xs text-slate-400 hover:text-white font-bold"
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="text-xs font-mono text-slate-300 w-4 text-center">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="px-1.5 text-xs text-slate-400 hover:text-white font-bold"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Reset / Insert Boilerplate Button */}
          <button
            type="button"
            onClick={handleResetToBoilerplate}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            title="Reset or Insert Language Boilerplate"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-[11px] text-amber-400" />
            <span className="hidden sm:inline">Boilerplate</span>
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            disabled={!value}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-40"
            title="Copy Code to Clipboard"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullScreen}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border shadow-sm ${
              isFullScreen
                ? 'bg-brand-600 hover:bg-brand-500 text-white border-brand-500 shadow-brand-500/20'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={isFullScreen ? 'Exit Full Screen (Esc)' : 'Open Full Screen IDE'}
          >
            <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="text-xs" />
            <span>{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Editor Frame Container */}
      <div
        className={`flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-[#0F172A] shadow-2xl transition-all ${
          isFullScreen ? 'flex-1 min-h-0' : 'h-[440px]'
        }`}
      >
        {/* Tab Bar / Header of Monaco */}
        <div className="h-10 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between px-3 shrink-0 select-none">
          {/* Active File Tab */}
          <div className="flex items-center space-x-2 bg-[#0F172A] px-3.5 py-1.5 rounded-t-lg border-t-2 border-t-emerald-500 border-x border-slate-800 text-xs font-mono text-white">
            <FontAwesomeIcon icon={faFileCode} className="text-emerald-400 text-xs" />
            <span className="font-semibold">{fileName}</span>
            <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded font-sans">
              Template Source
            </span>
          </div>

          {/* Language & Compiler Tag */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-semibold">
              {normLang} syntax
            </span>
          </div>
        </div>

        {/* Monaco Editor Canvas */}
        <div className="flex-1 min-h-0 relative">
          <Editor
            height="100%"
            language={monacoLang}
            theme={themeId}
            value={value}
            onChange={(val) => onChange(val || '')}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            options={{
              fontSize,
              fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
              fontLigatures: true,
              minimap: { enabled: isFullScreen },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              padding: { top: 12, bottom: 12 },
              contextmenu: true,
            }}
          />
        </div>

        {/* Status Bar */}
        <div className="h-7 bg-[#0B1120] border-t border-slate-800/90 flex items-center justify-between px-3 text-[11px] text-slate-400 font-mono shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <FontAwesomeIcon icon={faTerminal} className="text-[10px] text-slate-500" />
              <span>EduCode IDE</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Ln {cursorPos.line}, Col {cursorPos.column}
            </span>
            <span className="text-slate-600">•</span>
            <span>{lineCount} lines</span>
          </div>

          <div className="flex items-center space-x-3">
            <span>UTF-8</span>
            <span className="text-slate-600">•</span>
            <span>Spaces: 4</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 uppercase font-semibold">{normLang}</span>
            {isFullScreen && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-brand-400 text-[10px]">Press Esc to exit</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
