'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faTerminal,
  faGear,
  faExpand,
  faCompress,
  faFolderPlus,
  faFileCode,
  faTimes,
  faPlus,
  faFolderOpen,
  faCube,
  faCode,
  faFloppyDisk,
  faRotateLeft,
  faCheck,
  faFlask,
  faVial,
  faRotateRight,
  faWindowMaximize,
  faWindowRestore,
} from '@fortawesome/free-solid-svg-icons';
import FileExplorer, { WorkspaceFile } from '@/components/FileExplorer';
import JavaPackageModal from '@/components/JavaPackageModal';
import IDESettingsModal, { DEFAULT_SETTINGS, IDESettings } from '@/components/IDESettingsModal';
import { PRESET_THEMES } from '@/components/themes';
import { saveCodeDraft, loadCodeDraft, clearCodeDraft } from '@/utils/draftStorage';
import {
  TestCaseInput,
  TestCaseResult,
  TestSuiteSummary,
  runAllTestCases,
} from '@/utils/testCaseRunner';
import TestCaseRunnerPanel from '@/components/TestCaseRunnerPanel';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const XtermTerminal = dynamic(() => import('@/components/XtermTerminal'), { ssr: false });

interface Task {
  id: string;
  title: string;
  description?: string | null;
  language: string;
  templateCode?: string | null;
  testCases?: TestCaseInput[];
  maxPoints?: number;
  [key: string]: any;
}

interface TeacherTaskIDEProps {
  task: Task;
}

