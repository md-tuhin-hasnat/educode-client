'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faPaperPlane,
  faClock,
  faExclamationTriangle,
  faCode,
  faTerminal,
  faShieldHalved,
  faKeyboard,
  faExpand,
  faCompress,
  faGear,
  faGripVertical,
  faTrash,
  faLaptopCode,
  faRotateLeft,
  faTimes,
  faFileCode,
  faFolderPlus,
  faPlus,
  faFloppyDisk,
  faFlask,
  faVial,
  faRotateRight,
  faWindowMaximize,
  faWindowRestore,
} from '@fortawesome/free-solid-svg-icons';
import IDESettingsModal, { DEFAULT_SETTINGS, IDESettings } from '@/components/IDESettingsModal';
import FileExplorer, { WorkspaceFile } from '@/components/FileExplorer';
import JavaPackageModal from '@/components/JavaPackageModal';
import { PRESET_THEMES } from '@/components/themes';
import { saveCodeDraft, loadCodeDraft, clearCodeDraft } from '@/utils/draftStorage';
import {
  TestCaseInput,
  TestCaseResult,
  TestSuiteSummary,
  runAllTestCases,
} from '@/utils/testCaseRunner';
import TestCaseRunnerPanel from '@/components/TestCaseRunnerPanel';
import { validateCodeSyntax, parseCompilerErrors, SyntaxMarker } from '@/utils/syntaxValidator';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Dynamically import Monaco Editor to avoid SSR hydration mismatches
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const XtermTerminal = dynamic(() => import('@/components/XtermTerminal'), { ssr: false });

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  compilationError?: string;
  timedOut?: boolean;
}
interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  language: string;
  stdin: string;
  result: ExecutionResult;
}

