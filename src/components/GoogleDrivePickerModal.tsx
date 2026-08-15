'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCloud,
  faFolder,
  faFolderPlus,
  faFilePdf,
  faFileWord,
  faFilePowerpoint,
  faFileExcel,
  faFileArchive,
  faFileCode,
  faFileVideo,
  faFileImage,
  faFileAlt,
  faSearch,
  faUpload,
  faCheck,
  faCheckCircle,
  faArrowLeft,
  faExternalLinkAlt,
  faChevronRight,
  faHardDrive,
  faSpinner,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import {
  googleDriveService,
  GoogleDriveFile,
  GoogleDriveConfig,
} from '@/services/googleDriveService';

export interface SelectedDriveMaterial {
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeKb: number;
  mimeType: string;
}

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMaterials: (materials: SelectedDriveMaterial[]) => void;
  courseTitle?: string;
  allowMultiple?: boolean;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectMaterials,
  courseTitle,
  allowMultiple = true,
}) => {
  const [config, setConfig] = useState<GoogleDriveConfig>(googleDriveService.getConfig());
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');

  // Browse state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // New Folder state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files when folder or search changes
  const loadFiles = useCallback(async (folderId?: string | null, search?: string) => {
    setIsLoading(true);
    try {
      const data = await googleDriveService.fetchFiles(folderId, search);
      setFiles(data.files);
      setBreadcrumbs(data.breadcrumbs);
    } catch (e) {
      console.error('Failed to load Google Drive files:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const loadedConfig = googleDriveService.getConfig();
      setConfig(loadedConfig);
      setSelectedFileIds(new Set());
      setSearchQuery('');
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
      setUploadProgress(0);
      setIsUploading(false);
      loadFiles(currentFolderId);
    }
  }, [isOpen, currentFolderId, loadFiles]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles(currentFolderId, searchQuery);
  };

  const handleFolderClick = (folder: GoogleDriveFile) => {
    setCurrentFolderId(folder.id);
    setSelectedFileIds(new Set());
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (id: string) => {
    setCurrentFolderId(id);
    setSelectedFileIds(new Set());
    setSearchQuery('');
  };

  const toggleFileSelect = (file: GoogleDriveFile) => {
    if (file.isFolder) {
      handleFolderClick(file);
      return;
    }

    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(file.id)) {
        next.delete(file.id);
      } else {
        if (!allowMultiple) next.clear();
        next.add(file.id);
      }
      return next;
    });
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await googleDriveService.createFolder(newFolderName.trim(), currentFolderId || 'folder_root_educode');
      setNewFolderName('');
      setIsCreatingFolder(false);
      loadFiles(currentFolderId);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleAttachSelected = () => {
    const selectedFiles = files.filter((f) => selectedFileIds.has(f.id));
    if (selectedFiles.length === 0) return;

    const materials: SelectedDriveMaterial[] = selectedFiles.map((f) => ({
      title: f.name.replace(/\.[^/.]+$/, ''), // Clean title
      description: `Google Drive file: ${f.name} (${f.sizeFormatted})`,
      fileUrl: f.webViewLink,
      fileSizeKb: Math.max(1, Math.round(f.sizeBytes / 1024)),
      mimeType: f.mimeType,
    }));

    onSelectMaterials(materials);
    onClose();
  };

  // Upload handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setUploadFile(f);
      setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadFile(f);
      setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDirectUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const driveFile = await googleDriveService.uploadFile(
        uploadFile,
        currentFolderId || 'folder_root_educode',
        (pct) => setUploadProgress(pct)
      );

      const material: SelectedDriveMaterial = {
        title: uploadTitle.trim() || driveFile.name,
        description: uploadDesc.trim() || `Uploaded to Google Drive: ${driveFile.name}`,
        fileUrl: driveFile.webViewLink,
        fileSizeKb: Math.max(1, Math.round(driveFile.sizeBytes / 1024)),
        mimeType: driveFile.mimeType,
      };

      onSelectMaterials([material]);
      onClose();
    } catch (err) {
      console.error('Direct Drive upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (iconType: GoogleDriveFile['iconType']) => {
    switch (iconType) {
      case 'folder':
        return <FontAwesomeIcon icon={faFolder} className="text-amber-400" />;
      case 'pdf':
        return <FontAwesomeIcon icon={faFilePdf} className="text-rose-500" />;
      case 'doc':
        return <FontAwesomeIcon icon={faFileWord} className="text-blue-500" />;
      case 'slide':
        return <FontAwesomeIcon icon={faFilePowerpoint} className="text-amber-500" />;
      case 'sheet':
        return <FontAwesomeIcon icon={faFileExcel} className="text-emerald-500" />;
      case 'archive':
        return <FontAwesomeIcon icon={faFileArchive} className="text-purple-400" />;
      case 'code':
        return <FontAwesomeIcon icon={faFileCode} className="text-cyan-400" />;
      case 'video':
        return <FontAwesomeIcon icon={faFileVideo} className="text-red-400" />;
      case 'image':
        return <FontAwesomeIcon icon={faFileImage} className="text-teal-400" />;
      default:
        return <FontAwesomeIcon icon={faFileAlt} className="text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f131c] border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top Header */}
        <div className="p-4 md:px-6 bg-[#131926] border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-slate-700/80 flex items-center justify-center text-lg text-emerald-400">
              <FontAwesomeIcon icon={faCloud} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-white">Google Drive Resource Hub</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {config.connectedEmail}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {courseTitle ? `Attach material to ${courseTitle}` : 'Select or upload files to your Google Drive'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Mode Switcher */}
            <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'browse'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faFolder} className="mr-1.5" />
                <span>Browse Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'upload'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FontAwesomeIcon icon={faUpload} className="mr-1.5" />
                <span>Direct Upload</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </button>
          </div>
        </div>

        {/* Tab 1: Browse Drive Files */}
        {activeTab === 'browse' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Navigation Bar: Breadcrumbs & Search */}
            <div className="p-3 md:px-6 bg-[#111622] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Breadcrumb path */}
              <div className="flex items-center space-x-1.5 text-xs overflow-x-auto max-w-full py-1">
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={bc.id}>
                    {idx > 0 && <FontAwesomeIcon icon={faChevronRight} className="text-[9px] text-slate-600 mx-1" />}
                    <button
                      onClick={() => handleBreadcrumbClick(bc.id)}
                      className={`font-semibold transition-colors hover:text-emerald-400 whitespace-nowrap ${
                        idx === breadcrumbs.length - 1 ? 'text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      {bc.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Actions: Search & New Folder */}
              <div className="flex items-center space-x-2">
                <form onSubmit={handleSearch} className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-2.5 text-slate-500 text-xs" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in Drive..."
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-44 md:w-56"
                  />
                </form>

                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
                  title="New Folder on Drive"
                >
                  <FontAwesomeIcon icon={faFolderPlus} className="text-amber-400 text-xs" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>
              </div>
            </div>

            {/* New Folder Inline Form */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolderSubmit}
                className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-2 flex-1">
                  <FontAwesomeIcon icon={faFolder} className="text-amber-400 text-sm" />
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name (e.g. Lab 04 Graph Algorithms)..."
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none flex-1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Files & Folders List */}
            <div className="flex-1 overflow-y-auto p-4 md:px-6 space-y-2">
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <FontAwesomeIcon icon={faSpinner} className="text-2xl text-emerald-400 animate-spin" />
                  <span className="text-xs">Fetching Google Drive directory...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <FontAwesomeIcon icon={faFolder} className="text-3xl text-slate-600" />
                  <p className="text-xs font-bold text-slate-300">This folder is empty</p>
                  <p className="text-[11px] text-slate-500">
                    Switch to "Direct Upload" tab to upload materials or create a new folder.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {files.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleFileSelect(file)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/40'
                            : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Checkbox for files */}
                          {!file.isFolder ? (
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 font-black'
                                  : 'border border-slate-700 bg-slate-950'
                              }`}
                            >
                              {isSelected && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                            </div>
                          ) : (
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                              <FontAwesomeIcon icon={faFolder} className="text-amber-400 text-sm" />
                            </div>
                          )}

                          {/* File Icon */}
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sm shrink-0">
                            {getFileIcon(file.iconType)}
                          </div>

                          {/* Title & Metadata */}
                          <div className="min-w-0 truncate">
                            <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                              <span>{file.isFolder ? 'Folder' : file.sizeFormatted}</span>
                              <span>•</span>
                              <span>Modified {new Date(file.modifiedTime).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>

                        {/* Folder Action or External Link */}
                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                          {file.isFolder ? (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] text-slate-300 font-semibold flex items-center space-x-1">
                              <span>Open</span>
                              <FontAwesomeIcon icon={faChevronRight} className="text-[8px]" />
                            </span>
                          ) : (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                              title="Preview in Google Drive"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Footer Action Bar */}
            <div className="p-4 md:px-6 bg-[#131926] border-t border-slate-800 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-400">
                {selectedFileIds.size > 0 ? (
                  <span className="text-emerald-400 font-bold">
                    {selectedFileIds.size} file{selectedFileIds.size > 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span>Click files to select, or open folders to browse</span>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAttachSelected}
                  disabled={selectedFileIds.size === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-40 transition-all flex items-center space-x-1.5"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Attach Selected to Course</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Direct Upload to Google Drive */}
        {activeTab === 'upload' && (
          <form onSubmit={handleDirectUploadSubmit} className="flex-1 flex flex-col justify-between p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4 max-w-xl mx-auto w-full">
              {/* Destination folder indicator */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-300">
                  <FontAwesomeIcon icon={faFolder} className="text-amber-400" />
                  <span>Uploading to: <strong>{breadcrumbs[breadcrumbs.length - 1]?.name || config.rootFolderName}</strong></span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Shared with Class</span>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : uploadFile
                    ? 'border-emerald-500/60 bg-slate-900/60'
                    : 'border-slate-700 bg-slate-950/70 hover:border-slate-600'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xl shadow-inner">
                  <FontAwesomeIcon icon={faCloud} />
                </div>

                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">{uploadFile.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Drive upload</p>
                    <p className="text-[10px] text-emerald-400 font-semibold pt-1">Click or drop another file to replace</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">Drag & drop course document here, or browse files</p>
                    <p className="text-[11px] text-slate-500">Supports PDF, PPTX, DOCX, ZIP, MP4, Source Code up to 100MB</p>
                  </div>
                )}
              </div>

              {/* Material Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Course Material Title
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Lecture 04 - Graph Representations & Dijkstra"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description & Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="e.g. Read chapters 4-5 before next lab session..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Live Upload Progress */}
              {isUploading && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400">Uploading to Google Drive...</span>
                    <span className="font-mono font-bold text-white">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Upload Footer */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 max-w-xl mx-auto w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!uploadFile || isUploading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all flex items-center space-x-2"
              >
                <FontAwesomeIcon icon={isUploading ? faSpinner : faCloud} className={isUploading ? 'animate-spin' : ''} />
                <span>{isUploading ? 'Uploading to Drive...' : 'Upload & Attach Material'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
