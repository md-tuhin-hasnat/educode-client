import { ipcMain, BrowserWindow } from 'electron';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn as childSpawn, ChildProcess } from 'child_process';

import { resolveEntryPoint } from './entrypoint';

let nodePty: typeof import('node-pty') | null = null;
try {
  // Try importing node-pty
  nodePty = require('node-pty');
} catch (e) {
  console.warn('[PtyIPC] node-pty not available, falling back to child_process spawn shell:', e);
}

interface PtySession {
  type: 'node-pty' | 'child_process';
  instance: any;
}

let ptySession: PtySession | null = null;
let workspaceDir: string = path.join(os.tmpdir(), 'educode_workspace');

if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
}

export function registerPtyIPC(mainWindow: BrowserWindow | null) {
  async function ensurePtySession(): Promise<PtySession | null> {
    if (ptySession) return ptySession;

    const isWindows = process.platform === 'win32';
    const shell = isWindows
      ? process.env.COMSPEC || 'powershell.exe'
      : process.env.SHELL || '/bin/bash';

    if (nodePty) {
      try {
        const ptyProc = nodePty.spawn(shell, [], {
          name: 'xterm-color',
          cols: 80,
          rows: 24,
          cwd: workspaceDir,
          env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
        });

        ptyProc.onData((data: string) => {
          mainWindow?.webContents.send('pty:data', data);
        });

        ptySession = { type: 'node-pty', instance: ptyProc };
        console.log('[PtyIPC] Initialized native PTY shell using node-pty');
        return ptySession;
      } catch (err) {
        console.error('[PtyIPC] node-pty spawn failed, falling back to child_process:', err);
      }
    }

    // Fallback: child_process shell
    const childShell: ChildProcess = childSpawn(shell, [], {
      cwd: workspaceDir,
      env: { ...process.env, TERM: 'xterm-256color' },
      shell: true,
    });

    childShell.stdout?.on('data', (data: Buffer) => {
      mainWindow?.webContents.send('pty:data', data.toString());
    });

    childShell.stderr?.on('data', (data: Buffer) => {
      mainWindow?.webContents.send('pty:data', data.toString());
    });

    childShell.on('exit', () => {
      ptySession = null;
    });

    ptySession = { type: 'child_process', instance: childShell };
    console.log('[PtyIPC] Initialized fallback child_process shell');
    return ptySession;
  }

  // Ensure single initialization
  ipcMain.handle('pty:init', async () => {
    const session = await ensurePtySession();
    return { status: 'initialized', type: session?.type };
  });

  // Handle write to shell (keystrokes / commands)
  ipcMain.on('pty:write', async (_event, data: string) => {
    const session = await ensurePtySession();
    if (!session) return;
    if (session.type === 'node-pty') {
      session.instance.write(data);
    } else if (session.type === 'child_process') {
      session.instance.stdin?.write(data);
    }
  });

  // Handle terminal window resize
  ipcMain.on('pty:resize', (_event, cols: number, rows: number) => {
    if (ptySession && ptySession.type === 'node-pty') {
      try {
        ptySession.instance.resize(cols, rows);
      } catch (err) {
        console.error('[PtyIPC] PTY resize failed:', err);
      }
    }
  });

  // Handle VS Code Code Runner action
  ipcMain.handle('pty:runCode', async (_event, req: {
    code?: string;
    language: string;
    files?: Array<{ path: string; content: string }>;
    activeFilePath?: string;
  }) => {
    const session = await ensurePtySession();

    const { code, language, files, activeFilePath } = req;
    const isWindows = process.platform === 'win32';

    // 1. Clean and write workspace files to disk
    try {
      if (fs.existsSync(workspaceDir)) {
        const existingEntries = fs.readdirSync(workspaceDir);
        for (const entry of existingEntries) {
          fs.rmSync(path.join(workspaceDir, entry), { recursive: true, force: true });
        }
      } else {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }
    } catch (err) {
      console.error('[PtyIPC] Error clearing workspace directory:', err);
    }

    if (files && files.length > 0) {
      for (const file of files) {
        const fullPath = path.join(workspaceDir, file.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }
    } else if (code) {
      // Single file fallback
      let fileName = 'solution.cpp';
      if (language === 'python') fileName = 'solution.py';
      else if (language === 'c') fileName = 'solution.c';
      else if (language === 'java') fileName = 'Solution.java';

      const filePath = path.join(workspaceDir, fileName);
      fs.writeFileSync(filePath, code, 'utf-8');
    }

    // 2. Resolve Entry Point
    const entry = resolveEntryPoint(language, files, activeFilePath);

    // 3. Determine command
    let command = '';

    if (language === 'java') {
      if (isWindows) {
        command = `Get-ChildItem -Recurse -Filter *.java | ForEach-Object { $_.FullName } > sources.txt ; javac -d bin @sources.txt ; java -cp bin ${entry.entryTarget}`;
      } else {
        command = `find . -name "*.java" > sources.txt && javac -d bin @sources.txt && java -cp bin ${entry.entryTarget}`;
      }
    } else if (language === 'cpp') {
      if (isWindows) {
        command = `g++ -O2 *.cpp -o solution.exe ; .\\solution.exe`;
      } else {
        command = `g++ -O2 $(find . -name "*.cpp") -o solution && ./solution`;
      }
    } else if (language === 'c') {
      if (isWindows) {
        command = `gcc -O2 *.c -o solution.exe ; .\\solution.exe`;
      } else {
        command = `gcc -O2 $(find . -name "*.c") -o solution && ./solution`;
      }
    } else if (language === 'python') {
      if (isWindows) {
        command = `python ${entry.entryTarget}`;
      } else {
        command = `python3 ${entry.entryTarget}`;
      }
    }

    // 4. Write command directly to shell input line
    const carriageReturn = isWindows ? '\r\n' : '\n';
    if (ptySession?.type === 'node-pty') {
      ptySession.instance.write(command + carriageReturn);
    } else if (ptySession?.type === 'child_process') {
      ptySession.instance.stdin?.write(command + carriageReturn);
    }

    return { status: 'running', command };
  });
}