export default function StudentExamPage({ params }: { params: { taskId: string } }) {
  const [language, setLanguage] = useState<'cpp' | 'python' | 'java' | 'c'>('cpp');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('5\n1 2 3 4 5');
  const [activeTab, setActiveTab] = useState<'problem' | 'files' | 'console' | 'testcases'>('problem');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<ExecutionResult | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);

  // Test Case Evaluation States
  const [testCases, setTestCases] = useState<TestCaseInput[]>([
    { id: '1', order: 1, inputData: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', points: 25, isHidden: false },
    { id: '2', order: 2, inputData: '4\n10 20 30 40', expectedOutput: '40 30 20 10', points: 25, isHidden: false },
    { id: '3', order: 3, inputData: '1\n42', expectedOutput: '42', points: 25, isHidden: false },
    { id: '4', order: 4, inputData: '6\n1 9 2 8 3 7', expectedOutput: '7 3 8 2 9 1', points: 25, isHidden: true },
  ]);
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Workspace Multi-File & Multi-Tab State
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [openTabPaths, setOpenTabPaths] = useState<string[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [isJavaPackageModalOpen, setIsJavaPackageModalOpen] = useState<boolean>(false);

  // Draft Saving State
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // VS Code Integrated Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);
  const [terminalHeight, setTerminalHeight] = useState<number>(240);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState<boolean>(false);
  const [isTerminalResizing, setIsTerminalResizing] = useState<boolean>(false);

  // Full Focus & Resizable Splitter State
  const [isFullFocus, setIsFullFocus] = useState<boolean>(false);
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(40);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // IDE Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [ideSettings, setIdeSettings] = useState<IDESettings>(DEFAULT_SETTINGS);
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Load stored IDE settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        setIdeSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load IDE settings:', e);
    }
  }, []);

  // Save updated settings
  const handleSaveSettings = (newSettings: IDESettings) => {
    setIdeSettings(newSettings);
    try {
      localStorage.setItem('educode_ide_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save IDE settings:', e);
    }
  };

  // Register theme into Monaco
  const handleRegisterCustomTheme = useCallback(
    (themeId: string, _themeName: string, themeData: editor.IStandaloneThemeData) => {
      if (monacoRef.current) {
        monacoRef.current.editor.defineTheme(themeId, themeData);
        monacoRef.current.editor.setTheme(themeId);
      }
    },
    []
  );

  // Monaco Editor before mount hook to register custom & preset themes
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;

    // Register all preset themes
    PRESET_THEMES.forEach((t) => monaco.editor.defineTheme(t.id, t.data));

    // Register user custom themes if present
    if (ideSettings.customThemes) {
      Object.entries(ideSettings.customThemes).forEach(([id, t]) => {
        monaco.editor.defineTheme(id, t.data);
      });
    }
  };

  // Real-time syntax and compiler diagnostic marker updates
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    // 1. Perform client-side syntax validation
    const syntaxErrors = validateCodeSyntax(code, language, activeFilePath);

    // 2. Parse compiler diagnostic errors if stderr is available
    let compilerErrors: SyntaxMarker[] = [];
    if (executionOutput?.stderr) {
      compilerErrors = parseCompilerErrors(executionOutput.stderr);
    }

    // Combine markers and set on Monaco Editor model
    const allMarkers = [...syntaxErrors, ...compilerErrors];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monacoRef.current.editor.setModelMarkers(model, 'syntaxValidator', allMarkers as any);
  }, [code, language, executionOutput, activeFilePath]);

  // Focus & integrity monitoring state
  const [focusWarnings, setFocusWarnings] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
  const [lastWarningReason, setLastWarningReason] = useState<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const internalCopiedTextRef = useRef<string>('');

  // Exam Countdown Timer (120 Mins = 7200s)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(7200);

  // Default Files Boilerplate Generator
  const getDefaultFilesForLanguage = useCallback((lang: string): WorkspaceFile[] => {
    if (lang === 'java') {
      return [
        {
          id: '1',
          path: 'Solution.java',
          content: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (scanner.hasNextInt()) {\n            int n = scanner.nextInt();\n            int[] arr = new int[n];\n            for (int i = 0; i < n; i++) arr[i] = scanner.nextInt();\n            for (int i = n - 1; i >= 0; i--) System.out.print(arr[i] + (i == 0 ? "" : " "));\n            System.out.println();\n        } else {\n            System.out.println("EduCode Exam Platform");\n        }\n    }\n}`,
        },
      ];
    }
    if (lang === 'python') {
      return [
        {
          id: '1',
          path: 'solution.py',
          content: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines:\n        print("EduCode Exam Platform")\n        return\n    n = int(lines[0])\n    arr = lines[1:n+1]\n    print(" ".join(reversed(arr)))\n\nif __name__ == "__main__":\n    solve()\n`,
        },
      ];
    }
    if (lang === 'c') {
      return [
        {
          id: '1',
          path: 'solution.c',
          content: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        int arr[100];\n        for(int i=0; i<n; i++) scanf("%d", &arr[i]);\n        for(int i=n-1; i>=0; i--) printf("%d%s", arr[i], i==0 ? "" : " ");\n        printf("\\n");\n    } else {\n        printf("EduCode Exam Platform\\n");\n    }\n    return 0;\n}`,
        },
      ];
    }
    return [
      {
        id: '1',
        path: 'solution.cpp',
        content: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        int arr[100];\n        for(int i=0; i<n; i++) cin >> arr[i];\n        for(int i=n-1; i>=0; i--) cout << arr[i] << (i==0 ? "" : " ");\n        cout << endl;\n    } else {\n        cout << "EduCode Exam Platform" << endl;\n    }\n    return 0;\n}`,
      },
    ];
  }, []);

  // Initialize workspace from saved draft or defaults on mount
  useEffect(() => {
    const savedDraft = loadCodeDraft(params.taskId);
    if (savedDraft && Array.isArray(savedDraft.files) && savedDraft.files.length > 0) {
      if (savedDraft.language && ['cpp', 'python', 'java', 'c'].includes(savedDraft.language)) {
        setLanguage(savedDraft.language as 'cpp' | 'python' | 'java' | 'c');
      }
      setWorkspaceFiles(savedDraft.files);
      const tabs = savedDraft.openTabPaths?.length ? savedDraft.openTabPaths : [savedDraft.files[0].path];
      setOpenTabPaths(tabs);
      const active = savedDraft.activeFilePath || tabs[0];
      setActiveFilePath(active);
      const activeFile = savedDraft.files.find((f) => f.path === active);
      setCode(activeFile ? activeFile.content : savedDraft.code || savedDraft.files[0].content);
      if (savedDraft.updatedAt) {
        setLastSavedTime(new Date(savedDraft.updatedAt).toLocaleTimeString());
        setDraftStatus('saved');
      }
    } else {
      const initialFiles = getDefaultFilesForLanguage(language);
      setWorkspaceFiles(initialFiles);
      const mainFile = initialFiles[0];
      setOpenTabPaths([mainFile.path]);
      setActiveFilePath(mainFile.path);
      setCode(mainFile.content);
      setDraftStatus('idle');
      setLastSavedTime(null);
    }
  }, [params.taskId, getDefaultFilesForLanguage]);

  // When language is manually changed
  const handleLanguageChange = (newLang: 'cpp' | 'python' | 'java' | 'c') => {
    setLanguage(newLang);
    const newFiles = getDefaultFilesForLanguage(newLang);
    setWorkspaceFiles(newFiles);
    const mainFile = newFiles[0];
    setOpenTabPaths([mainFile.path]);
    setActiveFilePath(mainFile.path);
    setCode(mainFile.content);
  };

  // Auto-save draft when workspace changes
  useEffect(() => {
    if (!params.taskId || workspaceFiles.length === 0) return;

    setDraftStatus('saving');
    const timer = setTimeout(() => {
      const saved = saveCodeDraft(params.taskId, {
        language,
        files: workspaceFiles,
        openTabPaths,
        activeFilePath,
        code,
      });
      if (saved) {
        setDraftStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [params.taskId, language, workspaceFiles, openTabPaths, activeFilePath, code]);

  const handleManualSaveDraft = () => {
    if (!params.taskId || workspaceFiles.length === 0) return;
    setDraftStatus('saving');
    const saved = saveCodeDraft(params.taskId, {
      language,
      files: workspaceFiles,
      openTabPaths,
      activeFilePath,
      code,
    });
    if (saved) {
      setDraftStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
    }
  };

  // Update file content when user types in Monaco
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setWorkspaceFiles((prev) =>
      prev.map((f) => (f.path === activeFilePath ? { ...f, content: newCode } : f))
    );
  };

  // Open file in Monaco editor
  const handleSelectFile = (filePath: string) => {
    const file = workspaceFiles.find((f) => f.path === filePath);
    if (!file || file.isFolder) return;

    if (!openTabPaths.includes(filePath)) {
      setOpenTabPaths((prev) => [...prev, filePath]);
    }
    setActiveFilePath(filePath);
    setCode(file.content);
  };

  // Close tab
  const handleCloseTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTabs = openTabPaths.filter((p) => p !== filePath);
    setOpenTabPaths(updatedTabs);

    if (activeFilePath === filePath) {
      if (updatedTabs.length > 0) {
        const nextPath = updatedTabs[updatedTabs.length - 1];
        setActiveFilePath(nextPath);
        const nextFile = workspaceFiles.find((f) => f.path === nextPath);
        if (nextFile) setCode(nextFile.content);
      } else {
        setActiveFilePath('');
        setCode('');
      }
    }
  };

  // Create new file
  const handleCreateFile = (pathName: string, content = '') => {
    if (workspaceFiles.some((f) => f.path === pathName)) return;
    const newFile: WorkspaceFile = {
      id: Math.random().toString(36).substring(2, 9),
      path: pathName,
      content,
    };
    setWorkspaceFiles((prev) => [...prev, newFile]);
    if (!openTabPaths.includes(pathName)) {
      setOpenTabPaths((prev) => [...prev, pathName]);
    }
    setActiveFilePath(pathName);
    setCode(content);
  };

  // Create new folder
  const handleCreateFolder = (folderPath: string) => {
    if (workspaceFiles.some((f) => f.path === folderPath)) return;
    const newFolder: WorkspaceFile = {
      id: Math.random().toString(36).substring(2, 9),
      path: folderPath,
      content: '',
      isFolder: true,
    };
    setWorkspaceFiles((prev) => [...prev, newFolder]);
  };

  // Delete file or folder
  const handleDeletePath = (targetPath: string) => {
    setWorkspaceFiles((prev) =>
      prev.filter((f) => f.path !== targetPath && !f.path.startsWith(targetPath + '/'))
    );
    setOpenTabPaths((prev) =>
      prev.filter((p) => p !== targetPath && !p.startsWith(targetPath + '/'))
    );
    if (activeFilePath === targetPath || activeFilePath.startsWith(targetPath + '/')) {
      setActiveFilePath('');
      setCode('');
    }
  };

  // NetBeans Java Package Creation Helper Handler
  const handleCreateJavaPackage = (
    pkgName: string,
    className: string,
    elementType: 'class' | 'interface' | 'enum',
    includeMain: boolean
  ) => {
    const folderPath = pkgName ? pkgName.replace(/\./g, '/') : '';
    const filePath = folderPath ? `${folderPath}/${className}.java` : `${className}.java`;

    let generatedCode = '';
    if (pkgName) {
      generatedCode += `package ${pkgName};\n\n`;
    }
    generatedCode += `public ${elementType} ${className} {\n`;
    if (includeMain && elementType === 'class') {
      generatedCode += `    public static void main(String[] args) {\n        System.out.println("Hello from NetBeans Java Package!");\n    }\n`;
    }
    generatedCode += `}\n`;

    handleCreateFile(filePath, generatedCode);
  };

  // Resizable Splitter Logic
  const animFrameRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      animFrameRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        const percentage = (relativeX / rect.width) * 100;
        // Clamp between 15% and 80%
        if (percentage >= 15 && percentage <= 80) {
          setLeftWidthPercent(percentage);
        }
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Initialize integrity proctoring engine session
  useEffect(() => {
    if (typeof window !== 'undefined' && window.educode?.integrity) {
      window.educode.integrity.startMonitoring(`submission-${params.taskId}-${Date.now()}`);
      setIsMonitoringActive(true);

      const cleanup = window.educode.integrity.onFocusLost((data) => {
        setFocusWarnings(data.warnings);
        setLastWarningReason(data.details || 'Window focus loss');
        setShowWarningModal(true);
      });

      return () => {
        cleanup();
        if (window.educode?.integrity) {
          window.educode.integrity.stopMonitoring();
        }
      };
    }
  }, [params.taskId]);

  // Clipboard & Keystroke telemetry tracking
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (lastKeyTimeRef.current > 0) {
      const diff = now - lastKeyTimeRef.current;
      if (diff < 15) {
        window.educode?.integrity?.logEvent({
          eventType: 'RAPID_ENTRY',
          details: `Burst typing detected: ${diff}ms key interval`,
          severity: 'MEDIUM',
        });
      }
    }
    lastKeyTimeRef.current = now;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const selection = window.getSelection()?.toString() || '';
      if (selection) {
        internalCopiedTextRef.current = selection;
      }
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedContent = e.clipboardData.getData('text');
    const isInternal = internalCopiedTextRef.current && pastedContent === internalCopiedTextRef.current;

    window.educode?.integrity?.logEvent({
      eventType: isInternal ? 'PASTE_INTERNAL' : 'PASTE_EXTERNAL',
      details: isInternal
        ? `Pasted ${pastedContent.length} chars copied from within IDE`
        : `Pasted ${pastedContent.length} chars copied from external clipboard`,
      severity: isInternal ? 'LOW' : 'HIGH',
    });
  };

  // Timer Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };



  // Handle Terminal Height Resize
  const handleTerminalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTerminalResizing(true);
  };

  const toggleMaximizeTerminal = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxHeight = Math.max(100, containerRect.height - 36);
    if (isTerminalMaximized) {
      setTerminalHeight(240);
      setIsTerminalMaximized(false);
    } else {
      setTerminalHeight(maxHeight);
      setIsTerminalMaximized(true);
    }
  }, [isTerminalMaximized]);

  useEffect(() => {
    if (!isTerminalResizing) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;
        const maxHeight = Math.max(100, containerRect.height - 36);
        const clampedHeight = Math.max(60, Math.min(maxHeight, newHeight));
        setTerminalHeight(clampedHeight);
        setIsTerminalMaximized(clampedHeight >= maxHeight - 10);
      });
    };

    const handleMouseUp = () => {
      setIsTerminalResizing(false);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isTerminalResizing]);

  const handleRunCode = async () => {
    setIsExecuting(true);
    setIsTerminalOpen(true);

    try {
      if (typeof window !== 'undefined' && window.educode?.pty) {
        await window.educode.pty.runCode({
          code,
          language,
          files: workspaceFiles,
          activeFilePath,
        });
      }
    } catch (err) {
      console.error('PTY Code Runner error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunConsoleCode = async (stdinText?: string) => {
    setIsExecuting(true);
    const activeInput = typeof stdinText === 'string' ? stdinText : customInput;

    try {
      let res: ExecutionResult;
      if (typeof window !== 'undefined' && window.educode?.executor) {
        res = await window.educode.executor.runCode({
          language,
          code,
          stdin: activeInput,
          timeoutMs: 0,
          files: workspaceFiles,
          activeFilePath,
          compilerPaths: {
            gcc: ideSettings.gccPath,
            gpp: ideSettings.gppPath,
            python: ideSettings.pythonPath,
            javac: ideSettings.javacPath,
            java: ideSettings.javaPath,
          },
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        res = {
          stdout: activeInput ? `Processed Output:\n${activeInput.trim().split('\n').slice(1).join(' ').split(' ').reverse().join(' ')}\n` : 'EduCode Execution Finished\n',
          stderr: '',
          exitCode: 0,
          timeMs: 38,
        };
      }

      setExecutionOutput(res);
      setConsoleLogs((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          language,
          stdin: activeInput,
          result: res,
        },
        ...prev,
      ]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Console execution failed';
      const errRes: ExecutionResult = {
        stdout: '',
        stderr: errorMsg,
        exitCode: 1,
        timeMs: 0,
      };
      setExecutionOutput(errRes);
    } finally {
      setIsExecuting(false);
    }
  };

  // Run All Automated Evaluation Test Cases
  const handleRunAllTests = async () => {
    if (isTesting || testCases.length === 0) return;
    setIsTesting(true);
    setActiveTab('testcases');
    setIsFullFocus(false);

    try {
      const summary = await runAllTestCases(
        testCases,
        code,
        language,
        workspaceFiles,
        activeFilePath,
        (progress) => {
          setTestSummary((prev) => {
            const existingResults = prev?.results ? [...prev.results] : [];
            const idx = existingResults.findIndex((r) => r.testCaseId === progress.currentResult.testCaseId);
            if (idx >= 0) {
              existingResults[idx] = progress.currentResult;
            } else {
              existingResults.push(progress.currentResult);
            }

            return {
              totalCount: progress.totalCount,
              passedCount: progress.passedCount,
              failedCount: progress.failedCount,
              totalPoints: testCases.reduce((acc, t) => acc + (t.points ?? 10), 0),
              earnedPoints: existingResults.reduce((acc, r) => acc + (r.passed ? r.points : 0), 0),
              totalTimeMs: existingResults.reduce((acc, r) => acc + r.timeMs, 0),
              status: progress.passedCount === progress.totalCount ? 'ALL_PASSED' : 'PARTIAL_PASSED',
              results: existingResults,
              logs: progress.logs,
            };
          });
        }
      );
      setTestSummary(summary);
    } catch (err) {
      console.error('Test runner execution error:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddCustomTestCase = (tc: TestCaseInput) => {
    setTestCases((prev) => [...prev, tc]);
  };

  const handleSubmitExam = async () => {
    if (window.educode?.offline) {
      await window.educode.offline.saveSubmission({
        taskId: params.taskId,
        studentId: 'current-student-id',
        code,
        codeSnapshot: code,
        language,
        timestamp: Date.now(),
      });
    }
    alert('Exam submission successfully saved locally and queued for server sync!');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Exam Navigation Bar */}
      <div className="h-14 bg-[#111827] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-white tracking-wide text-sm flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span>Task #{params.taskId} Examination</span>
          </span>
          <span className="text-xs text-slate-500 font-mono">|</span>
          <span className="text-xs font-semibold text-slate-400">Offline Secure Workspace</span>
        </div>

        {/* Status Indicators & Action Bar */}
        <div className="flex items-center space-x-3 text-xs">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              isMonitoringActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <FontAwesomeIcon icon={faShieldHalved} className={isMonitoringActive ? 'animate-pulse' : ''} />
            <span>{isMonitoringActive ? 'Proctoring Active' : 'Standby'}</span>
          </div>

          {focusWarnings > 0 && (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-semibold flex items-center space-x-1 animate-pulse">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>Warnings: {focusWarnings}</span>
            </div>
          )}

          <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-tealAccent-400 text-xs font-mono font-bold flex items-center space-x-1.5">
            <FontAwesomeIcon icon={faClock} />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          {/* Full Focus Toggle Button */}
          <button
            onClick={() => setIsFullFocus(!isFullFocus)}
            title={isFullFocus ? 'Exit Focus Mode' : 'Enter Full Focus Mode'}
            className={`p-1.5 w-8 h-8 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${
              isFullFocus
                ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FontAwesomeIcon icon={isFullFocus ? faCompress : faExpand} />
          </button>

          {/* IDE Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="IDE Settings"
            className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center transition-all"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>

          {/* Terminal Toggle Button */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
              isTerminalOpen
                ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
            }`}
            title="Toggle Integrated Terminal"
          >
            <FontAwesomeIcon icon={faTerminal} className={isTerminalOpen ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Terminal</span>
          </button>

          {/* Save Draft Button */}
          <button
            onClick={handleManualSaveDraft}
            title="Save code draft locally so you can resume later"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-700"
          >
            <FontAwesomeIcon icon={faFloppyDisk} className="text-[11px] text-emerald-400" />
            <span>Save Draft</span>
          </button>

          {/* Live Draft Indicator */}
          {lastSavedTime && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
              <span className={`w-2 h-2 rounded-full ${draftStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span>{draftStatus === 'saving' ? 'Saving...' : `Draft saved (${lastSavedTime})`}</span>
            </div>
          )}

          {/* Run All Test Cases Button */}
          <button
            onClick={handleRunAllTests}
            disabled={isTesting || testCases.length === 0}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all disabled:opacity-50"
            title="Run all evaluation test cases against your solution"
          >
            <FontAwesomeIcon
              icon={isTesting ? faRotateRight : faFlask}
              className={`text-[10px] ${isTesting ? 'animate-spin' : ''}`}
            />
            <span>{isTesting ? 'Testing...' : `Run Tests (${testCases.length})`}</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>Run Code</span>
          </button>

          <button
            onClick={handleSubmitExam}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-[10px]" />
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Main Resizable / Focus Split Layout */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Problem Statement, Stdin Input, & Output Tabs */}
        {!isFullFocus && (
          <div
            style={{ width: `${leftWidthPercent}%` }}
            className={`border-r border-slate-800 flex flex-col bg-slate-900/50 shrink-0 ${
              isDragging ? 'transition-none select-none' : 'transition-all duration-150'
            }`}
          >
            {/* Tabs header */}
            <div className="flex border-b border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400">
              <button
                onClick={() => setActiveTab('problem')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'problem'
                    ? 'border-brand-500 text-white bg-slate-800/50'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faCode} />
                <span>Problem</span>
              </button>

              <button
                onClick={() => setActiveTab('testcases')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'testcases'
                    ? 'border-brand-500 text-white bg-slate-800/50 font-bold'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faFlask} className="text-brand-400" />
                <span>Test Cases</span>
                {testSummary && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold border ${
                    testSummary.passedCount === testSummary.totalCount
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/30 text-rose-300 border-rose-500/40'
                  }`}>
                    {testSummary.passedCount}/{testSummary.totalCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'console'
                    ? 'border-emerald-500 text-white bg-slate-800/50'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faLaptopCode} />
                <span>Console</span>
                {consoleLogs.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40">
                    {consoleLogs.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content Panel */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex flex-col select-text">
              {activeTab === 'testcases' ? (
                <div className="flex-1 -m-5 flex flex-col h-full overflow-hidden">
                  <TestCaseRunnerPanel
                    testCases={testCases}
                    summary={testSummary}
                    isRunning={isTesting}
                    onRunAll={handleRunAllTests}
                    onAddCustomTestCase={handleAddCustomTestCase}
                  />
                </div>
              ) : activeTab === 'problem' ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-white mb-1">Reverse Array in Place</h2>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="text-slate-400">Time Limit: <strong className="text-slate-200 font-mono">10.0s (Hard Limit)</strong></span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">Memory Limit: <strong className="text-slate-200 font-mono">256MB</strong></span>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none text-slate-300 text-xs space-y-3">
                    <p>
                      Given an array of integers <code className="bg-slate-800 px-1 py-0.5 rounded text-brand-400">arr</code> of size <code className="bg-slate-800 px-1 py-0.5 rounded text-brand-400">N</code>, write a program to reverse the elements of the array in place without using additional array allocations.
                    </p>

                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Input Format</h3>
                    <p>The first line contains an integer &quot;N&quot;. The second line contains &quot;N&quot; space-separated integers.</p>

                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Output Format</h3>
                    <p>Print the reversed array elements separated by spaces on a single line.</p>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <p className="font-bold text-slate-200 text-[11px]">Sample Input 1</p>
                      <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-tealAccent-400">5{"\n"}1 2 3 4 5</pre>
                      <p className="font-bold text-slate-200 text-[11px]">Sample Output 1</p>
                      <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-tealAccent-400">5 4 3 2 1</pre>
                    </div>
                  </div>
                </div>
              ) : (
                /* Interactive Integrated Console Tab */
                <div className="flex-1 flex flex-col space-y-4 font-mono text-xs">
                  {/* Console Action Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">Interactive Execution Console</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {consoleLogs.length > 0 && (
                        <button
                          onClick={() => setConsoleLogs([])}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors flex items-center space-x-1 border border-slate-700"
                          title="Clear Execution History"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px] text-rose-400" />
                          <span>Clear Logs</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRunConsoleCode(customInput)}
                        disabled={isExecuting}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-50 shadow"
                      >
                        <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                        <span>{isExecuting ? 'Executing...' : 'Run Code'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual Panel Layout: Top Stdin Input, Bottom Output Stream */}
                  <div className="flex-1 flex flex-col space-y-3">
                    {/* Stdin Box */}
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={faKeyboard} className="text-brand-400" />
                          <span>Standard Input (stdin)</span>
                        </label>
                        <div className="flex items-center space-x-2 text-[10px]">
                          <button
                            onClick={() => setCustomInput('5\n1 2 3 4 5')}
                            className="text-brand-400 hover:underline"
                          >
                            + Load Sample 1
                          </button>
                          <span className="text-slate-700">|</span>
                          <button
                            onClick={() => setCustomInput('')}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            Clear Input
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter standard input lines here..."
                        className="w-full h-20 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-tealAccent-300 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none"
                      />
                    </div>

                    {/* Console Live Terminal Output */}
                    <div className="flex-1 flex flex-col p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 min-h-[180px]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={faTerminal} className="text-emerald-400" />
                          <span>Process Terminal Output</span>
                        </span>
                        {executionOutput && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            executionOutput.exitCode === 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                          }`}>
                            Exit {executionOutput.exitCode} • {executionOutput.timeMs}ms
                          </span>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 p-1">
                        {isExecuting ? (
                          <div className="flex items-center space-x-2 text-brand-400 animate-pulse py-4">
                            <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Executing program binary...</span>
                          </div>
                        ) : executionOutput ? (
                          <div className="space-y-2">
                            {executionOutput.stdout && (
                              <div className="text-tealAccent-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded border border-slate-900">
                                {executionOutput.stdout}
                              </div>
                            )}
                            {executionOutput.stderr && (
                              <div className="text-rose-400 whitespace-pre-wrap bg-rose-950/40 p-2.5 rounded border border-rose-900/50">
                                {executionOutput.stderr}
                              </div>
                            )}
                            {executionOutput.compilationError && (
                              <div className="text-amber-400 whitespace-pre-wrap bg-amber-950/40 p-2.5 rounded border border-amber-900/50">
                                {executionOutput.compilationError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic py-8">
                            No active console output. Click &quot;Run Code&quot; to test execution.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Console Execution Log History */}
                    {consoleLogs.length > 0 && (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                            <FontAwesomeIcon icon={faRotateLeft} className="text-brand-400" />
                            <span>Execution History ({consoleLogs.length})</span>
                          </span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                          {consoleLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-2 bg-slate-900/80 rounded border border-slate-800/80 flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span className={log.result.exitCode === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                  [{log.result.exitCode === 0 ? 'PASS' : 'FAIL'}]
                                </span>
                                <span className="text-slate-300 font-semibold uppercase">{log.language}</span>
                                <span className="text-slate-500 truncate max-w-[120px]">
                                  in: &quot;{log.stdin.replace(/\n/g, ' ')}&quot;
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="text-slate-400">{log.result.timeMs}ms</span>
                                <span className="text-slate-600">{log.timestamp}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Draggable Resizer Bar */}
        {!isFullFocus && (
          <>
            <div
              onMouseDown={handleMouseDown}
              className={`w-1.5 hover:w-2 bg-slate-800 hover:bg-brand-500 cursor-col-resize z-30 transition-all flex items-center justify-center ${
                isDragging ? 'bg-brand-500 w-2' : ''
              }`}
            >
              <FontAwesomeIcon icon={faGripVertical} className="text-[8px] text-slate-600 hover:text-white" />
            </div>
            {isDragging && (
              <div
                className="fixed inset-0 z-50 cursor-col-resize select-none"
                onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
                onMouseUp={handleMouseUp}
              />
            )}
          </>
        )}

        {/* Right Side: File Explorer Sidebar + Multi-Tab Monaco Editor + Terminal */}
        <div className="flex-1 flex bg-slate-950 select-text relative overflow-hidden">
          {/* File Navigation Sidebar */}
          <FileExplorer
            files={workspaceFiles}
            activeFilePath={activeFilePath}
            language={language}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeletePath={handleDeletePath}
            onOpenJavaPackageModal={() => setIsJavaPackageModalOpen(true)}
          />

          {/* Editor + Terminal Workspace */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
            {/* Multi-Tab Bar & Language Control Overlay */}
            <div className="h-9 bg-[#111827] border-b border-slate-800 flex items-center justify-between shrink-0 select-none overflow-x-auto">
              {/* Active Tab Bar */}
              <div className="flex items-center h-full overflow-x-auto no-scrollbar">
                {openTabPaths.map((filePath) => {
                  const isActive = filePath === activeFilePath;
                  const fileName = filePath.split('/').pop() || filePath;
                  return (
                    <div
                      key={filePath}
                      onClick={() => handleSelectFile(filePath)}
                      className={`h-full px-3 flex items-center space-x-2 text-xs font-mono border-r border-slate-800 cursor-pointer transition-colors shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white border-t-2 border-t-brand-500 font-semibold'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={filePath.endsWith('.java') ? faCode : faFileCode}
                        className={isActive ? 'text-brand-400' : 'text-slate-500'}
                      />
                      <span>{fileName}</span>
                      <button
                        onClick={(e) => handleCloseTab(filePath, e)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    const ext = language === 'java' ? '.java' : language === 'python' ? '.py' : language === 'c' ? '.c' : '.cpp';
                    const fileName = window.prompt(`Enter new file name:`, `file_${workspaceFiles.length + 1}${ext}`);
                    if (fileName && fileName.trim()) {
                      handleCreateFile(fileName.trim());
                    }
                  }}
                  title="Create New File"
                  className="h-full px-2.5 text-slate-400 hover:text-white hover:bg-slate-900 flex items-center justify-center border-r border-slate-800 transition-colors"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>

              {/* Language Selector & Settings */}
              <div className="flex items-center space-x-3 px-3 shrink-0 bg-[#111827]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Language:</span>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value as 'cpp' | 'python' | 'java' | 'c')}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="cpp">C++ 20 (GCC)</option>
                    <option value="python">Python 3.10</option>
                    <option value="java">Java 17</option>
                    <option value="c">C 11</option>
                  </select>
                </div>
                {language === 'java' && (
                  <button
                    onClick={() => setIsJavaPackageModalOpen(true)}
                    className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                    title="NetBeans Java Package Helper"
                  >
                    <FontAwesomeIcon icon={faFolderPlus} className="text-[10px]" />
                    <span>Package Wizard</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Code Editor & Integrated Terminal Container */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Monaco Instance */}
              {activeFilePath ? (
                <div className="flex-1 min-h-0" onKeyDown={handleEditorKeyDown} onPaste={handleEditorPaste}>
                  <Editor
                    height="100%"
                    language={
                      activeFilePath.endsWith('.java')
                        ? 'java'
                        : activeFilePath.endsWith('.py')
                        ? 'python'
                        : activeFilePath.endsWith('.c') || activeFilePath.endsWith('.cpp') || activeFilePath.endsWith('.h')
                        ? 'cpp'
                        : language === 'cpp' || language === 'c'
                        ? 'cpp'
                        : language
                    }
                    theme={ideSettings.theme}
                    value={code}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    onChange={(value) => handleCodeChange(value || '')}
                    options={{
                      fontSize: ideSettings.fontSize,
                      fontFamily: `${ideSettings.fontFamily}, Fira Code, monospace`,
                      lineHeight: ideSettings.lineHeight,
                      tabSize: ideSettings.tabSize,
                      wordWrap: ideSettings.wordWrap,
                      cursorStyle: ideSettings.cursorStyle,
                      minimap: { enabled: ideSettings.minimap },
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 12 },
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2 select-none">
                  <FontAwesomeIcon icon={faCode} className="text-4xl text-slate-700" />
                  <p className="text-sm font-semibold">No File Selected</p>
                  <p className="text-xs text-slate-600">Select a file from the explorer to start editing</p>
                </div>
              )}

            {/* VS Code Interactive Terminal Drawer */}
            {isTerminalOpen && (
              <div
                style={{ height: `${terminalHeight}px` }}
                className="border-t border-slate-800 bg-[#0e131f] flex flex-col shrink-0 relative transition-[height] duration-75"
              >
                {/* Enhanced 100% Height Resizing Handle with indicator */}
                <div
                  onMouseDown={handleTerminalResizeStart}
                  onDoubleClick={toggleMaximizeTerminal}
                  className="h-2.5 w-full cursor-row-resize hover:bg-brand-500/50 active:bg-brand-500 transition-colors absolute -top-1 left-0 right-0 z-30 flex items-center justify-center group"
                  title="Drag to resize up to 100% or double-click to toggle maximize"
                >
                  <div className="w-12 h-1 rounded-full bg-slate-600 group-hover:bg-brand-400 group-active:bg-brand-400 transition-colors" />
                </div>

                {/* Terminal Header */}
                <div 
                  className="h-8 bg-[#131927] border-b border-slate-800/80 px-3 flex items-center justify-between text-xs shrink-0 select-none"
                  onDoubleClick={toggleMaximizeTerminal}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5 text-slate-200 font-semibold">
                      <FontAwesomeIcon icon={faTerminal} className="text-emerald-400 text-xs" />
                      <span>TERMINAL</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">bash (EduCode Sandbox)</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.educode?.pty) {
                          window.educode.pty.write('clear\n');
                        }
                      }}
                      title="Clear Terminal (Ctrl+L)"
                      className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      Clear
                    </button>
                    {/* Maximize to 100% / Restore Button */}
                    <button
                      onClick={toggleMaximizeTerminal}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title={isTerminalMaximized ? "Restore Terminal Height" : "Maximize Terminal to 100%"}
                    >
                      <FontAwesomeIcon icon={isTerminalMaximized ? faWindowRestore : faWindowMaximize} className="text-xs" />
                    </button>
                    <button
                      onClick={() => setIsTerminalOpen(false)}
                      title="Close Terminal"
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-xs" />
                    </button>
                  </div>
                </div>

                {/* Real Native System Terminal (PTY Xterm.js) */}
                <div className="flex-1 w-full overflow-hidden">
                  <XtermTerminal height={terminalHeight - 32} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full Focus Overlay Indicator Floating Button */}
        {isFullFocus && (
          <div className="absolute bottom-4 right-6 z-40 bg-slate-900/90 border border-brand-500/40 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Full Focus Mode Active</span>
            <button
              onClick={() => setIsFullFocus(false)}
              className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1"
            >
              <FontAwesomeIcon icon={faCompress} className="text-[10px]" />
              <span>Exit Focus</span>
            </button>
          </div>
        )}
      </div>
    </div>

      {/* NetBeans Java Package Wizard Modal */}
      <JavaPackageModal
        isOpen={isJavaPackageModalOpen}
        onClose={() => setIsJavaPackageModalOpen(false)}
        onCreate={handleCreateJavaPackage}
      />

      {/* IDE Settings Modal */}
      <IDESettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ideSettings}
        onSaveSettings={handleSaveSettings}
        onRegisterCustomTheme={handleRegisterCustomTheme}
      />

      {/* Proctoring Warning Overlay Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-rose-500/40 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-xl animate-bounce">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Academic Integrity Violation Warning</h2>
              <p className="text-xs text-slate-300 mt-1">
                Window focus loss detected! Leaving the exam application during an active session is logged in the institutional proctoring report.
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl text-left text-[11px] text-slate-400 font-mono space-y-1">
              <p className="text-rose-400 font-bold">Recorded Violation Event:</p>
              <p>- Reason: {lastWarningReason}</p>
              <p>- Total Focus Loss Events: {focusWarnings}</p>
              <p>- Automatic Screenshot Captured & Logged</p>
            </div>

            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              Acknowledge & Return to Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
