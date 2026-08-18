'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  faPlus,
  faFloppyDisk,
  faFlask,
  faVial,
  faRotateRight,
  faWindowMaximize,
  faWindowRestore,
  faArrowLeft,
  faLock,
  faUnlock,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import IDESettingsModal, { DEFAULT_SETTINGS, IDESettings } from '@/components/IDESettingsModal';
import FileExplorer, { WorkspaceFile } from '@/components/FileExplorer';
import JavaPackageModal from '@/components/JavaPackageModal';
import { PRESET_THEMES } from '@/components/themes';
import { saveCodeDraft, loadCodeDraft, clearCodeDraft } from '@/utils/draftStorage';
import { PostContentRenderer } from '@/components/stream/PostContentRenderer';
import {
  TestCaseInput,
  TestCaseResult,
  TestSuiteSummary,
  runAllTestCases,
} from '@/utils/testCaseRunner';
import { parseCheckerMetadata, parseTaskWorkbenchMetadata } from '@/utils/testCaseChecker';
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
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskSubmissions, setTaskSubmissions] = useState<
    Record<
      string,
      {
        id: string;
        status: string;
        allowResubmit: boolean;
        attemptCount: number;
        submittedAt?: string;
      }
    >
  >({});

  // Auto-redirect if id is direct and taskId parameter is present
  useEffect(() => {
    const urlTaskId = searchParams?.get('taskId');
    if ((id === 'direct' || id === 'undefined' || !id) && urlTaskId) {
      router.replace(`/student/exam/${urlTaskId}`);
    }
  }, [id, searchParams, router]);

  // State mapped by task ID
  const [workspaces, setWorkspaces] = useState<Record<string, TaskWorkspaceState>>({});
  const [activeTab, setActiveTab] = useState<'problem' | 'testcases'>('problem');
  const [isExecuting, setIsExecuting] = useState(false);
  const [testSummaries, setTestSummaries] = useState<Record<string, TestSuiteSummary>>({});
  const [isTesting, setIsTesting] = useState(false);
  
  const [isJavaPackageModalOpen, setIsJavaPackageModalOpen] = useState<boolean>(false);

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

  // Default Files Boilerplate Generator
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
    const urlTaskId = searchParams?.get('taskId');
    if ((id === 'direct' || id === 'undefined' || !id) && urlTaskId) {
      router.replace(`/student/exam/${urlTaskId}`);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (!res.ok) {
        if (urlTaskId) {
          router.replace(`/student/exam/${urlTaskId}`);
          return;
        }
        throw new Error('Failed to fetch assessment');
      }
      const data = await res.json();
      
      if (data.type === 'EXAM' && data.status !== 'RUNNING' && data.status !== 'FINISHED') {
        throw new Error('This exam is not currently running.');
      }
      
      setAssessment(data);

      // Initialize workspace states with draft restoration
      const initialWorkspaces: Record<string, TaskWorkspaceState> = {};
      data.tasks?.forEach((t: any) => {
        const draftKey = `${id}_${t.id}`;
        const savedDraft = loadCodeDraft(draftKey);
        if (savedDraft && Array.isArray(savedDraft.files) && savedDraft.files.length > 0) {
          initialWorkspaces[t.id] = {
            workspaceFiles: savedDraft.files,
            openTabPaths: savedDraft.openTabPaths?.length ? savedDraft.openTabPaths : [savedDraft.files[0].path],
            activeFilePath: savedDraft.activeFilePath || savedDraft.files[0].path,
            customInput: '5\n1 2 3 4 5',
            consoleLogs: [],
            executionOutput: null,
            code: savedDraft.code || savedDraft.files[0].content,
            language: (savedDraft.language as any) || t.allowedLanguage?.toLowerCase() || 'cpp',
          };
          if (savedDraft.updatedAt) {
            setLastSavedTime(new Date(savedDraft.updatedAt).toLocaleTimeString());
            setDraftStatus('saved');
          }
        } else {
          const lang = (t.allowedLanguage || t.language || 'cpp').toLowerCase();
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
        }
      });
      setWorkspaces(initialWorkspaces);

      // Fetch student submissions for tasks
      try {
        const subRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/submissions/my-submissions`,
          {
            headers: { Authorization: `Bearer ${user?.token}` },
          },
        );
        if (subRes.ok) {
          const subList = await subRes.json();
          if (Array.isArray(subList)) {
            const map: Record<string, any> = {};
            subList.forEach((s: any) => {
              map[s.taskId] = {
                id: s.id,
                status: s.status,
                allowResubmit: !!s.allowResubmit,
                attemptCount: s.attemptCount || 1,
                submittedAt: s.submittedAt,
              };
            });
            setTaskSubmissions(map);
          }
        }
      } catch {
        // ignore
      }

      // Select requested task if query param provided
      const queryTaskId = searchParams?.get('taskId');
      const queryTaskIdx = searchParams?.get('taskIndex');
      if (queryTaskId && Array.isArray(data.tasks)) {
        const foundIdx = data.tasks.findIndex((t: any) => t.id === queryTaskId);
        if (foundIdx >= 0) setCurrentTaskIndex(foundIdx);
      } else if (queryTaskIdx !== null && queryTaskIdx !== undefined && Array.isArray(data.tasks)) {
        const parsedIdx = parseInt(queryTaskIdx, 10);
        if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < data.tasks.length) {
          setCurrentTaskIndex(parsedIdx);
        }
      }

      // Check session finished vs running vs extra time
      if (data.status === 'FINISHED') {
        endTimeMsRef.current = null;
        setTimeLeft(0);
        if (!hasAutoSubmittedRef.current) {
          handleAutoSubmitAllTasks(true);
        }
      } else if (data.status === 'RUNNING' && data.startTime && data.durationMin) {
        const start = new Date(data.startTime).getTime();
        const end = start + Number(data.durationMin) * 60 * 1000;
        endTimeMsRef.current = end;
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setTimeLeft(diff);
        if (diff > 0) {
          hasAutoSubmittedRef.current = false; // Reset flag if session was re-opened or extra time added
        }
      } else if (data.durationMin && data.durationMin > 0 && data.type === 'LAB') {
        if (!endTimeMsRef.current) {
          const durSeconds = Number(data.durationMin) * 60;
          endTimeMsRef.current = Date.now() + durSeconds * 1000;
          setTimeLeft(durSeconds);
        }
      } else {
        endTimeMsRef.current = null;
        setTimeLeft(null);
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
      const interval = setInterval(fetchAssessment, 3000);
      return () => clearInterval(interval);
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

  // Draft saving state
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Focus & integrity monitoring state
  const [focusWarnings, setFocusWarnings] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
  const [lastWarningReason, setLastWarningReason] = useState<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const internalCopiedTextRef = useRef<string>('');
  const endTimeMsRef = useRef<number | null>(null);
  const hasAutoSubmittedRef = useRef<boolean>(false);

  const handleAutoSubmitAllTasks = async (isTimeUp = false) => {
    if (!user?.token || !assessment?.tasks || assessment.tasks.length === 0) return;
    if (hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;

    setIsSubmitting(true);
    try {
      for (const task of assessment.tasks) {
        const ws = workspaces[task.id];
        const sourceCode =
          ws?.code ||
          ws?.workspaceFiles?.[0]?.content ||
          task.templateCode ||
          '// Final solution auto-submitted upon session conclusion';
        const lang = (ws?.language || task.language || 'cpp').toUpperCase();

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/submissions`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${user.token}`,
              },
              body: JSON.stringify({
                taskId: task.id,
                sourceCode,
                language: lang,
              }),
            },
          );
          if (res.ok) {
            const data = await res.json();
            setTaskSubmissions((prev) => ({
              ...prev,
              [task.id]: {
                id: data.id || 'sub-auto',
                status: 'submitted',
                allowResubmit: false,
                attemptCount: 1,
                submittedAt: new Date().toISOString(),
              },
            }));
          }
        } catch (taskErr) {
          console.error(`Auto-submit error for task ${task.id}:`, taskErr);
        }
      }

      if (isTimeUp) {
        alert('Assessment session time has expired. All your solutions have been automatically submitted.');
      }
    } catch (err: any) {
      console.error('Auto-submitting tasks failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 0) {
      if (!hasAutoSubmittedRef.current) {
        handleAutoSubmitAllTasks(true); // Auto-submit all tasks when time is up
      }
      return;
    }

    const timer = setInterval(() => {
      if (endTimeMsRef.current !== null) {
        const remaining = Math.max(0, Math.floor((endTimeMsRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      } else {
        setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft === null, timeLeft === 0]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentTask = assessment?.tasks?.[currentTaskIndex];
  const isConcluded = assessment?.status === 'FINISHED' || (timeLeft !== null && timeLeft <= 0);
  const isLastTask = assessment?.tasks
    ? currentTaskIndex === assessment.tasks.length - 1
    : false;
  const currentWorkspace = currentTask
    ? workspaces[currentTask.id]
    : undefined;

  const handleSubmitExam = async () => {
    if (!user?.token || !currentTask || !currentWorkspace) return;

    const currentSub = taskSubmissions[currentTask.id];
    const isLocked =
      currentSub?.status === 'submitted' && !currentSub?.allowResubmit;

    if (isLocked) {
      alert(
        'You have already submitted this task. Only one submission is permitted unless your instructor grants re-submission access.',
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to submit your solution for "${currentTask.title}"? Each task can only be submitted once unless unlocked by your teacher.`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            taskId: currentTask.id,
            sourceCode: currentWorkspace.code,
            language: currentWorkspace.language.toUpperCase(),
          }),
        },
      );

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.message || 'Submission failed');
      }

      setTaskSubmissions((prev) => ({
        ...prev,
        [currentTask.id]: {
          id: resData.id || 'sub-id',
          status: 'submitted',
          allowResubmit: false,
          attemptCount: (currentSub?.attemptCount || 0) + 1,
          submittedAt: new Date().toISOString(),
        },
      }));

      alert('Task solution submitted successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit task solution');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Auto-save active workspace draft
  useEffect(() => {
    if (!id || !currentTask || !currentWorkspace || currentWorkspace.workspaceFiles.length === 0) return;
    setDraftStatus('saving');
    const timer = setTimeout(() => {
      const saved = saveCodeDraft(`${id}_${currentTask.id}`, {
        language: currentWorkspace.language,
        files: currentWorkspace.workspaceFiles,
        openTabPaths: currentWorkspace.openTabPaths,
        activeFilePath: currentWorkspace.activeFilePath,
        code: currentWorkspace.code,
      });
      if (saved) {
        setDraftStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [id, currentTask, currentWorkspace?.workspaceFiles, currentWorkspace?.openTabPaths, currentWorkspace?.activeFilePath, currentWorkspace?.code, currentWorkspace?.language]);

  const handleManualSaveDraft = () => {
    if (!id || !currentTask || !currentWorkspace) return;
    setDraftStatus('saving');
    const saved = saveCodeDraft(`${id}_${currentTask.id}`, {
      language: currentWorkspace.language,
      files: currentWorkspace.workspaceFiles,
      openTabPaths: currentWorkspace.openTabPaths,
      activeFilePath: currentWorkspace.activeFilePath,
      code: currentWorkspace.code,
    });
    if (saved) {
      setDraftStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
    }
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
    if (!currentWorkspace) return;
    updateCurrentWorkspace({
      code: newCode,
      workspaceFiles: currentWorkspace.workspaceFiles.map((f) => 
        f.path === currentWorkspace.activeFilePath ? { ...f, content: newCode } : f
      )
    });
  };

  const handleSelectFile = (filePath: string) => {
    if (!currentWorkspace) return;
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
    if (!currentWorkspace) return;
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
    if (!currentWorkspace || !currentTask) return;
    if (!currentTask.allowMultiFile && currentWorkspace.workspaceFiles.filter((f) => !f.isFolder).length >= 1) {
      alert('Multi-file project is disabled for this task. You can only work in a single file.');
      return;
    }
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
    if (!currentWorkspace || !currentTask) return;
    if (!currentTask.allowMultiFile) {
      alert('Multi-file project is disabled for this task.');
      return;
    }
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
    if (!currentWorkspace) return;
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

  // Initialize integrity proctoring for the entire assessment session
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window as any).educode?.integrity &&
      assessment &&
      (assessment.type === 'EXAM' || assessment.type === 'LAB')
    ) {
      (window as any).educode.integrity.startMonitoring(`assessment-${assessment.id}-${Date.now()}`);
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
    } else {
      setIsMonitoringActive(false);
    }
  }, [assessment?.id, assessment?.type]);

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

    const handleMouseMoveTerminal = (e: MouseEvent) => {
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
    if (!currentWorkspace) return;
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setBottomDockTab('console');

    try {
      if (typeof window !== 'undefined' && (window as any).educode?.pty) {
        await (window as any).educode.pty.runCode({
          code: currentWorkspace.code,
          language: currentWorkspace.language,
          files: currentWorkspace.workspaceFiles,
          activeFilePath: currentWorkspace.activeFilePath,
        });
      } else {
        await handleRunConsoleCode(currentWorkspace.customInput);
      }
    } catch (err) {
      console.error('PTY Code Runner error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunConsoleCode = async (stdinText?: string) => {
    if (!currentWorkspace) return;
    setIsExecuting(true);
    setIsTerminalOpen(true);
    setBottomDockTab('console');
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

  // Run Automated Evaluation Test Cases with category filtering
  const handleRunCategory = async (category: 'ALL' | 'SAMPLE' | 'PRETEST' = 'ALL') => {
    if (!currentTask || !currentWorkspace || isTesting) return;
    setIsTesting(true);
    setActiveTab('testcases');
    setIsTerminalOpen(true);
    setBottomDockTab('logs');
    setIsFullFocus(false);

    const taskTestCases: TestCaseInput[] = (currentTask.testCases && currentTask.testCases.length > 0)
      ? currentTask.testCases
      : [
          { id: '1', order: 1, inputData: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', points: 25, isHidden: false, testType: 'SAMPLE' },
          { id: '2', order: 2, inputData: '3\n10 20 30', expectedOutput: '30 20 10', points: 25, isHidden: false, testType: 'SAMPLE' },
          { id: '3', order: 3, inputData: '1\n99', expectedOutput: '99', points: 25, isHidden: true, testType: 'PRETEST' },
          { id: '4', order: 4, inputData: '4\n2 4 6 8', expectedOutput: '8 6 4 2', points: 25, isHidden: true, testType: 'PRETEST' },
        ];

    try {
      const workbenchMeta = parseTaskWorkbenchMetadata(currentTask.description);
      const checkerConfig = workbenchMeta.checkerConfig || parseCheckerMetadata(currentTask.description);
      const timeLimitMs = currentTask.timeLimitMs || workbenchMeta.timeLimitMs || 1000;

      const summary = await runAllTestCases(
        taskTestCases,
        currentWorkspace.code,
        currentWorkspace.language,
        currentWorkspace.workspaceFiles,
        currentWorkspace.activeFilePath,
        (progress) => {
          setTestSummaries((prev) => {
            const currentSum = prev[currentTask.id];
            const existingResults = currentSum?.results ? [...currentSum.results] : [];
            const idx = existingResults.findIndex((r) => r.testCaseId === progress.currentResult.testCaseId);
            if (idx >= 0) {
              existingResults[idx] = progress.currentResult;
            } else {
              existingResults.push(progress.currentResult);
            }

            return {
              ...prev,
              [currentTask.id]: {
                totalCount: progress.totalCount,
                passedCount: progress.passedCount,
                failedCount: progress.failedCount,
                totalPoints: taskTestCases.reduce((acc, t) => acc + (t.points ?? 10), 0),
                earnedPoints: existingResults.reduce((acc, r) => acc + (r.passed ? r.points : 0), 0),
                totalTimeMs: existingResults.reduce((acc, r) => acc + r.timeMs, 0),
                status: progress.passedCount === progress.totalCount ? 'ALL_PASSED' : 'PARTIAL_PASSED',
                results: existingResults,
                logs: progress.logs,
              },
            };
          });
        },
        timeLimitMs,
        checkerConfig,
        category
      );
      setTestSummaries((prev) => ({ ...prev, [currentTask.id]: summary }));
    } catch (err) {
      console.error('Test runner execution error:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunAllTests = () => handleRunCategory('ALL');

  const handleAddCustomTestCase = (tc: TestCaseInput) => {
    if (!currentTask) return;
    const currentList = currentTask.testCases || [];
    currentTask.testCases = [...currentList, tc];
  };

  if (isLoading) return <div className="h-full flex-1 bg-gray-900 flex items-center justify-center text-white">Loading Exam...</div>;
  if (error) return <div className="h-full flex-1 bg-gray-900 flex items-center justify-center text-red-500">{error}</div>;
  if (!assessment?.tasks || assessment.tasks.length === 0) return <div className="h-full flex-1 bg-gray-900 flex items-center justify-center text-white">No tasks found for this exam.</div>;
  if (!currentWorkspace || !currentTask) return null; // Wait until workspace initializes

  return (
    <div className="h-full flex-1 flex flex-col bg-slate-950 overflow-hidden select-none min-h-0">
      {/* Top Space-Optimized Header Bar */}
      <div className="h-12 bg-[#0b0f19] border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 z-20 gap-3">
        {/* Left: Exit/Classroom Link + Exam Info */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-shrink">
          <Link
            href="/student/dashboard"
            title="Return to Dashboard"
            className="w-7 h-7 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          </Link>

          <div className="flex items-center space-x-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0"></span>
            <span
              className="font-bold text-white tracking-tight text-xs truncate max-w-[150px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-[380px]"
              title={assessment.title}
            >
              {assessment.title}
            </span>
          </div>

          {assessment.type && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-brand-500/15 text-brand-400 border border-brand-500/30 uppercase tracking-wider shrink-0 hidden sm:inline-block">
              {assessment.type}
            </span>
          )}
        </div>

        {/* Center / Status Indicators */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Only show Proctoring indicator when proctoring is actively running */}
          {isMonitoringActive && (
            <div className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center space-x-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-400 transition-all">
              <FontAwesomeIcon
                icon={faShieldHalved}
                className="text-[10px] animate-pulse"
              />
              <span className="hidden xl:inline">Proctored Session</span>
            </div>
          )}

          {focusWarnings > 0 && isMonitoringActive && (
            <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center space-x-1 animate-pulse">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-[10px]" />
              <span>{focusWarnings}</span>
            </div>
          )}

          {timeLeft !== null && (
            <div
              className={`px-2.5 py-1 rounded-md border text-xs font-mono font-bold flex items-center space-x-1.5 shadow-inner ${
                timeLeft < 300
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
                  : 'bg-slate-900 border-slate-700/80 text-tealAccent-400'
              }`}
            >
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              <span>{formatTime(timeLeft)}</span>
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
            disabled={isTesting}
            className="px-2.5 py-1 h-7 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm flex items-center space-x-1 transition-all disabled:opacity-50"
            title="Run all evaluation test cases against your solution"
          >
            <FontAwesomeIcon
              icon={isTesting ? faRotateRight : faFlask}
              className={`text-[10px] ${isTesting ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Tests</span>
            <span className="font-mono text-[11px]">({currentTask.testCases?.length || 4})</span>
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

          {/* Submit Exam Button */}
          {(() => {
            const currentSub = currentTask
              ? taskSubmissions[currentTask.id]
              : undefined;
            const isLocked =
              currentSub?.status === 'submitted' && !currentSub?.allowResubmit;
            const canResubmit = !!currentSub?.allowResubmit;

            return (
              <button
                onClick={handleSubmitExam}
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
                    : 'Submit task solution'
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
                      : faCheck
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

      <div ref={containerRef} className="flex-1 flex overflow-hidden relative min-h-0">
        {!isFullFocus && (
          <div
            style={{ width: `${leftWidthPercent}%` }}
            className={`border-r border-slate-800 flex flex-col bg-slate-900 shrink-0 h-full overflow-hidden min-h-0 ${
              isDragging ? 'transition-none select-none' : 'transition-all duration-150'
            }`}
          >
            <div className="p-3 border-b border-slate-800 flex justify-between items-center text-slate-300 bg-slate-900/80 shrink-0">
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

            <div className="flex border-b border-slate-800 bg-slate-900 text-xs font-semibold text-slate-400 shrink-0">
              <button
                onClick={() => setActiveTab('problem')}
                className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
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
                className={`px-4 py-2.5 border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'testcases'
                    ? 'border-brand-500 text-white bg-slate-800/50 font-bold'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faFlask} className="text-brand-400" />
                <span>Test Cases</span>
                {testSummaries[currentTask.id] && (
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold border ${
                    testSummaries[currentTask.id].passedCount === testSummaries[currentTask.id].totalCount
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/30 text-rose-300 border-rose-500/40'
                  }`}>
                    {testSummaries[currentTask.id].passedCount}/{testSummaries[currentTask.id].totalCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex flex-col select-text min-h-0">
              {activeTab === 'testcases' ? (
                <div className="flex-1 -m-5 flex flex-col h-full overflow-hidden min-h-0">
                  <TestCaseRunnerPanel
                    testCases={currentTask.testCases && currentTask.testCases.length > 0 ? currentTask.testCases : [
                      { id: '1', order: 1, inputData: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', points: 25, isHidden: false, testType: 'SAMPLE' },
                      { id: '2', order: 2, inputData: '3\n10 20 30', expectedOutput: '30 20 10', points: 25, isHidden: false, testType: 'SAMPLE' },
                      { id: '3', order: 3, inputData: '1\n99', expectedOutput: '99', points: 25, isHidden: true, testType: 'PRETEST' },
                      { id: '4', order: 4, inputData: '4\n2 4 6 8', expectedOutput: '8 6 4 2', points: 25, isHidden: true, testType: 'PRETEST' },
                    ]}
                    summary={testSummaries[currentTask.id] || null}
                    isRunning={isTesting}
                    onRunAll={handleRunAllTests}
                    onRunCategory={handleRunCategory}
                    onAddCustomTestCase={handleAddCustomTestCase}
                    checkerConfig={parseTaskWorkbenchMetadata(currentTask.description).checkerConfig || parseCheckerMetadata(currentTask.description)}
                    timeLimitMs={currentTask.timeLimitMs || parseTaskWorkbenchMetadata(currentTask.description).timeLimitMs || 1000}
                    memoryLimitMb={currentTask.memoryLimitMb || parseTaskWorkbenchMetadata(currentTask.description).memoryLimitMb || 256}
                    showLogs={false}
                  />
                </div>
              ) : (
                <div className="space-y-4 prose prose-invert max-w-none">
                  <h2 className="text-lg font-bold text-white m-0">{currentTask.title}</h2>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 capitalize font-medium">
                      {currentTask.difficulty || 'Medium'}
                    </span>
                    <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300 font-medium">
                      {currentTask.points || 100} Points
                    </span>
                    <span className="px-2 py-1 bg-amber-500/10 rounded border border-amber-500/30 text-amber-300 font-bold flex items-center space-x-1">
                      <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                      <span>Time Limit: {(currentTask.timeLimitMs || parseTaskWorkbenchMetadata(currentTask.description).timeLimitMs || 1000) / 1000}s</span>
                    </span>
                    <span className="px-2 py-1 bg-cyan-500/10 rounded border border-cyan-500/30 text-cyan-300 font-bold">
                      Memory Limit: {currentTask.memoryLimitMb || parseTaskWorkbenchMetadata(currentTask.description).memoryLimitMb || 256} MB
                    </span>
                  </div>

                  {/* Single-submission / Re-submission Alert Banner */}
                  {taskSubmissions[currentTask.id]?.status === 'submitted' &&
                    !taskSubmissions[currentTask.id]?.allowResubmit && (
                      <div className="not-prose p-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs flex items-start space-x-2.5 text-slate-300">
                        <FontAwesomeIcon icon={faLock} className="text-amber-400 text-sm mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-amber-300">Single Submission Rule Active</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            You have already submitted this task (Attempt #{taskSubmissions[currentTask.id].attemptCount || 1}). Each student can only submit once. If you need to re-submit, please contact your instructor to grant re-submission access.
                          </p>
                        </div>
                      </div>
                    )}

                  {taskSubmissions[currentTask.id]?.allowResubmit && (
                    <div className="not-prose p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl text-xs flex items-start space-x-2.5 text-indigo-200">
                      <FontAwesomeIcon icon={faUnlock} className="text-indigo-400 text-sm mt-0.5 animate-pulse" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-indigo-300">Re-submission Access Granted</p>
                        <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                          Your instructor has granted you permission to submit an updated solution for this problem.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    {currentTask.description ? (
                      <PostContentRenderer
                        body={currentTask.description}
                        defaultLanguage={currentWorkspace?.language || 'cpp'}
                        isPostRunnable={false}
                      />
                    ) : (
                      <p className="text-slate-500 italic text-xs">No description provided for this task.</p>
                    )}
                  </div>

                  {/* Sample Test Cases & Examples Section */}
                  {(() => {
                    const sampleCases = Array.isArray(currentTask.testCases)
                      ? currentTask.testCases.filter((tc: any) => !tc.isHidden || tc.testType === 'SAMPLE')
                      : [];

                    if (sampleCases.length === 0) return null;

                    return (
                      <div className="not-prose space-y-4 pt-5 border-t border-slate-800/80">
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon icon={faVial} className="text-teal-400 text-xs" />
                          <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                            Sample Test Cases & Examples ({sampleCases.length})
                          </h4>
                        </div>

                        <div className="space-y-4">
                          {sampleCases.map((tc: any, idx: number) => (
                            <div
                              key={tc.id || idx}
                              className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800/90 space-y-3 shadow-md"
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                <span className="flex items-center space-x-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                                  <span>Sample #{idx + 1}</span>
                                </span>
                                {tc.points ? (
                                  <span className="text-teal-400 font-mono text-[11px]">({tc.points} pts)</span>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Sample Input */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                                      Sample Input
                                    </span>
                                  </div>
                                  <pre className="p-3 bg-slate-900/90 rounded-xl font-mono text-[11px] text-teal-300 overflow-x-auto border border-slate-800/80 whitespace-pre-wrap select-text">
                                    {tc.inputData !== undefined && tc.inputData !== null && tc.inputData !== ''
                                      ? tc.inputData
                                      : '(No Input / Empty)'}
                                  </pre>
                                </div>

                                {/* Expected Output */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                                      Expected Output
                                    </span>
                                  </div>
                                  <pre className="p-3 bg-slate-900/90 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800/80 whitespace-pre-wrap select-text">
                                    {tc.expectedOutput !== undefined && tc.expectedOutput !== null && tc.expectedOutput !== ''
                                      ? tc.expectedOutput
                                      : '(No Output / Empty)'}
                                  </pre>
                                </div>
                              </div>

                              {tc.explanation && (
                                <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60 text-[11px] text-slate-300">
                                  <span className="font-bold text-teal-400">Explanation: </span>
                                  <span>{tc.explanation}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
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

        {/* Right Side: Multi-Tab Editor + Bottom Dock */}
        <div className="flex-1 flex bg-slate-950 select-text relative overflow-hidden min-h-0">
          <FileExplorer
            files={currentWorkspace.workspaceFiles}
            activeFilePath={currentWorkspace.activeFilePath}
            language={currentWorkspace.language}
            allowMultiFile={Boolean(currentTask?.allowMultiFile)}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeletePath={handleDeletePath}
            onOpenJavaPackageModal={() => setIsJavaPackageModalOpen(true)}
          />

          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden min-h-0">
            {/* Concluded Session Alert Banner */}
            {isConcluded && (
              <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2 text-rose-300 text-xs font-bold flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faLock} />
                  <span>Session Concluded — Solutions have been automatically submitted and locked. If your instructor adds extra time, live editing will re-open automatically.</span>
                </div>
              </div>
            )}

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
                    const ext = currentWorkspace.language === 'java' ? '.java' : currentWorkspace.language === 'python' ? '.py' : currentWorkspace.language === 'c' ? '.c' : '.cpp';
                    const fileName = window.prompt(`Enter new file name:`, `file_${currentWorkspace.workspaceFiles.length + 1}${ext}`);
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

              <div className="flex items-center space-x-3 px-3 shrink-0 bg-[#111827]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Lang:</span>
                  <select
                    value={currentWorkspace.language}
                    onChange={(e) => handleLanguageChange(e.target.value as 'cpp' | 'python' | 'java' | 'c')}
                    disabled={isConcluded}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
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
                    disabled={isConcluded}
                    className="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-[11px] flex items-center space-x-1 transition-colors disabled:opacity-50"
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
                    readOnly: isConcluded,
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
                      {currentWorkspace.executionOutput && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold ${
                          currentWorkspace.executionOutput.exitCode === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          Exit {currentWorkspace.executionOutput.exitCode}
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
                      {testSummaries[currentTask.id] && (
                        <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-bold ${
                          testSummaries[currentTask.id].passedCount === testSummaries[currentTask.id].totalCount ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {testSummaries[currentTask.id].passedCount}/{testSummaries[currentTask.id].totalCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Controls: Clear, Maximize, Close */}
                  <div className="flex items-center space-x-1">
                    {bottomDockTab === 'terminal' && (
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined' && (window as any).educode?.pty) {
                            (window as any).educode.pty.write('clear\n');
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
                        onClick={() => updateCurrentWorkspace({ consoleLogs: [], executionOutput: null })}
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
                            onClick={() => handleRunConsoleCode(currentWorkspace.customInput)}
                            disabled={isExecuting}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] transition-colors flex items-center space-x-1 disabled:opacity-50 shadow"
                          >
                            <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
                            <span>{isExecuting ? 'Executing...' : 'Run with Input'}</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={currentWorkspace.customInput}
                        onChange={(e) => updateCurrentWorkspace({ customInput: e.target.value })}
                        placeholder="Enter custom stdin lines here..."
                        className="w-full h-16 p-2 bg-slate-900 border border-slate-800 rounded-lg text-tealAccent-300 font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none shrink-0"
                      />

                      {/* Process Output Display */}
                      <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2 min-h-[100px]">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Process Output</span>
                          {currentWorkspace.executionOutput && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              currentWorkspace.executionOutput.exitCode === 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                            }`}>
                              Exit {currentWorkspace.executionOutput.exitCode} • {currentWorkspace.executionOutput.timeMs}ms
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1.5">
                          {isExecuting ? (
                            <div className="flex items-center space-x-2 text-brand-400 animate-pulse py-2">
                              <div className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                              <span>Executing code in container sandbox...</span>
                            </div>
                          ) : currentWorkspace.executionOutput ? (
                            <div className="space-y-1.5">
                              {currentWorkspace.executionOutput.stdout && (
                                <pre className="text-tealAccent-300 whitespace-pre-wrap bg-slate-950/80 p-2 rounded border border-slate-800 overflow-x-auto">
                                  {currentWorkspace.executionOutput.stdout}
                                </pre>
                              )}
                              {currentWorkspace.executionOutput.stderr && (
                                <pre className="text-rose-400 whitespace-pre-wrap bg-rose-950/40 p-2 rounded border border-rose-900/50 overflow-x-auto">
                                  {currentWorkspace.executionOutput.stderr}
                                </pre>
                              )}
                              {currentWorkspace.executionOutput.compilationError && (
                                <pre className="text-amber-400 whitespace-pre-wrap bg-amber-950/40 p-2 rounded border border-amber-900/50 overflow-x-auto">
                                  {currentWorkspace.executionOutput.compilationError}
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
                        summary={testSummaries[currentTask.id] || null}
                        isRunning={isTesting}
                        passPercent={testSummaries[currentTask.id] && testSummaries[currentTask.id].totalCount > 0 ? Math.round((testSummaries[currentTask.id].passedCount / testSummaries[currentTask.id].totalCount) * 100) : 0}
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}
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
