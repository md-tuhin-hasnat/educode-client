'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFolder,
  faFolderOpen,
  faFileCode,
  faPlus,
  faFolderPlus,
  faTrash,
  faCube,
  faChevronDown,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export interface WorkspaceFile {
  id: string;
  path: string; // e.g. "Main.java" or "com/educode/model/Student.java"
  content: string;
  isFolder?: boolean;
}

interface FileExplorerProps {
  files: WorkspaceFile[];
  activeFilePath: string;
  language: 'cpp' | 'python' | 'java' | 'c';
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string, content?: string) => void;
  onCreateFolder: (path: string) => void;
  onDeletePath: (path: string) => void;
  onOpenJavaPackageModal?: () => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: WorkspaceFile;
  children: FileTreeNode[];
}

export default function FileExplorer({
  files,
  activeFilePath,
  language,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeletePath,
  onOpenJavaPackageModal,
}: FileExplorerProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [newFileInputPath, setNewFileInputPath] = useState<string | null>(null);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  // Build tree from file paths
  const buildTree = (): FileTreeNode[] => {
    const rootNodes: FileTreeNode[] = [];

    // Helper to find or create child node
    const getOrCreateChild = (nodes: FileTreeNode[], name: string, path: string, isFolder: boolean) => {
      let existing = nodes.find((n) => n.name === name && n.isFolder === isFolder);
      if (!existing) {
        existing = { name, path, isFolder, children: [] };
        nodes.push(existing);
      }
      return existing;
    };

    files.forEach((file) => {
      const parts = file.path.split('/').filter(Boolean);
      let currentLevel = rootNodes;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (isLast && !file.isFolder) {
          // File node
          currentLevel.push({
            name: part,
            path: file.path,
            isFolder: false,
            file,
            children: [],
          });
        } else {
          // Folder node
          const folderNode = getOrCreateChild(currentLevel, part, currentPath, true);
          currentLevel = folderNode.children;
        }
      }
    });

    // Sort folders first, then files alphabetically
    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((n) => sortNodes(n.children));
    };

    sortNodes(rootNodes);
    return rootNodes;
  };

  const tree = buildTree();

  const handleCreateFileSubmit = (e: React.FormEvent, parentDir = '') => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const finalPath = parentDir ? `${parentDir}/${newFileName.trim()}` : newFileName.trim();
    onCreateFile(finalPath);
    setNewFileName('');
    setNewFileInputPath(null);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent, parentDir = '') => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const finalPath = parentDir ? `${parentDir}/${newFileName.trim()}` : newFileName.trim();
    onCreateFolder(finalPath);
    setNewFileName('');
    setNewFolderNameInput(null);
  };

  const renderTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const isCollapsed = collapsedFolders[node.path];

      if (node.isFolder) {
        return (
          <div key={node.path} className="select-none">
            <div
              onClick={() => toggleFolder(node.path)}
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
              className="flex items-center justify-between py-1 px-2 text-xs font-medium text-gray-300 hover:bg-[#2a2a3c] rounded cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FontAwesomeIcon
                  icon={isCollapsed ? faChevronRight : faChevronDown}
                  className="text-[10px] text-gray-500 w-3"
                />
                <FontAwesomeIcon
                  icon={isCollapsed ? faFolder : faFolderOpen}
                  className="text-amber-400 text-xs"
                />
                <span className="truncate">{node.name}</span>
              </div>

              {/* Quick actions for folder */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                <button
                  title="New File in Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewFolderNameInput(null);
                    setNewFileInputPath(node.path);
                  }}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-700/60 rounded"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                </button>
                <button
                  title="Delete Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePath(node.path);
                  }}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/60 rounded"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                </button>
              </div>
            </div>

            {/* Inline new file inside folder */}
            {newFileInputPath === node.path && (
              <form
                onSubmit={(e) => handleCreateFileSubmit(e, node.path)}
                style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
                className="py-1 px-2"
              >
                <input
                  type="text"
                  autoFocus
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => setNewFileInputPath(null)}
                  placeholder="File name..."
                  className="w-full bg-[#11111b] border border-blue-500/60 rounded px-2 py-0.5 text-xs text-white outline-none font-mono"
                />
              </form>
            )}

            {/* Render children */}
            {!isCollapsed && node.children.length > 0 && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      // File node
      const isActive = node.path === activeFilePath;
      return (
        <div
          key={node.path}
          onClick={() => onSelectFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          className={`flex items-center justify-between py-1 px-2 text-xs font-mono rounded cursor-pointer group transition-colors select-none ${
            isActive
              ? 'bg-blue-600/20 text-blue-300 font-semibold border-l-2 border-blue-500'
              : 'text-gray-300 hover:bg-[#2a2a3c] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <FontAwesomeIcon icon={faFileCode} className={isActive ? 'text-blue-400' : 'text-blue-400/70'} />
            <span className="truncate">{node.name}</span>
          </div>

          {/* Delete action for file */}
          <button
            title="Delete File"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePath(node.path);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-opacity"
          >
            <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
          </button>
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#181825] border-r border-gray-800 text-gray-300">
      {/* Header with Title & Quick Action Toolbar */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-[#11111b]">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Explorer</span>
        <div className="flex items-center gap-1">
          {/* NetBeans Java Package Helper Button */}
          {language === 'java' && onOpenJavaPackageModal && (
            <button
              onClick={onOpenJavaPackageModal}
              title="NetBeans Java Package Helper"
              className="px-2 py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-[11px] font-medium rounded flex items-center gap-1 transition-all"
            >
              <FontAwesomeIcon icon={faCube} className="text-[10px]" />
              <span>Package</span>
            </button>
          )}

          {/* Add File */}
          <button
            onClick={() => {
              setNewFolderNameInput(null);
              setNewFileInputPath('');
            }}
            title="New File"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>

          {/* Add Folder */}
          <button
            onClick={() => {
              setNewFileInputPath(null);
              setNewFolderNameInput('');
            }}
            title="New Folder"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <FontAwesomeIcon icon={faFolderPlus} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Root new file input */}
      {newFileInputPath === '' && (
        <form onSubmit={(e) => handleCreateFileSubmit(e, '')} className="p-2 bg-[#1e1e2e]">
          <input
            type="text"
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => setNewFileInputPath(null)}
            placeholder="New file path (e.g. model.py)..."
            className="w-full bg-[#11111b] border border-blue-500/60 rounded px-2 py-1 text-xs text-white outline-none font-mono"
          />
        </form>
      )}

      {/* Root new folder input */}
      {newFolderNameInput === '' && (
        <form onSubmit={(e) => handleCreateFolderSubmit(e, '')} className="p-2 bg-[#1e1e2e]">
          <input
            type="text"
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => setNewFolderNameInput(null)}
            placeholder="New folder name..."
            className="w-full bg-[#11111b] border border-amber-500/60 rounded px-2 py-1 text-xs text-white outline-none font-mono"
          />
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">No workspace files found</div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
}
