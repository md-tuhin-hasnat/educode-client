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
  faFileCode
} from '@fortawesome/free-solid-svg-icons';
import FileExplorer, { WorkspaceFile } from '@/components/FileExplorer';
import JavaPackageModal from '@/components/JavaPackageModal';
import IDESettingsModal, { DEFAULT_SETTINGS, IDESettings } from '@/components/IDESettingsModal';
import { PRESET_THEMES } from '@/components/themes';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const XtermTerminal = dynamic(() => import('@/components/XtermTerminal'), { ssr: false });

interface Task {
  id: string;
  title: string;
  taskType: string;
  language: string;
  allowMultiFile: boolean;
  // ... other properties
}

interface TeacherTaskIDEProps {
  task: Task;
}

export default function TeacherTaskIDE({ task }: TeacherTaskIDEProps) {
  const [ideSettings, setIdeSettings] = useState<IDESettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isJavaPackageModalOpen, setIsJavaPackageModalOpen] = useState(false);

  // Layout states
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [isTerminalResizing, setIsTerminalResizing] = useState(false);
  
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

  // Load defaults
  useEffect(() => {
    const defaultFiles = getDefaultFilesForLanguage(task.language);
    setWorkspaceFiles(defaultFiles);
    setOpenTabPaths([defaultFiles[0].path]);
    setActiveFilePath(defaultFiles[0].path);
    setCode(defaultFiles[0].content);

    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        setIdeSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load IDE settings:', e);
    }
  }, [task]);

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
    setIsTerminalOpen(true);
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
      setTerminalHeight(Math.max(100, Math.min(500, newHeight)));
    };
    const handleMouseUpTerminal = () => setIsTerminalResizing(false);
    window.addEventListener('mousemove', handleMouseMoveTerminal);
    window.addEventListener('mouseup', handleMouseUpTerminal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveTerminal);
      window.removeEventListener('mouseup', handleMouseUpTerminal);
    };
  }, [isTerminalResizing]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-slate-800 rounded-lg overflow-hidden relative">
      {/* Top IDE Toolbar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 text-sm text-slate-300">
          <span className="font-semibold text-white">Teacher Testing Environment</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="IDE Settings"
            className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${isTerminalOpen ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-900/80 text-slate-400 border-slate-800'}`}
          >
            <FontAwesomeIcon icon={faTerminal} className={isTerminalOpen ? 'text-emerald-400' : 'text-slate-400'} />
            <span>Terminal</span>
          </button>
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: File Explorer */}
        {task.allowMultiFile && (
          <div style={{ width: `${leftWidthPercent}%` }} className="border-r border-slate-800 flex flex-col bg-[#181818] shrink-0">
            <FileExplorer
              files={workspaceFiles}
              activeFilePath={activeFilePath}
              language={task.language.toLowerCase() as any}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeletePath={handleDeletePath}
              openJavaPackageModal={() => setIsJavaPackageModalOpen(true)}
            />
          </div>
        )}

        {/* Resizer */}
        {task.allowMultiFile && (
          <div
            className="w-1 cursor-col-resize hover:bg-brand-500/50 bg-slate-800 shrink-0 z-10 transition-colors"
            onMouseDown={() => setIsDragging(true)}
          />
        )}

        {/* Right Side: Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tabs */}
          <div className="h-9 bg-[#252526] flex items-center overflow-x-auto overflow-y-hidden shrink-0 custom-scrollbar border-b border-slate-800">
            {openTabPaths.length === 0 && (
              <div className="px-4 text-xs text-slate-500 italic">No files open</div>
            )}
            {openTabPaths.map((path) => (
              <div
                key={path}
                onClick={() => handleSelectFile(path)}
                className={`group flex items-center h-full px-3 text-xs border-r border-slate-800 cursor-pointer min-w-max transition-colors ${
                  activeFilePath === path ? 'bg-[#1e1e1e] text-emerald-400 border-t-2 border-t-emerald-500' : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#2a2a2b] border-t-2 border-t-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faFileCode} className="mr-2 opacity-70" />
                <span>{path.split('/').pop()}</span>
                <button
                  onClick={(e) => handleCloseTab(path, e)}
                  className={`ml-2 w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center ${
                    activeFilePath === path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </div>
            ))}
          </div>

          {/* Editor Container */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {activeFilePath ? (
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
                  formatOnPaste: ideSettings.formatOnPaste,
                  lineNumbers: ideSettings.lineNumbers ? 'on' : 'off',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Select a file to edit
              </div>
            )}

            {/* Terminal Area */}
            {isTerminalOpen && (
              <div 
                className="border-t border-slate-800 bg-[#1e1e1e] flex flex-col z-20 shrink-0 relative"
                style={{ height: terminalHeight }}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-brand-500/50 z-30"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsTerminalResizing(true);
                  }}
                />
                <div className="h-8 bg-[#252526] flex items-center px-4 shrink-0 justify-between">
                  <div className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                    <FontAwesomeIcon icon={faTerminal} />
                    <span>Terminal output</span>
                  </div>
                  <button
                    onClick={() => setIsTerminalOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <XtermTerminal />
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
        onSave={handleSaveSettings}
        onRegisterTheme={(themeId, themeName, themeData) => {
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
    </div>
  );
}
