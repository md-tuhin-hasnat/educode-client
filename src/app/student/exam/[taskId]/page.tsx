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
  faCheckCircle,
  faSpinner,
  faBookOpen,
  faArrowLeft,
  faCircleCheck,
  faLock,
  faUnlock,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import api from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
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
import { DEFAULT_CHECKER_CONFIG } from '@/utils/testCaseChecker';
import TestCaseRunnerPanel from '@/components/TestCaseRunnerPanel';
import { LiveTestLogsView } from '@/components/test-runner/LiveTestLogsView';
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
  const { user } = useAuthStore();
  const [taskData, setTaskData] = useState<any>(null);
  const [isLoadingTask, setIsLoadingTask] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: string;
    points?: number;
    maxPoints?: number;
    message?: string;
  } | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<{
    id: string;
    status: string;
    allowResubmit: boolean;
    attemptCount: number;
    submittedAt?: string;
  } | null>(null);

  const [language, setLanguage] = useState<'cpp' | 'python' | 'java' | 'c'>('cpp');
  const [code, setCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('5\n1 2 3 4 5');
  const [activeTab, setActiveTab] = useState<'problem' | 'testcases'>('problem');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<ExecutionResult | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);

  // Test Case Evaluation States
  const [testCases, setTestCases] = useState<TestCaseInput[]>([]);
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

  // VS Code Developer Bottom Dock State (Terminal, Console, Test Logs)
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);
  const [bottomDockTab, setBottomDockTab] = useState<'terminal' | 'console' | 'logs'>('terminal');
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

  // Exam Countdown Timer (null when untimed / single task)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const endTimeMsRef = useRef<number | null>(null);

  // Default Files Boilerplate Generator
  const getDefaultFilesForLanguage = useCallback((lang: string, templateCode?: string): WorkspaceFile[] => {
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

  // Fetch real task from backend on mount
  useEffect(() => {
    async function loadTaskAndWorkspace() {
      try {
        setIsLoadingTask(true);
        const res = await api.get(`/tasks/${params.taskId}`);
        const data = res.data;
        if (data) {
          setTaskData(data);
          let chosenLang = language;
          if (data.language && ['cpp', 'python', 'java', 'c'].includes(data.language.toLowerCase())) {
            chosenLang = data.language.toLowerCase() as any;
            setLanguage(chosenLang);
          }
          if (Array.isArray(data.testCases) && data.testCases.length > 0) {
            setTestCases(
              data.testCases.map((tc: any, idx: number) => ({
                id: tc.id || String(idx + 1),
                order: tc.order || idx + 1,
                inputData: tc.inputData || '',
                expectedOutput: tc.expectedOutput || '',
                points: tc.points || 25,
                isHidden: tc.isHidden ?? false,
                testType: tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE'),
              }))
            );
            const sample = data.testCases.find((tc: any) => !tc.isHidden && tc.inputData);
            if (sample) setCustomInput(sample.inputData);
          }
          if (data.isExam && (data.examDurationMin || data.assessment?.durationMin)) {
            const durMin = Number(data.assessment?.durationMin || data.examDurationMin || 60);
            const sessionStartTime = data.assessment?.startTime || data.startTime;

            if (sessionStartTime) {
              const startTimeMs = new Date(sessionStartTime).getTime();
              const calculatedEndTime = startTimeMs + durMin * 60 * 1000;
              endTimeMsRef.current = calculatedEndTime;
              const remainingSec = Math.max(0, Math.floor((calculatedEndTime - Date.now()) / 1000));
              setTimeLeftSeconds(remainingSec);
            } else {
              endTimeMsRef.current = Date.now() + durMin * 60 * 1000;
              setTimeLeftSeconds(durMin * 60);
            }
          } else {
            endTimeMsRef.current = null;
            setTimeLeftSeconds(null);
          }

          // Workspace init with draft or task template
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
            const initialFiles = getDefaultFilesForLanguage(chosenLang, data.templateCode);
            setWorkspaceFiles(initialFiles);
            const mainFile = initialFiles[0];
            setOpenTabPaths([mainFile.path]);
            setActiveFilePath(mainFile.path);
            setCode(mainFile.content);
            setDraftStatus('idle');
            setLastSavedTime(null);
          }
        }

        // Fetch existing submission status for current student
        try {
          const subRes = await api.get(`/submissions/my-submissions?taskId=${params.taskId}`);
          if (Array.isArray(subRes.data) && subRes.data.length > 0) {
            const sub = subRes.data[0];
            setExistingSubmission({
              id: sub.id,
              status: sub.status,
              allowResubmit: !!sub.allowResubmit,
              attemptCount: sub.attemptCount || 1,
              submittedAt: sub.submittedAt,
            });
          }
        } catch {
          // ignore offline / not submitted
        }
      } catch (err) {
        console.error('Failed to load task details:', err);
        // Fallback workspace if offline/mock
        const savedDraft = loadCodeDraft(params.taskId);
        if (savedDraft && Array.isArray(savedDraft.files) && savedDraft.files.length > 0) {
          setWorkspaceFiles(savedDraft.files);
          setOpenTabPaths(savedDraft.openTabPaths || [savedDraft.files[0].path]);
          setActiveFilePath(savedDraft.activeFilePath || savedDraft.files[0].path);
          setCode(savedDraft.code || savedDraft.files[0].content);
        } else {
          const fallback = getDefaultFilesForLanguage(language);
          setWorkspaceFiles(fallback);
          setOpenTabPaths([fallback[0].path]);
          setActiveFilePath(fallback[0].path);
          setCode(fallback[0].content);
        }
      } finally {
        setIsLoadingTask(false);
      }
    }

    if (params.taskId) {
      loadTaskAndWorkspace();
    }
  }, [params.taskId, getDefaultFilesForLanguage]);

  // When language is manually changed
  const handleLanguageChange = (newLang: 'cpp' | 'python' | 'java' | 'c') => {
    setLanguage(newLang);
    const newFiles = getDefaultFilesForLanguage(newLang, taskData?.templateCode);
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

  // Initialize integrity proctoring engine session (only when taskData.isExam is true)
  useEffect(() => {
    if (taskData && taskData.isExam && typeof window !== 'undefined' && window.educode?.integrity) {
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
    } else {
      setIsMonitoringActive(false);
    }
  }, [taskData, params.taskId]);

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

  const hasAutoSubmittedRef = useRef<boolean>(false);

  // Timer Countdown (only runs when timeLeftSeconds is not null)
  useEffect(() => {
    if (timeLeftSeconds === null) return;

    if (timeLeftSeconds <= 0) {
      if (!hasAutoSubmittedRef.current) {
        hasAutoSubmittedRef.current = true;
        handleSubmitExam(true);
      }
      return;
    }

    const interval = setInterval(() => {
      if (endTimeMsRef.current !== null) {
        const remaining = Math.max(0, Math.floor((endTimeMsRef.current - Date.now()) / 1000));
        setTimeLeftSeconds(remaining);
      } else {
        setTimeLeftSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds !== null, timeLeftSeconds === 0]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isConcluded =
    taskData?.assessment?.status === 'FINISHED' ||
    (timeLeftSeconds !== null && timeLeftSeconds <= 0);



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
    setBottomDockTab('console');

    try {
      if (typeof window !== 'undefined' && window.educode?.pty) {
        await window.educode.pty.runCode({
          code,
          language,
          files: workspaceFiles,
          activeFilePath,
        });
      } else {
        await handleRunConsoleCode(customInput);
      }
    } catch (err) {
      console.error('PTY Code Runner error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunConsoleCode = async (stdinText?: string) => {
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setBottomDockTab('console');
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

  // Run Automated Evaluation Test Cases with category filtering
  const handleRunCategory = async (category: 'ALL' | 'SAMPLE' | 'PRETEST' = 'ALL') => {
    if (isTesting || testCases.length === 0) return;
    setIsTesting(true);
    setActiveTab('testcases');
    setIsTerminalOpen(true);
    setBottomDockTab('logs');
    setIsFullFocus(false);

    try {
      const checkerConfig = DEFAULT_CHECKER_CONFIG;

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
        },
        1000,
        checkerConfig,
        category
      );
      setTestSummary(summary);
    } catch (err) {
      console.error('Test runner execution error:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunAllTests = () => handleRunCategory('ALL');

  const handleAddCustomTestCase = (tc: TestCaseInput) => {
    setTestCases((prev) => [...prev, tc]);
  };

  const handleSubmitExam = async (isForced = false) => {
    const isLocked =
      existingSubmission?.status === 'submitted' &&
      !existingSubmission?.allowResubmit;

    if (isLocked && !isForced) {
      alert(
        'You have already submitted this task. Only one submission is permitted unless your instructor grants re-submission access.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/submissions', {
        taskId: params.taskId,
        sourceCode: code,
        language: language.toUpperCase(),
      });

      setExistingSubmission({
        id: res.data?.id || 'sub-1',
        status: 'submitted',
        allowResubmit: false,
        attemptCount: (existingSubmission?.attemptCount || 0) + 1,
        submittedAt: new Date().toISOString(),
      });

      if (window.educode?.offline) {
        await window.educode.offline.saveSubmission({
          taskId: params.taskId,
          studentId: user?.id || 'current-student-id',
          code,
          codeSnapshot: code,
          language,
          timestamp: Date.now(),
        });
      }

      setSubmissionFeedback({
        status: res.data?.status || 'SUBMITTED',
        points: res.data?.pointsEarned ?? res.data?.score,
        maxPoints: taskData?.maxPoints || 100,
        message: 'Solution successfully evaluated and submitted to classroom records.',
      });
    } catch (err: any) {
      console.error('Submission error:', err);
      const errMsg = err.response?.data?.message || 'Submission completed and cached for offline synchronization.';
      if (window.educode?.offline) {
        await window.educode.offline.saveSubmission({
          taskId: params.taskId,
          studentId: user?.id || 'current-student-id',
          code,
          codeSnapshot: code,
          language,
          timestamp: Date.now(),
        });
      }
      setSubmissionFeedback({
        status: 'OFFLINE_SAVED',
        maxPoints: taskData?.maxPoints || 100,
        message: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 bg-[#0f172a] text-slate-100 select-none overflow-hidden font-sans min-h-0">
      {/* Top Space-Optimized Exam Navigation Bar */}
      <div className="h-12 bg-[#0b0f19] border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 z-20 gap-3">
        {/* Left: Exit/Classroom Link + Task Info */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-shrink">
          <Link
            href={`/student/classrooms/${taskData?.courseId || ''}`}
            title="Return to Classroom"
            className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>

          <div className="flex items-center space-x-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0"></span>
            <span
              className="font-bold text-white tracking-tight text-xs truncate max-w-[150px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-[380px]"
              title={taskData?.title || `Task #${params.taskId}`}
            >
              {taskData?.title || `Task #${params.taskId}`}
            </span>
          </div>

          {taskData?.course?.subjectCode && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-teal-400 border border-slate-700/60 truncate max-w-[90px] hidden md:inline-block shrink-0">
              {taskData.course.subjectCode}
            </span>
          )}

          {taskData?.taskType && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-brand-500/15 text-brand-400 border border-brand-500/30 uppercase tracking-wider shrink-0 hidden sm:inline-block">
              {taskData.taskType}
            </span>
          )}
        </div>

        {/* Center / Status Indicators */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Only show Proctoring indicator when task is proctored */}
          {taskData?.isExam && (
            <div className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center space-x-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-400 transition-all">
              <FontAwesomeIcon
                icon={faShieldHalved}
                className={`text-[10px] ${isMonitoringActive ? 'animate-pulse' : ''}`}
              />
              <span className="hidden xl:inline">Proctored Session</span>
            </div>
          )}

          {focusWarnings > 0 && taskData?.isExam && (
            <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center space-x-1 animate-pulse">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-[10px]" />
              <span>{focusWarnings}</span>
            </div>
          )}

          {/* Only show timer if timeLeftSeconds is set */}
          {timeLeftSeconds !== null && (
            <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700/80 text-tealAccent-400 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-inner">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              <span>{formatTime(timeLeftSeconds)}</span>
            </div>
          )}

          {/* Draft Saved Indicator */}
          {lastSavedTime && (
            <div
              className="hidden 2xl:flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400"
              title={`Draft auto-saved at ${lastSavedTime}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${draftStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span>{draftStatus === 'saving' ? 'Saving' : 'Saved'}</span>
            </div>
          )}
        </div>

        {/* Right: Tools & Action Buttons */}
        <div className="flex items-center space-x-1.5 shrink-0 text-xs">
          {/* Save Draft Icon Button */}
          <button
            onClick={handleManualSaveDraft}
            title="Save code draft locally (Ctrl+S)"
            className="w-7 h-7 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center justify-center transition-colors"
          >
            <FontAwesomeIcon icon={faFloppyDisk} className="text-[11px] text-emerald-400" />
          </button>

          {/* Bottom Dock Quick Selectors */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 space-x-0.5">
            <button
              onClick={() => {
                if (isTerminalOpen && bottomDockTab === 'terminal') {
                  setIsTerminalOpen(false);
                } else {
                  setIsTerminalOpen(true);
                  setBottomDockTab('terminal');
                }
              }}
              className={`px-2 py-1 h-6 rounded text-[11px] font-medium flex items-center space-x-1 transition-colors ${
                isTerminalOpen && bottomDockTab === 'terminal'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Terminal Drawer (bash)"
            >
              <FontAwesomeIcon icon={faTerminal} className="text-[10px] text-emerald-400" />
              <span className="hidden xl:inline">Terminal</span>
            </button>
            <button
              onClick={() => {
                if (isTerminalOpen && bottomDockTab === 'console') {
                  setIsTerminalOpen(false);
                } else {
                  setIsTerminalOpen(true);
                  setBottomDockTab('console');
                }
              }}
              className={`px-2 py-1 h-6 rounded text-[11px] font-medium flex items-center space-x-1 transition-colors ${
                isTerminalOpen && bottomDockTab === 'console'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Console / Process Output"
            >
              <FontAwesomeIcon icon={faLaptopCode} className="text-[10px] text-brand-400" />
              <span className="hidden xl:inline">Console</span>
            </button>
            <button
              onClick={() => {
                if (isTerminalOpen && bottomDockTab === 'logs') {
                  setIsTerminalOpen(false);
                } else {
                  setIsTerminalOpen(true);
                  setBottomDockTab('logs');
                }
              }}
              className={`px-2 py-1 h-6 rounded text-[11px] font-medium flex items-center space-x-1 transition-colors ${
                isTerminalOpen && bottomDockTab === 'logs'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Live Test Logs"
            >
              <FontAwesomeIcon icon={faFlask} className="text-[10px] text-indigo-400" />
              <span className="hidden xl:inline">Test Logs</span>
            </button>
          </div>

          {/* Focus Mode Button */}
          <button
            onClick={() => setIsFullFocus(!isFullFocus)}
            title={isFullFocus ? 'Exit Focus Mode' : 'Enter Full Focus Mode'}
            className={`w-7 h-7 rounded-md border text-xs flex items-center justify-center transition-all ${
              isFullFocus
                ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FontAwesomeIcon icon={isFullFocus ? faCompress : faExpand} className="text-[10px]" />
          </button>

          {/* IDE Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="IDE Settings"
            className="w-7 h-7 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center justify-center transition-colors"
          >
            <FontAwesomeIcon icon={faGear} className="text-[10px]" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5 hidden sm:block"></div>

          {/* Run Tests Button */}
          <button
            onClick={handleRunAllTests}
            disabled={isTesting || testCases.length === 0}
            className="px-2.5 py-1 h-7 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm flex items-center space-x-1 transition-all disabled:opacity-50"
            title="Run all evaluation test cases against your solution"
          >
            <FontAwesomeIcon
              icon={isTesting ? faRotateRight : faFlask}
              className={`text-[10px] ${isTesting ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Tests</span>
            <span className="font-mono text-[11px]">({testCases.length})</span>
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="px-2.5 py-1 h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center space-x-1 transition-all disabled:opacity-50"
            title="Compile & Run with Custom Input"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
            <span>Run</span>
          </button>

          {/* Submit Solution Button */}
          {(() => {
            const isLocked =
              existingSubmission?.status === 'submitted' &&
              !existingSubmission?.allowResubmit;
            const canResubmit = !!existingSubmission?.allowResubmit;

            return (
              <button
                onClick={() => handleSubmitExam(false)}
                disabled={isSubmitting || isLocked}
                className={`px-3 py-1 h-7 rounded-md text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all ${
                  isLocked
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-90'
                    : canResubmit
                    ? 'bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 shadow-indigo-600/25'
                    : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-600/25'
                } disabled:opacity-75`}
                title={
                  isLocked
                    ? 'You have already submitted this task. Only one submission is permitted unless your instructor grants re-submission access.'
                    : canResubmit
                    ? 'Instructor has granted re-submission permission'
                    : 'Submit solution for grading'
                }
              >
                <FontAwesomeIcon
                  icon={
                    isSubmitting
                      ? faSpinner
                      : isLocked
                      ? faLock
                      : canResubmit
                      ? faUnlock
                      : faPaperPlane
                  }
                  className={`text-[10px] ${isSubmitting ? 'animate-spin' : ''}`}
                />
                <span>
                  {isLocked
                    ? 'Submitted (Locked)'
                    : canResubmit
                    ? 'Re-submit'
                    : 'Submit'}
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Main Resizable / Focus Split Layout */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Side: Problem Statement & Test Cases List */}
        {!isFullFocus && (
          <div
            style={{ width: `${leftWidthPercent}%` }}
            className={`border-r border-slate-800 flex flex-col bg-slate-900/50 shrink-0 h-full overflow-hidden min-h-0 ${
              isDragging ? 'transition-none select-none' : 'transition-all duration-150'
            }`}
          >
            {/* Tabs header */}
            <div className="flex border-b border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 shrink-0">
              <button
                onClick={() => setActiveTab('problem')}
                className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'problem'
                    ? 'border-brand-500 text-white bg-slate-800/50 font-bold'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faCode} />
                <span>Problem</span>
              </button>

              <button
                onClick={() => setActiveTab('testcases')}
                className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
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
            </div>

            {/* Tab Content Panel */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex flex-col select-text min-h-0">
              {activeTab === 'testcases' ? (
                <div className="flex-1 -m-5 flex flex-col h-full overflow-hidden min-h-0">
                  <TestCaseRunnerPanel
                    testCases={testCases}
                    summary={testSummary}
                    isRunning={isTesting}
                    onRunAll={handleRunAllTests}
                    onRunCategory={handleRunCategory}
                    onAddCustomTestCase={handleAddCustomTestCase}
                    showLogs={false}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {isLoadingTask ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg mb-2" />
                      <p>Loading problem description...</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center space-x-2 mb-1.5">
                          {taskData?.taskType && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-brand-500/20 text-brand-400 border border-brand-500/30 uppercase">
                              {taskData.taskType}
                            </span>
                          )}
                          {taskData?.course?.subjectCode && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-teal-300 border border-slate-700">
                              {taskData.course.subjectCode}
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-bold text-white mb-1.5">
                          {taskData?.title || 'Programming Task'}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>
                            Time Limit: <strong className="text-slate-200 font-mono">{((taskData?.timeLimitMs || 1000) / 1000).toFixed(1)}s</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Memory Limit: <strong className="text-slate-200 font-mono">{taskData?.memoryLimitMb || 256}MB</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Max Points: <strong className="text-amber-400 font-mono">{taskData?.maxPoints || 100} pts</strong>
                          </span>
                        </div>
                      </div>

                      {/* Single-submission / Re-submission Alert Banner */}
                      {existingSubmission?.status === 'submitted' && !existingSubmission?.allowResubmit && (
                        <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs flex items-start space-x-2.5 text-slate-300">
                          <FontAwesomeIcon icon={faLock} className="text-amber-400 text-sm mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-amber-300">Single Submission Rule Active</p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              You have already submitted this task (Attempt #{existingSubmission.attemptCount || 1}). Each student can only submit once. If you need to re-submit, please contact your instructor to grant re-submission access.
                            </p>
                          </div>
                        </div>
                      )}

                      {existingSubmission?.allowResubmit && (
                        <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl text-xs flex items-start space-x-2.5 text-indigo-200">
                          <FontAwesomeIcon icon={faUnlock} className="text-indigo-400 text-sm mt-0.5 animate-pulse" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-indigo-300">Re-submission Access Granted</p>
                            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                              Your instructor has granted you permission to submit an updated solution for this problem.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="prose prose-invert max-w-none text-slate-300 text-xs space-y-3 whitespace-pre-wrap leading-relaxed">
                        {taskData?.description ? (
                          taskData.description.replace(/<!--educode-task-meta:[\s\S]*?-->/g, '').trim()
                        ) : (
                          <p>Solve this programming problem in your selected language and test with sample cases before submitting.</p>
                        )}
                      </div>

                      {/* Render Sample Test Cases if available */}
                      {testCases.filter((tc) => !tc.isHidden).length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-800">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Sample Test Cases
                          </h4>
                          {testCases
                            .filter((tc) => !tc.isHidden)
                            .map((tc, idx) => (
                              <div key={tc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                                <p className="font-bold text-slate-300 text-[11px]">Sample #{idx + 1} Input</p>
                                <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-teal-300 overflow-x-auto">
                                  {tc.inputData || '(Empty input)'}
                                </pre>
                                <p className="font-bold text-slate-300 text-[11px]">Sample #{idx + 1} Expected Output</p>
                                <pre className="p-2 bg-slate-900 rounded font-mono text-[11px] text-teal-300 overflow-x-auto">
                                  {tc.expectedOutput || '(Empty output)'}
                                </pre>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
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
        <div className="flex-1 flex bg-slate-950 select-text relative overflow-hidden min-h-0">
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
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden min-h-0">
            {/* Concluded Session Alert Banner */}
            {isConcluded && (
              <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2 text-rose-300 text-xs font-bold flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faLock} />
                  <span>Session Concluded — Solutions have been automatically submitted and locked.</span>
                </div>
              </div>
            )}

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
                    disabled={isConcluded}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-brand-500 font-semibold disabled:opacity-50"
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
                    disabled={isConcluded}
                    className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors disabled:opacity-50"
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
                      readOnly: isConcluded,
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

            {/* VS Code Developer Bottom Dock (Terminal, Console Output, Test Logs) */}
            {isTerminalOpen && (
              <div
                style={{ height: `${terminalHeight}px` }}
                className="border-t border-slate-800 bg-[#0e131f] flex flex-col shrink-0 relative transition-[height] duration-75"
              >
                {/* Resizing Handle with indicator */}
                <div
                  onMouseDown={handleTerminalResizeStart}
                  onDoubleClick={toggleMaximizeTerminal}
                  className="h-2.5 w-full cursor-row-resize hover:bg-brand-500/50 active:bg-brand-500 transition-colors absolute -top-1 left-0 right-0 z-30 flex items-center justify-center group"
                  title="Drag to resize or double-click to toggle maximize"
                >
                  <div className="w-12 h-1 rounded-full bg-slate-600 group-hover:bg-brand-400 group-active:bg-brand-400 transition-colors" />
                </div>

                {/* Dock Header with Tabs */}
                <div 
                  className="h-8 bg-[#131927] border-b border-slate-800/80 px-2 flex items-center justify-between text-xs shrink-0 select-none"
                  onDoubleClick={toggleMaximizeTerminal}
                >
                  {/* Tabs: Terminal, Console, Test Logs */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setBottomDockTab('terminal')}
                      className={`px-3 py-1 rounded-t-md flex items-center space-x-1.5 text-xs font-semibold border-b-2 transition-all ${
                        bottomDockTab === 'terminal'
                          ? 'border-emerald-500 text-white bg-slate-900/90'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faTerminal} className="text-emerald-400 text-xs" />
                      <span>TERMINAL</span>
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">(bash)</span>
                    </button>

                    <button
                      onClick={() => setBottomDockTab('console')}
                      className={`px-3 py-1 rounded-t-md flex items-center space-x-1.5 text-xs font-semibold border-b-2 transition-all ${
                        bottomDockTab === 'console'
                          ? 'border-brand-500 text-white bg-slate-900/90'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faLaptopCode} className="text-brand-400 text-xs" />
                      <span>CONSOLE</span>
                      {executionOutput && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold ${
                          executionOutput.exitCode === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          Exit {executionOutput.exitCode}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setBottomDockTab('logs')}
                      className={`px-3 py-1 rounded-t-md flex items-center space-x-1.5 text-xs font-semibold border-b-2 transition-all ${
                        bottomDockTab === 'logs'
                          ? 'border-indigo-500 text-white bg-slate-900/90'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faFlask} className="text-indigo-400 text-xs" />
                      <span>TEST LOGS</span>
                      {testSummary && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold ${
                          testSummary.passedCount === testSummary.totalCount ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {testSummary.passedCount}/{testSummary.totalCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Controls: Clear, Maximize, Close */}
                  <div className="flex items-center space-x-1">
                    {bottomDockTab === 'terminal' && (
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.educode?.pty) {
                            window.educode.pty.write('clear\n');
                          }
                        }}
                        title="Clear Terminal"
                        className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    {bottomDockTab === 'console' && (
                      <button
                        onClick={() => {
                          setConsoleLogs([]);
                          setExecutionOutput(null);
                        }}
                        title="Clear Console Output"
                        className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={toggleMaximizeTerminal}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title={isTerminalMaximized ? "Restore Height" : "Maximize Height"}
                    >
                      <FontAwesomeIcon icon={isTerminalMaximized ? faWindowRestore : faWindowMaximize} className="text-xs" />
                    </button>
                    <button
                      onClick={() => setIsTerminalOpen(false)}
                      title="Close Panel"
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-xs" />
                    </button>
                  </div>
                </div>

                {/* Dock Body */}
                <div className="flex-1 w-full overflow-hidden relative">
                  {bottomDockTab === 'terminal' && (
                    <div className="h-full w-full">
                      <XtermTerminal height={terminalHeight - 32} />
                    </div>
                  )}
                  {bottomDockTab === 'console' && (
                    <div className="h-full w-full p-3 overflow-y-auto font-mono text-xs flex flex-col space-y-3 bg-slate-950">
                      {/* Stdin input + Run Code Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                          <FontAwesomeIcon icon={faKeyboard} className="text-brand-400" />
                          <span>Standard Input (stdin)</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleRunConsoleCode(customInput)}
                            disabled={isExecuting}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-50 shadow"
                          >
                            <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
                            <span>{isExecuting ? 'Executing...' : 'Run with Input'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom stdin lines here..."
                        className="w-full h-16 p-2 bg-slate-900 border border-slate-800 rounded-lg text-tealAccent-300 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none shrink-0"
                      />

                      {/* Process Output Display */}
                      <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2 min-h-[100px]">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Process Output</span>
                          {executionOutput && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              executionOutput.exitCode === 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                            }`}>
                              Exit {executionOutput.exitCode} • {executionOutput.timeMs}ms
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1.5">
                          {isExecuting ? (
                            <div className="flex items-center space-x-2 text-brand-400 animate-pulse py-2">
                              <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                              <span>Executing code in container sandbox...</span>
                            </div>
                          ) : executionOutput ? (
                            <div className="space-y-1.5">
                              {executionOutput.stdout && (
                                <pre className="text-tealAccent-300 whitespace-pre-wrap bg-slate-950/80 p-2 rounded border border-slate-800 overflow-x-auto">
                                  {executionOutput.stdout}
                                </pre>
                              )}
                              {executionOutput.stderr && (
                                <pre className="text-rose-400 whitespace-pre-wrap bg-rose-950/40 p-2 rounded border border-rose-900/50 overflow-x-auto">
                                  {executionOutput.stderr}
                                </pre>
                              )}
                              {executionOutput.compilationError && (
                                <pre className="text-amber-400 whitespace-pre-wrap bg-amber-950/40 p-2 rounded border border-amber-900/50 overflow-x-auto">
                                  {executionOutput.compilationError}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-600 text-xs italic py-4 text-center">
                              No active process output. Click &quot;Run&quot; or &quot;Run with Input&quot; to execute.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {bottomDockTab === 'logs' && (
                    <div className="h-full w-full bg-slate-950 overflow-hidden flex flex-col">
                      <LiveTestLogsView
                        summary={testSummary}
                        isRunning={isTesting}
                        passPercent={testSummary && testSummary.totalCount > 0 ? Math.round((testSummary.passedCount / testSummary.totalCount) * 100) : 0}
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}
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

      {/* Submission Feedback Modal */}
      {submissionFeedback && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-teal-500/40 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center text-xl">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">Solution Submitted Successfully</h2>
              <p className="text-xs text-slate-300 mt-1">
                {submissionFeedback.message}
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl text-left text-xs font-mono space-y-1 border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">{submissionFeedback.status}</span>
              </div>
              {submissionFeedback.points !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Points Awarded:</span>
                  <span className="text-amber-400 font-bold">
                    {submissionFeedback.points} / {submissionFeedback.maxPoints || 100}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setSubmissionFeedback(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700"
              >
                Continue Editing
              </button>
              <a
                href={`/student/classrooms/${taskData?.courseId || ''}`}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-600/30 text-center transition-all"
              >
                Return to Classroom
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
