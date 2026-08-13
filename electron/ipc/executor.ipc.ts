import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { resolveEntryPoint, WorkspaceFilePayload } from './entrypoint';

export interface CodeExecutionRequest {
  code?: string;
  language: 'c' | 'cpp' | 'python' | 'java';
  stdin?: string;
  timeoutMs?: number;
  files?: WorkspaceFilePayload[];
  activeFilePath?: string;
  compilerPaths?: {
    gcc?: string;
    gpp?: string;
    python?: string;
    javac?: string;
    java?: string;
  };
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  compilationError?: string;
  timedOut?: boolean;
}

export function registerExecutorIPC() {
  ipcMain.handle('executor:runCode', async (_event, req: CodeExecutionRequest): Promise<CodeExecutionResult> => {
    const defaultTimeoutSeconds = parseInt(process.env.CODE_TIMEOUT_SECONDS || '10', 10);
    const timeoutMs = req.timeoutMs !== undefined ? req.timeoutMs : defaultTimeoutSeconds * 1000;

    const { code = '', language, stdin = '', files, activeFilePath, compilerPaths } = req;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'educode_run_'));

    try {
      // 1. Write workspace files to tempDir if provided
      if (files && files.length > 0) {
        for (const file of files) {
          const fullPath = path.join(tempDir, file.path);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, file.content, 'utf-8');
        }
      }

      if (language === 'python') {
        return await runPython(code, stdin, tempDir, timeoutMs, files, activeFilePath, compilerPaths?.python);
      } else if (language === 'c') {
        return await runC(code, stdin, tempDir, timeoutMs, files, activeFilePath, compilerPaths?.gcc);
      } else if (language === 'cpp') {
        return await runCpp(code, stdin, tempDir, timeoutMs, files, activeFilePath, compilerPaths?.gpp);
      } else if (language === 'java') {
        return await runJava(code, stdin, tempDir, timeoutMs, files, activeFilePath, compilerPaths?.javac, compilerPaths?.java);
      } else {
        return {
          stdout: '',
          stderr: `Unsupported language: ${language}`,
          exitCode: 1,
          timeMs: 0,
        };
      }
    } finally {
      // Clean up temporary files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('[ExecutorIPC] Temp cleanup error:', err);
      }
    }
  });
}

function runPython(
  code: string,
  stdin: string,
  tempDir: string,
  timeoutMs: number,
  files?: WorkspaceFilePayload[],
  activeFilePath?: string,
  pythonBin?: string
): Promise<CodeExecutionResult> {
  const entry = resolveEntryPoint('python', files, activeFilePath);
  if (!files || files.length === 0) {
    const filePath = path.join(tempDir, entry.entryTarget);
    fs.writeFileSync(filePath, code);
  }

  const targetPath = path.join(tempDir, entry.entryTarget);
  const bin = pythonBin && pythonBin.trim() !== '' ? pythonBin.trim() : 'python3';
  return executeProcess(bin, [targetPath], stdin, timeoutMs, tempDir);
}

async function runC(
  code: string,
  stdin: string,
  tempDir: string,
  timeoutMs: number,
  files?: WorkspaceFilePayload[],
  activeFilePath?: string,
  gccBin?: string
): Promise<CodeExecutionResult> {
  const entry = resolveEntryPoint('c', files, activeFilePath);
  const binPath = path.join(tempDir, 'solution.out');

  if (!files || files.length === 0) {
    const srcPath = path.join(tempDir, entry.entryTarget);
    fs.writeFileSync(srcPath, code);
  }

  const gcc = gccBin && gccBin.trim() !== '' ? gccBin.trim() : 'gcc';
  const cFiles = files && files.length > 0
    ? files.filter(f => f.path.endsWith('.c')).map(f => path.join(tempDir, f.path))
    : [path.join(tempDir, entry.entryTarget)];

  // Compile with gcc
  const compileRes = await executeProcess(gcc, ['-O2', ...cFiles, '-o', binPath], '', 15000, tempDir);
  if (compileRes.exitCode !== 0) {
    return {
      stdout: '',
      stderr: compileRes.stderr || 'Compilation failed.',
      exitCode: compileRes.exitCode,
      timeMs: compileRes.timeMs,
      compilationError: compileRes.stderr,
    };
  }

  // Execute binary
  return executeProcess(binPath, [], stdin, timeoutMs, tempDir);
}