export default function TeacherTaskIDE({ task }: TeacherTaskIDEProps) {
  const [ideSettings, setIdeSettings] = useState<IDESettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJavaPackageModalOpen, setIsJavaPackageModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState('');

  // Fullscreen states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const ideRootRef = useRef<HTMLDivElement>(null);

  // Draft saving states
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Layout states
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isBottomOpen, setIsBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'testcases'>('testcases');
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isBottomMaximized, setIsBottomMaximized] = useState(false);
  const [isTerminalResizing, setIsTerminalResizing] = useState(false);

  // Test Case Evaluation States
  const [testCases, setTestCases] = useState<TestCaseInput[]>([]);
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  const [leftWidthPercent, setLeftWidthPercent] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Workspace states
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [openTabPaths, setOpenTabPaths] = useState<string[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Load defaults or existing draft on mount / task change
  useEffect(() => {
    if (!task) return;

    // Try loading existing saved draft first
    const savedDraft = loadCodeDraft(task.id);
    if (savedDraft && Array.isArray(savedDraft.files) && savedDraft.files.length > 0) {
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
      const defaultFiles = getDefaultFilesForLanguage(task.language);
      setWorkspaceFiles(defaultFiles);
      setOpenTabPaths([defaultFiles[0].path]);
      setActiveFilePath(defaultFiles[0].path);
      setCode(defaultFiles[0].content);
      setDraftStatus('idle');
      setLastSavedTime(null);
    }

    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        setIdeSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load IDE settings:', e);
    }
  }, [task]);

  // Initialize test cases from task or realistic defaults
  useEffect(() => {
    if (task?.testCases && task.testCases.length > 0) {
      setTestCases(task.testCases);
    } else {
      setTestCases([
        { id: '1', order: 1, inputData: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', points: 25, isHidden: false },
        { id: '2', order: 2, inputData: '3\n10 20 30', expectedOutput: '30 20 10', points: 25, isHidden: false },
        { id: '3', order: 3, inputData: '1\n99', expectedOutput: '99', points: 25, isHidden: true },
        { id: '4', order: 4, inputData: '4\n2 4 6 8', expectedOutput: '8 6 4 2', points: 25, isHidden: true },
      ]);
    }
  }, [task?.testCases]);

  // Auto-save draft whenever files, code, or tabs change
  useEffect(() => {
    if (!task?.id || workspaceFiles.length === 0) return;

    setDraftStatus('saving');
    const timer = setTimeout(() => {
      const saved = saveCodeDraft(task.id, {
        language: task.language,
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
  }, [task?.id, task?.language, workspaceFiles, openTabPaths, activeFilePath, code]);

  const handleManualSaveDraft = () => {
    if (!task?.id || workspaceFiles.length === 0) return;
    setDraftStatus('saving');
    const saved = saveCodeDraft(task.id, {
      language: task.language,
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

  const handleResetToTemplate = () => {
    if (!confirm('Are you sure you want to reset your workspace to the starter boilerplate? Any unsaved edits will be replaced.')) {
      return;
    }
    clearCodeDraft(task.id);
    const defaultFiles = getDefaultFilesForLanguage(task.language);
    setWorkspaceFiles(defaultFiles);
    setOpenTabPaths([defaultFiles[0].path]);
    setActiveFilePath(defaultFiles[0].path);
    setCode(defaultFiles[0].content);
    setDraftStatus('idle');
    setLastSavedTime(null);
  };

  const getDefaultFilesForLanguage = (lang: string): WorkspaceFile[] => {
    lang = lang.toLowerCase();
    if (lang === 'java') {
      return [{ id: '1', path: 'Solution.java', content: `public class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, EduCode!");\n    }\n}` }];
    }
    if (lang === 'python') {
      return [{ id: '1', path: 'solution.py', content: `def solve():\n    print("Hello, EduCode!")\n\nif __name__ == "__main__":\n    solve()\n` }];
    }
    if (lang === 'c') {
      return [{ id: '1', path: 'solution.c', content: `#include <stdio.h>\n\nint main() {\n    printf("Hello, EduCode!\\n");\n    return 0;\n}` }];
    }
    return [{ id: '1', path: 'solution.cpp', content: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, EduCode!" << endl;\n    return 0;\n}` }];
  };

  const handleSaveSettings = (newSettings: IDESettings) => {
    setIdeSettings(newSettings);
    try {
      localStorage.setItem('educode_ide_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    PRESET_THEMES.forEach((t) => monaco.editor.defineTheme(t.id, t.data));
    if (ideSettings.customThemes) {
      Object.entries(ideSettings.customThemes).forEach(([id, t]) => {
        monaco.editor.defineTheme(id, t.data);
      });
    }
  };

  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode || '';
    setCode(val);
    setWorkspaceFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: val } : f));
  };

  const handleSelectFile = (path: string) => {
    const file = workspaceFiles.find(f => f.path === path);
    if (!file || file.isFolder) return;
    if (!openTabPaths.includes(path)) {
      setOpenTabPaths([...openTabPaths, path]);
    }
    setActiveFilePath(path);
    setCode(file.content);
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = openTabPaths.filter(p => p !== path);
    let nextActive = activeFilePath;
    let nextCode = code;

    if (activeFilePath === path) {
      if (updated.length > 0) {
        nextActive = updated[updated.length - 1];
        const f = workspaceFiles.find(file => file.path === nextActive);
        if (f) nextCode = f.content;
      } else {
        nextActive = '';
        nextCode = '';
      }
    }
    setOpenTabPaths(updated);
    setActiveFilePath(nextActive);
    setCode(nextCode);
  };

  const handleCreateFile = (pathName: string, content = '') => {
    if (workspaceFiles.some((f) => f.path === pathName)) return;
    const newFile: WorkspaceFile = { id: Math.random().toString(), path: pathName, content };
    setWorkspaceFiles([...workspaceFiles, newFile]);
    if (!openTabPaths.includes(pathName)) {
      setOpenTabPaths([...openTabPaths, pathName]);
    }
    setActiveFilePath(pathName);
    setCode(content);
  };

  const handleCreateFolder = (folderPath: string) => {
    if (workspaceFiles.some((f) => f.path === folderPath)) return;
    const newFolder: WorkspaceFile = { id: Math.random().toString(), path: folderPath, content: '', isFolder: true };
    setWorkspaceFiles([...workspaceFiles, newFolder]);
  };

  const handleDeletePath = (targetPath: string) => {
    const updatedFiles = workspaceFiles.filter((f) => f.path !== targetPath && !f.path.startsWith(targetPath + '/'));
    const updatedTabs = openTabPaths.filter((p) => p !== targetPath && !p.startsWith(targetPath + '/'));
    
    let nextActive = activeFilePath;
    let nextCode = code;

    if (activeFilePath === targetPath || activeFilePath.startsWith(targetPath + '/')) {
      nextActive = '';
      nextCode = '';
    }

    setWorkspaceFiles(updatedFiles);
    setOpenTabPaths(updatedTabs);
    setActiveFilePath(nextActive);
    setCode(nextCode);
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setIsBottomOpen(true);
    setBottomTab('terminal');
    try {
      if (typeof window !== 'undefined' && (window as any).educode?.pty) {
        await (window as any).educode.pty.runCode({
          code: code,
          language: task.language,
          files: workspaceFiles,
          activeFilePath: activeFilePath,
        });
      } else {
        console.warn('educode.pty is not available. Please run inside the electron app.');
      }
    } catch (err) {
      console.error('PTY Code Runner error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Run All Automated Evaluation Test Cases
  const handleRunAllTests = async () => {
    if (isTesting || testCases.length === 0) return;
    setIsTesting(true);
    setIsBottomOpen(true);
    setBottomTab('testcases');

    try {
      const summary = await runAllTestCases(
        testCases,
        code,
        task.language,
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

  // Fullscreen support
  const toggleFullScreen = useCallback(() => {
    if (!isFullScreen) {
      setIsFullScreen(true);
      if (ideRootRef.current?.requestFullscreen && !document.fullscreenElement) {
        ideRootRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullScreen(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullScreen]);

  // Keyboard shortcut listener for F11 and Escape, and fullscreenchange sync
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
      } else if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullScreen, toggleFullScreen]);

  // Layout Resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    if (percentage >= 15 && percentage <= 50) {
      setLeftWidthPercent(percentage);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

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
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isTerminalResizing) return;
    const handleMouseMoveTerminal = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      // Allow resizing up to rect.height - 36px (100% of editor workspace)
      const maxHeight = Math.max(100, rect.height - 36);
      const clampedHeight = Math.max(60, Math.min(maxHeight, newHeight));
      setTerminalHeight(clampedHeight);
      setIsBottomMaximized(clampedHeight >= maxHeight - 10);
    };
    const handleMouseUpTerminal = () => setIsTerminalResizing(false);
    window.addEventListener('mousemove', handleMouseMoveTerminal);
    window.addEventListener('mouseup', handleMouseUpTerminal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveTerminal);
      window.removeEventListener('mouseup', handleMouseUpTerminal);
    };
  }, [isTerminalResizing]);

  const toggleMaximizeBottom = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxHeight = Math.max(100, rect.height - 36);
    if (isBottomMaximized) {
      setTerminalHeight(260);
      setIsBottomMaximized(false);
    } else {
      setTerminalHeight(maxHeight);
      setIsBottomMaximized(true);
    }
  }, [isBottomMaximized]);

  return (
    <div 
      ref={ideRootRef}
      className={`flex flex-col bg-[#1e1e1e] border-slate-800 overflow-hidden relative select-none ${
        isFullScreen ? 'fixed inset-0 z-50 w-screen h-screen rounded-none' : 'h-full rounded-lg'
      }`}
    >
      {/* Top IDE Toolbar */}
      <div className="h-12 bg-[#12141a] border-b border-slate-800/90 px-3 flex items-center justify-between gap-3 shrink-0">
        {/* Left Section: Environment Title & File Management */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="font-bold text-white text-xs tracking-tight">Teacher Testing Lab</span>
            <span className="px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-400 border border-brand-500/30 text-[10px] uppercase font-bold tracking-wider">
              {task.language}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Toggle File Explorer */}
          <button
            onClick={() => setIsExplorerOpen(!isExplorerOpen)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border shrink-0 ${
              isExplorerOpen
                ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title={isExplorerOpen ? 'Hide File Explorer' : 'Show File Explorer'}
          >
            <FontAwesomeIcon icon={faFolderOpen} className={isExplorerOpen ? 'text-blue-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">Explorer</span>
          </button>

          {/* Quick New File */}
          <button
            onClick={() => {
              const ext = task.language.toLowerCase() === 'java' ? '.java' : task.language.toLowerCase() === 'python' ? '.py' : task.language.toLowerCase() === 'c' ? '.c' : '.cpp';
              setNewFileNameInput(`file_${workspaceFiles.length + 1}${ext}`);
              setIsNewFileModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-700 shrink-0"
            title="Create New File"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px] text-emerald-400" />
            <span className="hidden sm:inline">New File</span>
          </button>

          {/* Java Package Wizard */}
          {task.language.toLowerCase() === 'java' && (
            <button
              onClick={() => setIsJavaPackageModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center space-x-1.5 transition-all border border-amber-500/30 shrink-0"
              title="NetBeans Java Package Wizard"
            >
              <FontAwesomeIcon icon={faCube} className="text-[10px]" />
              <span className="hidden md:inline">Package</span>
            </button>
          )}
        </div>

        {/* Center Section: Draft Controls & Subtle Live Status */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleManualSaveDraft}
            title="Save code draft locally so you can resume later"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-700 shrink-0"
          >
            <FontAwesomeIcon icon={faFloppyDisk} className="text-[11px] text-emerald-400" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handleResetToTemplate}
            title="Reset code to original starter template"
            className="p-1.5 w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-300 transition-all flex items-center justify-center shrink-0"
          >
            <FontAwesomeIcon icon={faRotateLeft} className="text-[11px]" />
          </button>

          {/* Live Draft Saved Pill */}
          {lastSavedTime && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap shrink-0">
              <span className={`w-2 h-2 rounded-full ${draftStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="font-mono text-[11px]">{draftStatus === 'saving' ? 'Saving...' : `Draft saved (${lastSavedTime})`}</span>
            </div>
          )}
        </div>

        {/* Right Section: Settings, Fullscreen, Panel Toggles, & Action Execution */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="IDE Settings"
            className="p-1.5 w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center shrink-0"
          >
            <FontAwesomeIcon icon={faGear} className="text-xs" />
          </button>

          {/* Full Screen Toggle Button */}
          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen (F11 / Esc)' : 'Full Screen IDE (F11)'}
            className={`p-1.5 w-7 h-7 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all shrink-0 ${
              isFullScreen
                ? 'bg-brand-500/20 border-brand-500/50 text-brand-400 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="text-xs" />
          </button>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Toggle Tests Panel */}
          <button
            onClick={() => {
              if (isBottomOpen && bottomTab === 'testcases') {
                setIsBottomOpen(false);
              } else {
                setIsBottomOpen(true);
                setBottomTab('testcases');
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border shrink-0 ${
              isBottomOpen && bottomTab === 'testcases'
                ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="Toggle Test Case Evaluation Panel"
          >
            <FontAwesomeIcon icon={faFlask} className={isBottomOpen && bottomTab === 'testcases' ? 'text-brand-400' : 'text-slate-400'} />
            <span>Tests</span>
            {testSummary && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  testSummary.passedCount === testSummary.totalCount
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {testSummary.passedCount}/{testSummary.totalCount}
              </span>
            )}
          </button>

          {/* Toggle Terminal Panel */}
          <button
            onClick={() => {
              if (isBottomOpen && bottomTab === 'terminal') {
                setIsBottomOpen(false);
              } else {
                setIsBottomOpen(true);
                setBottomTab('terminal');
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border shrink-0 ${
              isBottomOpen && bottomTab === 'terminal'
                ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="Toggle Integrated Terminal"
          >
            <FontAwesomeIcon icon={faTerminal} className={isBottomOpen && bottomTab === 'terminal' ? 'text-emerald-400' : 'text-slate-400'} />
            <span className="hidden sm:inline">Terminal</span>
          </button>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Run All Test Cases Button */}
          <button
            onClick={handleRunAllTests}
            disabled={isTesting || testCases.length === 0}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all disabled:opacity-50 shrink-0"
            title="Run all automated test cases and see results"
          >
            <FontAwesomeIcon
              icon={isTesting ? faRotateRight : faFlask}
              className={`text-[10px] ${isTesting ? 'animate-spin' : ''}`}
            />
            <span className="whitespace-nowrap">{isTesting ? 'Testing...' : `Run Tests (${testCases.length})`}</span>
          </button>

          {/* Run Interactive Single Execution */}
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50 shrink-0"
            title="Run active file in interactive terminal"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: File Explorer */}
        {isExplorerOpen && (
          <div style={{ width: `${leftWidthPercent}%` }} className="border-r border-slate-800 flex flex-col bg-[#181818] shrink-0">
            <FileExplorer
              files={workspaceFiles}
              activeFilePath={activeFilePath}
              language={task.language.toLowerCase() as any}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeletePath={handleDeletePath}
              onOpenJavaPackageModal={() => setIsJavaPackageModalOpen(true)}
            />
          </div>
        )}

        {/* Resizable Divider */}
        {isExplorerOpen && (
          <div
            className={`w-1 bg-slate-800 hover:bg-brand-500 cursor-col-resize shrink-0 transition-colors ${
              isDragging ? 'bg-brand-500' : ''
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
          />
        )}

        {/* Center: Monaco Editor & Output Drawer */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] overflow-hidden">
          {/* Editor Tab Bar */}
          <div className="h-9 bg-[#1e1e1e] border-b border-slate-800 flex items-center justify-between px-2 overflow-x-auto select-none no-scrollbar">
            <div className="flex items-center space-x-1">
              {openTabPaths.map((tabPath) => {
                const file = workspaceFiles.find((f) => f.path === tabPath);
                const isActive = activeFilePath === tabPath;
                return (
                  <div
                    key={tabPath}
                    onClick={() => handleSelectFile(tabPath)}
                    className={`group px-3 py-1.5 rounded-t-md text-xs font-mono flex items-center space-x-2 cursor-pointer border-t-2 transition-all ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white border-brand-500 font-medium'
                        : 'bg-[#181818] text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faFileCode}
                      className={
                        tabPath.endsWith('.java')
                          ? 'text-orange-400'
                          : tabPath.endsWith('.py')
                          ? 'text-yellow-400'
                          : tabPath.endsWith('.c')
                          ? 'text-blue-400'
                          : 'text-indigo-400'
                      }
                    />
                    <span className="truncate max-w-[120px]">{tabPath.split('/').pop()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tabPath, e);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity ml-1"
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                const ext = task.language.toLowerCase() === 'java' ? '.java' : task.language.toLowerCase() === 'python' ? '.py' : task.language.toLowerCase() === 'c' ? '.c' : '.cpp';
                setNewFileNameInput(`file_${workspaceFiles.length + 1}${ext}`);
                setIsNewFileModalOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Add File"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
            </button>
          </div>

          {/* Main Editor Surface + Output Panels */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {activeFilePath ? (
              <div className="flex-1 overflow-hidden relative">
                <Editor
                  height="100%"
                  language={
                    task.language.toLowerCase() === 'python' ? 'python' :
                    task.language.toLowerCase() === 'java' ? 'java' :
                    task.language.toLowerCase() === 'c' ? 'c' : 'cpp'
                  }
                  theme={ideSettings.theme}
                  value={code}
                  onChange={handleCodeChange}
                  beforeMount={handleEditorWillMount}
                  options={{
                    fontSize: ideSettings.fontSize,
                    fontFamily: ideSettings.fontFamily,
                    minimap: { enabled: ideSettings.minimap },
                    wordWrap: ideSettings.wordWrap,
                    formatOnPaste: true,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
                <FontAwesomeIcon icon={faFileCode} className="text-4xl text-slate-700" />
                <p className="text-sm text-slate-400">No file is currently active</p>
                <button
                  onClick={() => {
                    const ext = task.language.toLowerCase() === 'java' ? '.java' : task.language.toLowerCase() === 'python' ? '.py' : task.language.toLowerCase() === 'c' ? '.c' : '.cpp';
                    setNewFileNameInput(`Solution${ext}`);
                    setIsNewFileModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>Create New File</span>
                </button>
              </div>
            )}

            {/* Bottom Drawer: Terminal & Test Runner Tabs */}
            {isBottomOpen && (
              <div 
                className="border-t border-slate-800 bg-[#1e1e1e] flex flex-col z-20 shrink-0 relative transition-[height] duration-75"
                style={{ height: terminalHeight }}
              >
                {/* Enhanced 100% Height Resizing Handle with indicator */}
                <div 
                  className="absolute -top-1 left-0 right-0 h-3 cursor-row-resize hover:bg-brand-500/50 active:bg-brand-500 z-30 flex items-center justify-center group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsTerminalResizing(true);
                  }}
                  onDoubleClick={toggleMaximizeBottom}
                  title="Drag to resize up to 100% or double-click to toggle maximize"
                >
                  <div className="w-12 h-1 rounded-full bg-slate-600 group-hover:bg-brand-400 group-active:bg-brand-400 transition-colors" />
                </div>
                
                {/* Bottom Panel Navigation Header */}
                <div 
                  className="h-8 bg-[#252526] flex items-center px-4 shrink-0 justify-between border-b border-slate-800 select-none"
                  onDoubleClick={toggleMaximizeBottom}
                >
                  <div className="flex items-center space-x-2 text-xs font-semibold">
                    <button
                      onClick={() => setBottomTab('testcases')}
                      className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition-colors ${
                        bottomTab === 'testcases'
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faFlask} className="text-brand-400 text-[10px]" />
                      <span>Test Cases ({testCases.length})</span>
                      {testSummary && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                            testSummary.passedCount === testSummary.totalCount
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {testSummary.passedCount}/{testSummary.totalCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setBottomTab('terminal')}
                      className={`px-2.5 py-1 rounded flex items-center space-x-1.5 transition-colors ${
                        bottomTab === 'terminal'
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faTerminal} className="text-emerald-400 text-[10px]" />
                      <span>Terminal</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Maximize to 100% / Restore Button */}
                    <button
                      onClick={toggleMaximizeBottom}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors text-xs"
                      title={isBottomMaximized ? "Restore Panel Height" : "Maximize Panel to 100%"}
                    >
                      <FontAwesomeIcon icon={isBottomMaximized ? faWindowRestore : faWindowMaximize} />
                    </button>

                    <button
                      onClick={() => setIsBottomOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/80 transition-colors text-xs"
                      title="Hide Bottom Panel"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  {bottomTab === 'testcases' ? (
                    <TestCaseRunnerPanel
                      testCases={testCases}
                      summary={testSummary}
                      isRunning={isTesting}
                      onRunAll={handleRunAllTests}
                      onAddCustomTestCase={handleAddCustomTestCase}
                    />
                  ) : (
                    <XtermTerminal />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <IDESettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={ideSettings}
        onSaveSettings={handleSaveSettings}
        onRegisterCustomTheme={(themeId: string, themeName: string, themeData: editor.IStandaloneThemeData) => {
          if (monacoRef.current) {
            monacoRef.current.editor.defineTheme(themeId, themeData);
            monacoRef.current.editor.setTheme(themeId);
          }
        }}
      />

      <JavaPackageModal
        isOpen={isJavaPackageModalOpen}
        onClose={() => setIsJavaPackageModalOpen(false)}
        onCreate={(pkg, cls, type, main) => {
          const folderPath = pkg ? pkg.replace(/\./g, '/') : '';
          const filePath = folderPath ? `${folderPath}/${cls}.java` : `${cls}.java`;
          let generatedCode = '';
          if (pkg) generatedCode += `package ${pkg};\n\n`;
          generatedCode += `public ${type} ${cls} {\n`;
          if (main && type === 'class') {
             generatedCode += `    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n`;
          }
          generatedCode += `}\n`;
          handleCreateFile(filePath, generatedCode);
        }}
      />

      {/* New File Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">
                  <FontAwesomeIcon icon={faPlus} />
                </div>
                <h3 className="text-base font-bold text-white">Create New File</h3>
              </div>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newFileNameInput.trim()) {
                  handleCreateFile(newFileNameInput.trim());
                  setIsNewFileModalOpen(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  File Name or Path (e.g. Solution{task.language.toLowerCase() === 'java' ? '.java' : task.language.toLowerCase() === 'python' ? '.py' : task.language.toLowerCase() === 'c' ? '.c' : '.cpp'})
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  placeholder={`e.g. Solution${task.language.toLowerCase() === 'java' ? '.java' : task.language.toLowerCase() === 'python' ? '.py' : task.language.toLowerCase() === 'c' ? '.c' : '.cpp'}`}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFileNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all"
                >
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}