'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
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
  faChevronLeft,
  faChevronRight,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import IDESettingsModal, { DEFAULT_SETTINGS, IDESettings } from '@/components/IDESettingsModal';
import FileExplorer, { WorkspaceFile } from '@/components/FileExplorer';
import JavaPackageModal from '@/components/JavaPackageModal';
import { PRESET_THEMES } from '@/components/themes';
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

// Store task specific states
interface TaskWorkspaceState {
  workspaceFiles: WorkspaceFile[];
  openTabPaths: string[];
  activeFilePath: string;
  customInput: string;
  consoleLogs: ConsoleLogEntry[];
  executionOutput: ExecutionResult | null;
  code: string;
  language: 'cpp' | 'python' | 'java' | 'c';
}

export default function StudentSolvePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State mapped by task ID
  const [workspaces, setWorkspaces] = useState<Record<string, TaskWorkspaceState>>({});

  const [activeTab, setActiveTab] = useState<'problem' | 'files' | 'console'>('problem');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [isJavaPackageModalOpen, setIsJavaPackageModalOpen] = useState<boolean>(false);

  // VS Code Integrated Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);
  const [terminalHeight, setTerminalHeight] = useState<number>(240);
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

  const getDefaultFilesForLanguage = useCallback((lang: 'cpp' | 'python' | 'java' | 'c', templateCode?: string): WorkspaceFile[] => {
    if (lang === 'java') {
      return [
        {
          id: '1',
          path: 'Solution.java',
          content: templateCode || `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`,
        },
      ];
    }
    if (lang === 'python') {
      return [
        {
          id: '1',
          path: 'solution.py',
          content: templateCode || `import sys\n\ndef solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n`,
        },
      ];
    }
    if (lang === 'c') {
      return [
        {
          id: '1',
          path: 'solution.c',
          content: templateCode || `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
        },
      ];
    }
    return [
      {
        id: '1',
        path: 'solution.cpp',
        content: templateCode || `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
      },
    ];
  }, []);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch assessment');
      const data = await res.json();
      
      if (data.status !== 'RUNNING') {
        throw new Error('This exam is not currently running.');
      }
      
      setAssessment(data);

      // Initialize workspace states
      const initialWorkspaces: Record<string, TaskWorkspaceState> = {};
      data.tasks?.forEach((t: any) => {
        const lang = t.allowedLanguage?.toLowerCase() || 'cpp';
        const files = getDefaultFilesForLanguage(lang as any, t.templateCode);
        initialWorkspaces[t.id] = {
          workspaceFiles: files,
          openTabPaths: [files[0].path],
          activeFilePath: files[0].path,
          customInput: '5\n1 2 3 4 5',
          consoleLogs: [],
          executionOutput: null,
          code: files[0].content,
          language: lang as any
        };
      });
      setWorkspaces(initialWorkspaces);

      // Calculate time left
      if (data.startTime && data.durationMin) {
        const start = new Date(data.startTime).getTime();
        const end = start + (data.durationMin * 60 * 1000);
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token && id) {
      fetchAssessment();
    }
  }, [user, id]);

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

  const handleSaveSettings = (newSettings: IDESettings) => {
    setIdeSettings(newSettings);
    try {
      localStorage.setItem('educode_ide_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save IDE settings:', e);
    }
  };

  const handleRegisterCustomTheme = useCallback(
    (themeId: string, _themeName: string, themeData: editor.IStandaloneThemeData) => {
      if (monacoRef.current) {
        monacoRef.current.editor.defineTheme(themeId, themeData);
        monacoRef.current.editor.setTheme(themeId);
      }
    },
    []
  );

  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    PRESET_THEMES.forEach((t) => {
      monaco.editor.defineTheme(t.id, t.data);
    });
    if (ideSettings.customThemes) {
      Object.entries(ideSettings.customThemes).forEach(([id, t]) => {
        monaco.editor.defineTheme(id, t.data);
      });
    }
  };

  // Focus & integrity monitoring state
  const [focusWarnings, setFocusWarnings] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
  const [lastWarningReason, setLastWarningReason] = useState<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const internalCopiedTextRef = useRef<string>('');

  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 0) {
      handleSubmitExam(); // Auto-submit when time is up
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitExam = async () => {
    if (!user?.token) return;
    if (timeLeft !== null && timeLeft > 0) {
      if (!confirm('Are you sure you want to submit your exam? You cannot undo this.')) {
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      // Logic to submit solutions would go here
      // e.g. extract code from workspaces and submit
      
      alert('Exam submitted successfully!');
      router.push('/student/assessments');
    } catch (err) {
      console.error(err);
      alert('Failed to submit exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTask = assessment?.tasks?.[currentTaskIndex];
  const isLastTask = assessment?.tasks ? currentTaskIndex === assessment.tasks.length - 1 : false;
  const currentWorkspace = currentTask ? workspaces[currentTask.id] : undefined;

  const updateCurrentWorkspace = (updates: Partial<TaskWorkspaceState>) => {
    if (!currentTask) return;
    setWorkspaces(prev => ({
      ...prev,
      [currentTask.id]: {
        ...prev[currentTask.id],
        ...updates
      }
    }));
  };

  const handleLanguageChange = (lang: 'cpp' | 'python' | 'java' | 'c') => {
    const initialFiles = getDefaultFilesForLanguage(lang);
    const mainFile = initialFiles[0];
    updateCurrentWorkspace({
      language: lang,
      workspaceFiles: initialFiles,
      openTabPaths: [mainFile.path],
      activeFilePath: mainFile.path,
      code: mainFile.content
    });
  };

  const handleCodeChange = (newCode: string) => {
    updateCurrentWorkspace({
      code: newCode,
      workspaceFiles: currentWorkspace.workspaceFiles.map((f) => 
        f.path === currentWorkspace.activeFilePath ? { ...f, content: newCode } : f
      )
    });
  };

  const handleSelectFile = (filePath: string) => {
    const file = currentWorkspace.workspaceFiles.find((f) => f.path === filePath);
    if (!file || file.isFolder) return;

    const newOpenTabs = !currentWorkspace.openTabPaths.includes(filePath) 
      ? [...currentWorkspace.openTabPaths, filePath] 
      : currentWorkspace.openTabPaths;
      
    updateCurrentWorkspace({
      openTabPaths: newOpenTabs,
      activeFilePath: filePath,
      code: file.content
    });
  };

  const handleCloseTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTabs = currentWorkspace.openTabPaths.filter((p) => p !== filePath);
    
    let nextActivePath = currentWorkspace.activeFilePath;
    let nextCode = currentWorkspace.code;

    if (currentWorkspace.activeFilePath === filePath) {
      if (updatedTabs.length > 0) {
        nextActivePath = updatedTabs[updatedTabs.length - 1];
        const nextFile = currentWorkspace.workspaceFiles.find((f) => f.path === nextActivePath);
        if (nextFile) nextCode = nextFile.content;
      } else {
        nextActivePath = '';
        nextCode = '';
      }
    }
    
    updateCurrentWorkspace({
      openTabPaths: updatedTabs,
      activeFilePath: nextActivePath,
      code: nextCode
    });
  };

  const handleCreateFile = (pathName: string, content = '') => {
    if (currentWorkspace.workspaceFiles.some((f) => f.path === pathName)) return;
    const newFile: WorkspaceFile = {
      id: Math.random().toString(36).substring(2, 9),
      path: pathName,
      content,
    };
    
    const newOpenTabs = !currentWorkspace.openTabPaths.includes(pathName) 
      ? [...currentWorkspace.openTabPaths, pathName] 
      : currentWorkspace.openTabPaths;

    updateCurrentWorkspace({
      workspaceFiles: [...currentWorkspace.workspaceFiles, newFile],
      openTabPaths: newOpenTabs,
      activeFilePath: pathName,
      code: content
    });
  };

  const handleCreateFolder = (folderPath: string) => {
    if (currentWorkspace.workspaceFiles.some((f) => f.path === folderPath)) return;
    const newFolder: WorkspaceFile = {
      id: Math.random().toString(36).substring(2, 9),
      path: folderPath,
      content: '',
      isFolder: true,
    };
    updateCurrentWorkspace({
      workspaceFiles: [...currentWorkspace.workspaceFiles, newFolder]
    });
  };

  const handleDeletePath = (targetPath: string) => {
    const updatedFiles = currentWorkspace.workspaceFiles.filter((f) => f.path !== targetPath && !f.path.startsWith(targetPath + '/'));
    const updatedTabs = currentWorkspace.openTabPaths.filter((p) => p !== targetPath && !p.startsWith(targetPath + '/'));
    
    let nextActivePath = currentWorkspace.activeFilePath;
    let nextCode = currentWorkspace.code;

    if (currentWorkspace.activeFilePath === targetPath || currentWorkspace.activeFilePath.startsWith(targetPath + '/')) {
      nextActivePath = '';
      nextCode = '';
    }

    updateCurrentWorkspace({
      workspaceFiles: updatedFiles,
      openTabPaths: updatedTabs,
      activeFilePath: nextActivePath,
      code: nextCode
    });
  };

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

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).educode?.integrity && currentTask) {
      (window as any).educode.integrity.startMonitoring(`submission-${currentTask.id}-${Date.now()}`);
      setIsMonitoringActive(true);

      const cleanup = (window as any).educode.integrity.onFocusLost((data: any) => {
        setFocusWarnings(data.warnings);
        setLastWarningReason(data.details || 'Window focus loss');
        setShowWarningModal(true);
      });

      return () => {
        cleanup();
        if ((window as any).educode?.integrity) {
          (window as any).educode.integrity.stopMonitoring();
        }
      };
    }
  }, [currentTask?.id]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (lastKeyTimeRef.current > 0) {
      const diff = now - lastKeyTimeRef.current;
      if (diff < 15) {
        (window as any).educode?.integrity?.logEvent({
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

    (window as any).educode?.integrity?.logEvent({
      eventType: isInternal ? 'PASTE_INTERNAL' : 'PASTE_EXTERNAL',
      details: isInternal
        ? `Pasted ${pastedContent.length} chars copied from within IDE`
        : `Pasted ${pastedContent.length} chars copied from external clipboard`,
      severity: isInternal ? 'LOW' : 'HIGH',
    });
  };

  const handleTerminalResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTerminalResizing(true);
  };

  useEffect(() => {
    if (!isTerminalResizing) return;

    let animationFrameId: number;

    const handleMouseMoveTerminal = (e: MouseEvent) => {
      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = containerRect.bottom - e.clientY;
        setTerminalHeight(Math.max(100, Math.min(550, newHeight)));
      });
    };

    const handleMouseUpTerminal = () => {
      setIsTerminalResizing(false);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    window.addEventListener('mousemove', handleMouseMoveTerminal);
    window.addEventListener('mouseup', handleMouseUpTerminal);

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveTerminal);
      window.removeEventListener('mouseup', handleMouseUpTerminal);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isTerminalResizing]);

  const handleRunCode = async () => {
    setIsExecuting(true);
    setIsTerminalOpen(true);

    try {
      if (typeof window !== 'undefined' && (window as any).educode?.pty) {
        await (window as any).educode.pty.runCode({
          code: currentWorkspace.code,
          language: currentWorkspace.language,
          files: currentWorkspace.workspaceFiles,
          activeFilePath: currentWorkspace.activeFilePath,
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
    const activeInput = typeof stdinText === 'string' ? stdinText : currentWorkspace.customInput;

    try {
      let res: ExecutionResult;
      if (typeof window !== 'undefined' && (window as any).educode?.executor) {
        res = await (window as any).educode.executor.runCode({
          language: currentWorkspace.language,
          code: currentWorkspace.code,
          stdin: activeInput,
          timeoutMs: 0,
          files: currentWorkspace.workspaceFiles,
          activeFilePath: currentWorkspace.activeFilePath,
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

      updateCurrentWorkspace({
        executionOutput: res,
        consoleLogs: [
          {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            language: currentWorkspace.language,
            stdin: activeInput,
            result: res,
          },
          ...currentWorkspace.consoleLogs,
        ]
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Console execution failed';
      const errRes: ExecutionResult = {
        stdout: '',
        stderr: errorMsg,
        exitCode: 1,
        timeMs: 0,
      };
      updateCurrentWorkspace({ executionOutput: errRes });
    } finally {
      setIsExecuting(false);
    }
  };
  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Exam...</div>;
  if (error) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500">{error}</div>;
  if (!assessment?.tasks || assessment.tasks.length === 0) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">No tasks found for this exam.</div>;
  if (!currentWorkspace || !currentTask) return null; // Wait until workspace initializes

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="font-bold text-white text-sm truncate max-w-md">
            {assessment.title}
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
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

          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center space-x-1.5 ${
             timeLeft !== null && timeLeft < 300 
               ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' 
               : 'bg-slate-800 border-slate-700 text-tealAccent-400'
          }`}>
            <FontAwesomeIcon icon={faClock} />
            <span>{timeLeft !== null ? formatTime(timeLeft) : 'Unlimited'}</span>
          </div>

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

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="IDE Settings"
            className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center transition-all"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>

          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
              isTerminalOpen
                ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <FontAwesomeIcon icon={faTerminal} className={isTerminalOpen ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Terminal</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>Run Code</span>
          </button>

          <button
            onClick={handleSubmitExam}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
            <span>Submit Exam</span>
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {!isFullFocus && (
          <div
            style={{ width: `${leftWidthPercent}%` }}
            className={`border-r border-slate-800 flex flex-col bg-slate-900 shrink-0 ${
              isDragging ? 'transition-none select-none' : 'transition-all duration-150'
            }`}
          >
            <div className="p-3 border-b border-slate-800 flex justify-between items-center text-slate-300 bg-slate-900/80">
              <button 
                onClick={() => setCurrentTaskIndex(prev => Math.max(0, prev - 1))}
                disabled={currentTaskIndex === 0}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider">
                Problem {currentTaskIndex + 1} of {assessment.tasks.length}
              </span>
              <button 
                onClick={() => setCurrentTaskIndex(prev => Math.min(assessment.tasks.length - 1, prev + 1))}
                disabled={isLastTask}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>

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
                onClick={() => setActiveTab('console')}
                className={`px-3.5 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'console'
                    ? 'border-emerald-500 text-white bg-slate-800/50'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faLaptopCode} />
                <span>Console</span>
                {currentWorkspace.consoleLogs.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40">
                    {currentWorkspace.consoleLogs.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex flex-col select-text">
              {activeTab === 'problem' ? (
                <div className="space-y-4 prose prose-invert max-w-none">
                  <h2 className="text-lg font-bold text-white m-0">{currentTask.title}</h2>
                  <div className="flex space-x-2 text-[11px]">
                    <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 capitalize font-medium">
                      {currentTask.difficulty || 'Medium'}
                    </span>
                    <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 font-medium">
                      {currentTask.points || 100} Points
                    </span>
                  </div>

                  <div className="text-slate-300 whitespace-pre-wrap mt-4 text-sm leading-relaxed">
                    {currentTask.description}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">Execution Console</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentWorkspace.consoleLogs.length > 0 && (
                        <button
                          onClick={() => updateCurrentWorkspace({ consoleLogs: [] })}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center space-x-1"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-[10px] text-rose-400" />
                          <span>Clear Logs</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRunConsoleCode(currentWorkspace.customInput)}
                        disabled={isExecuting}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] flex items-center space-x-1 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                        <span>Run Code</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col space-y-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={faKeyboard} className="text-blue-400" />
                          <span>Standard Input</span>
                        </label>
                      </div>
                      <textarea
                        value={currentWorkspace.customInput}
                        onChange={(e) => updateCurrentWorkspace({ customInput: e.target.value })}
                        placeholder="Enter input here..."
                        className="w-full h-20 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-tealAccent-300 font-mono text-xs focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex-1 flex flex-col p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 min-h-[180px]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={faTerminal} className="text-emerald-400" />
                          <span>Output</span>
                        </span>
                        {currentWorkspace.executionOutput && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            currentWorkspace.executionOutput.exitCode === 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                          }`}>
                            Exit {currentWorkspace.executionOutput.exitCode} • {currentWorkspace.executionOutput.timeMs}ms
                          </span>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 p-1">
                        {isExecuting ? (
                          <div className="flex items-center space-x-2 text-blue-400 animate-pulse py-4">
                            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Executing...</span>
                          </div>
                        ) : currentWorkspace.executionOutput ? (
                          <div className="space-y-2">
                            {currentWorkspace.executionOutput.stdout && (
                              <div className="text-tealAccent-300 whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded border border-slate-900">
                                {currentWorkspace.executionOutput.stdout}
                              </div>
                            )}
                            {currentWorkspace.executionOutput.stderr && (
                              <div className="text-rose-400 whitespace-pre-wrap bg-rose-950/40 p-2.5 rounded border border-rose-900/50">
                                {currentWorkspace.executionOutput.stderr}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic py-8">
                            No active output.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!isFullFocus && (
          <>
            <div
              onMouseDown={handleMouseDown}
              className={`w-1.5 hover:w-2 bg-slate-800 hover:bg-blue-500 cursor-col-resize z-30 transition-all flex items-center justify-center ${
                isDragging ? 'bg-blue-500 w-2' : ''
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

        <div className="flex-1 flex bg-slate-950 select-text relative overflow-hidden">
          <FileExplorer
            files={currentWorkspace.workspaceFiles}
            activeFilePath={currentWorkspace.activeFilePath}
            language={currentWorkspace.language}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeletePath={handleDeletePath}
            onOpenJavaPackageModal={() => setIsJavaPackageModalOpen(true)}
          />

          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
            <div className="h-9 bg-[#111827] border-b border-slate-800 flex items-center justify-between shrink-0 select-none overflow-x-auto">
              <div className="flex items-center h-full overflow-x-auto no-scrollbar">
                {currentWorkspace.openTabPaths.map((filePath) => {
                  const isActive = filePath === currentWorkspace.activeFilePath;
                  const fileName = filePath.split('/').pop() || filePath;
                  return (
                    <div
                      key={filePath}
                      onClick={() => handleSelectFile(filePath)}
                      className={`h-full px-3 flex items-center space-x-2 text-xs font-mono border-r border-slate-800 cursor-pointer transition-colors shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white border-t-2 border-t-blue-500 font-semibold'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={filePath.endsWith('.java') ? faCode : faFileCode}
                        className={isActive ? 'text-blue-400' : 'text-slate-500'}
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
              </div>

              <div className="flex items-center space-x-3 px-3 shrink-0 bg-[#111827]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Lang:</span>
                  <select
                    value={currentWorkspace.language}
                    onChange={(e) => handleLanguageChange(e.target.value as 'cpp' | 'python' | 'java' | 'c')}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {(!currentTask.allowedLanguage || currentTask.allowedLanguage === 'Any' || currentTask.allowedLanguage.toLowerCase() === 'cpp' || currentTask.allowedLanguage.toLowerCase() === 'c++') && <option value="cpp">C++</option>}
                    {(!currentTask.allowedLanguage || currentTask.allowedLanguage === 'Any' || currentTask.allowedLanguage.toLowerCase() === 'python') && <option value="python">Python</option>}
                    {(!currentTask.allowedLanguage || currentTask.allowedLanguage === 'Any' || currentTask.allowedLanguage.toLowerCase() === 'java') && <option value="java">Java</option>}
                    {(!currentTask.allowedLanguage || currentTask.allowedLanguage === 'Any' || currentTask.allowedLanguage.toLowerCase() === 'c') && <option value="c">C</option>}
                  </select>
                </div>
                {currentWorkspace.language === 'java' && (
                  <button
                    onClick={() => setIsJavaPackageModalOpen(true)}
                    className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-[11px] flex items-center space-x-1 transition-colors"
                  >
                    <FontAwesomeIcon icon={faFolderPlus} className="text-[10px]" />
                    <span>Package Wizard</span>
                  </button>
                )}
              </div>
            </div>

            {currentWorkspace.activeFilePath ? (
              <div className="flex-1 min-h-0" onKeyDown={handleEditorKeyDown} onPaste={handleEditorPaste}>
                <Editor
                  height="100%"
                  language={
                    currentWorkspace.activeFilePath.endsWith('.java')
                      ? 'java'
                      : currentWorkspace.activeFilePath.endsWith('.py')
                      ? 'python'
                      : currentWorkspace.activeFilePath.endsWith('.c') || currentWorkspace.activeFilePath.endsWith('.cpp')
                      ? 'cpp'
                      : currentWorkspace.language === 'c' || currentWorkspace.language === 'cpp'
                      ? 'cpp'
                      : currentWorkspace.language
                  }
                  theme={ideSettings.theme}
                  value={currentWorkspace.code}
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorDidMount}
                  onChange={(value) => handleCodeChange(value || '')}
                  options={{
                    fontSize: ideSettings.fontSize,
                    fontFamily: `${ideSettings.fontFamily}, monospace`,
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
                <p className="text-xs text-slate-600">Select a file from the explorer</p>
              </div>
            )}

            {isTerminalOpen && (
              <div
                style={{ height: `${terminalHeight}px` }}
                className="border-t border-slate-800 bg-[#0e131f] flex flex-col shrink-0 relative transition-all duration-75"
              >
                <div
                  onMouseDown={handleTerminalResizeStart}
                  className="h-1.5 w-full cursor-row-resize bg-slate-800/80 hover:bg-emerald-500/60 transition-colors absolute -top-1 left-0 right-0 z-30"
                />

                <div className="h-8 bg-[#131927] border-b border-slate-800/80 px-3 flex items-center justify-between text-xs shrink-0 select-none">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5 text-slate-200 font-semibold">
                      <FontAwesomeIcon icon={faTerminal} className="text-emerald-400 text-xs" />
                      <span>TERMINAL</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).educode?.pty) {
                          (window as any).educode.pty.write('clear\n');
                        }
                      }}
                      className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setIsTerminalOpen(false)}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-xs" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full overflow-hidden">
                  <XtermTerminal height={terminalHeight - 32} />
                </div>
              </div>
            )}
          </div>
        </div>

        {isFullFocus && (
          <div className="absolute bottom-4 right-6 z-40 bg-slate-900/90 border border-blue-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-2xl flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Full Focus Mode Active</span>
            <button
              onClick={() => setIsFullFocus(false)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] rounded-lg transition-colors flex items-center space-x-1"
            >
              <FontAwesomeIcon icon={faCompress} className="text-[10px]" />
              <span>Exit Focus</span>
            </button>
          </div>
        )}
      </div>

      <JavaPackageModal
        isOpen={isJavaPackageModalOpen}
        onClose={() => setIsJavaPackageModalOpen(false)}
        onCreate={handleCreateJavaPackage}
      />

      <IDESettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ideSettings}
        onSaveSettings={handleSaveSettings}
        onRegisterCustomTheme={handleRegisterCustomTheme}
      />

      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 p-6 rounded-2xl border border-rose-500/40 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-xl animate-bounce">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Academic Integrity Warning</h2>
              <p className="text-xs text-slate-300 mt-1">
                Window focus loss detected!
              </p>
            </div>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