async function runCpp(
  code: string,
  stdin: string,
  tempDir: string,
  timeoutMs: number,
  files?: WorkspaceFilePayload[],
  activeFilePath?: string,
  gppBin?: string
): Promise<CodeExecutionResult> {
  const entry = resolveEntryPoint('cpp', files, activeFilePath);
  const binPath = path.join(tempDir, 'solution.out');

  if (!files || files.length === 0) {
    const srcPath = path.join(tempDir, entry.entryTarget);
    fs.writeFileSync(srcPath, code);
  }

  const gpp = gppBin && gppBin.trim() !== '' ? gppBin.trim() : 'g++';
  const cppFiles = files && files.length > 0
    ? files.filter(f => f.path.endsWith('.cpp')).map(f => path.join(tempDir, f.path))
    : [path.join(tempDir, entry.entryTarget)];

  // Compile with g++
  const compileRes = await executeProcess(gpp, ['-O2', ...cppFiles, '-o', binPath], '', 15000, tempDir);
  if (compileRes.exitCode !== 0) {
    return {
      stdout: '',
      stderr: compileRes.stderr || 'Compilation failed.',
      exitCode: compileRes.exitCode,
      timeMs: compileRes.timeMs,
      compilationError: compileRes.stderr,
    };
  }

  // Execute binary
  return executeProcess(binPath, [], stdin, timeoutMs, tempDir);
}

async function runJava(
  code: string,
  stdin: string,
  tempDir: string,
  timeoutMs: number,
  files?: WorkspaceFilePayload[],
  activeFilePath?: string,
  javacBin?: string,
  javaBin?: string
): Promise<CodeExecutionResult> {
  const entry = resolveEntryPoint('java', files, activeFilePath);
  const binDir = path.join(tempDir, 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  if (!files || files.length === 0) {
    const srcPath = path.join(tempDir, `${entry.className || 'Solution'}.java`);
    fs.writeFileSync(srcPath, code);
  }

  const javac = javacBin && javacBin.trim() !== '' ? javacBin.trim() : 'javac';
  const java = javaBin && javaBin.trim() !== '' ? javaBin.trim() : 'java';

  // Find all java files recursively in tempDir
  const getAllJavaFiles = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (file !== 'bin') results = results.concat(getAllJavaFiles(filePath));
      } else if (file.endsWith('.java')) {
        results.push(filePath);
      }
    });
    return results;
  };

  const javaSources = getAllJavaFiles(tempDir);

  // Compile with javac -d bin
  const compileRes = await executeProcess(javac, ['-d', binDir, ...javaSources], '', 15000, tempDir);
  if (compileRes.exitCode !== 0) {
    return {
      stdout: '',
      stderr: compileRes.stderr || 'Compilation failed.',
      exitCode: compileRes.exitCode,
      timeMs: compileRes.timeMs,
      compilationError: compileRes.stderr,
    };
  }

  // Execute with java -cp bin <entryTarget>
  return executeProcess(java, ['-cp', binDir, entry.entryTarget], stdin, timeoutMs, tempDir);
}

function executeProcess(command: string, args: string[], stdin: string, timeoutMs: number, cwd?: string): Promise<CodeExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;

    const child = spawn(command, args, { cwd });

    let timer: NodeJS.Timeout | null = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        killedByTimeout = true;
        try {
          child.kill('SIGKILL');
        } catch (err) {
          console.error('[ExecutorIPC] Failed to kill timed out process:', err);
        }
      }, timeoutMs);
    }

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      const timeMs = Date.now() - startTime;

      if (killedByTimeout) {
        stderr += `\n[EduCode Engine] Execution timed out after ${(timeoutMs / 1000).toFixed(1)}s (Process killed).`;
      }

      resolve({
        stdout,
        stderr,
        exitCode: code ?? (killedByTimeout ? 124 : 1),
        timeMs,
        timedOut: killedByTimeout,
      });
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (timer) clearTimeout(timer);
      let errorMsg = err.message;
      if (err.code === 'ENOENT') {
        errorMsg = `[EduCode Engine Error] Compiler or runtime binary '${command}' was not found on your system PATH.\nPlease install '${command}' to execute ${command.includes('python') ? 'Python' : command.includes('java') ? 'Java' : 'C/C++'} code locally.`;
      }

      resolve({
        stdout: '',
        stderr: errorMsg,
        exitCode: 127,
        timeMs: Date.now() - startTime,
      });
    });
  });
}
