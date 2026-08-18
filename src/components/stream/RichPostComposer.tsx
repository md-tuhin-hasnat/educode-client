'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WordMarkdownEditor } from './WordMarkdownEditor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faPaperclip,
  faPlus,
  faTrash,
  faFileCode,
  faCloud,
  faCheckCircle,
  faSpinner,
  faUndo,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';
import { GoogleDrivePickerModal, SelectedDriveMaterial } from '@/components/GoogleDrivePickerModal';
import { CourseTaskItem } from '@/components/classroom/types';
import {
  faLaptopCode,
  faSearch,
  faCalendarAlt,
  faAward,
  faShieldAlt,
  faUnlock,
} from '@fortawesome/free-solid-svg-icons';

export interface CodeBlockItem {
  id: string;
  title: string;
  code: string;
  language: string;
  isRunnable: boolean;
  hasInput?: boolean;
  stdin?: string;
}

export interface AttachmentItem {
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeKb?: number;
  mimeType?: string;
}

export interface EditPostData {
  id: string;
  body: string;
  codeSnippet?: string;
  language?: string;
  isRunnable?: boolean;
  taskId?: string | null;
  materials?: AttachmentItem[];
}

interface RichPostComposerProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  editPost?: EditPostData | null;
}

export const RichPostComposer: React.FC<RichPostComposerProps> = ({
  courseId,
  isOpen,
  onClose,
  onPostCreated,
  editPost,
}) => {
  const [body, setBody] = useState('');
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [availableTasks, setAvailableTasks] = useState<CourseTaskItem[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [hasDraftOnServer, setHasDraftOnServer] = useState(false);

  // Attachment inputs
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [showAttInput, setShowAttInput] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Refs for server load protection (2.5s debounce, dirty checking, in-flight locking)
  const lastSavedContentRef = useRef<string>('');
  const isSavingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to parse code blocks JSON safely
  const parseCodeBlocksPayload = (snippet?: string): CodeBlockItem[] => {
    if (!snippet || !snippet.trim()) return [];
    try {
      const parsed = JSON.parse(snippet.trim());
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback for raw text snippet
      return [{
        id: `block_0`,
        title: 'Attached Code',
        code: snippet,
        language: 'cpp',
        isRunnable: true,
      }];
    }
    return [];
  };

  // Load available course tasks for attaching
  useEffect(() => {
    if (isOpen && courseId) {
      apiClient
        .get(`/tasks/course/${courseId}`)
        .then((res) => {
          setAvailableTasks(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to fetch course tasks:', err);
          setAvailableTasks([]);
        });
    }
  }, [isOpen, courseId]);

  // Load existing post if in edit mode, or load private draft from DB
  const loadDraftOrEditPost = useCallback(async () => {
    if (editPost) {
      setBody(editPost.body || '');
      setCodeBlocks(parseCodeBlocksPayload(editPost.codeSnippet));
      setAttachments(editPost.materials || []);
      setSelectedTaskId(editPost.taskId || null);
      setSaveStatus('idle');
      setHasDraftOnServer(false);
      lastSavedContentRef.current = JSON.stringify({
        body: editPost.body || '',
        codeBlocks: parseCodeBlocksPayload(editPost.codeSnippet),
        attachments: editPost.materials || [],
        taskId: editPost.taskId || null,
      });
      return;
    }

    try {
      const res = await apiClient.get(`/stream/course/${courseId}/draft`);
      if (res.data && (res.data.body !== undefined || res.data.content !== undefined)) {
        const draftBody = res.data.body ?? res.data.content ?? '';
        setBody(draftBody);
        const restoredBlocks = parseCodeBlocksPayload(res.data.codeSnippet);
        setCodeBlocks(restoredBlocks);
        setAttachments(res.data.materials || []);
        const restoredTaskId = res.data.taskId || res.data.task?.id || null;
        setSelectedTaskId(restoredTaskId);
        setHasDraftOnServer(true);
        setSaveStatus('saved');
        lastSavedContentRef.current = JSON.stringify({
          body: draftBody,
          codeBlocks: restoredBlocks,
          attachments: res.data.materials || [],
          taskId: restoredTaskId,
        });
      } else {
        setBody('');
        setCodeBlocks([]);
        setAttachments([]);
        setSelectedTaskId(null);
        setHasDraftOnServer(false);
        setSaveStatus('idle');
        lastSavedContentRef.current = JSON.stringify({
          body: '',
          codeBlocks: [],
          attachments: [],
          taskId: null,
        });
      }
    } catch (err) {
      console.error('Failed to fetch private post draft:', err);
    }
  }, [courseId, editPost]);

  useEffect(() => {
    if (isOpen) {
      loadDraftOrEditPost();
    }
  }, [isOpen, loadDraftOrEditPost]);

  // Debounced DB Auto-Save effect (only active when creating new post, not editing existing post)
  useEffect(() => {
    if (!isOpen || editPost) return;

    const currentContentStr = JSON.stringify({
      body,
      codeBlocks,
      attachments,
      taskId: selectedTaskId,
    });

    // Skip if content has not changed (Dirty Checking) or if empty
    if (currentContentStr === lastSavedContentRef.current) {
      return;
    }

    if (
      !body.trim() &&
      codeBlocks.length === 0 &&
      attachments.length === 0 &&
      !selectedTaskId
    ) {
      return;
    }

    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 2.5 second debounce timer to protect server performance
    debounceTimerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return; // In-flight lock
      isSavingRef.current = true;
      setSaveStatus('saving');

      try {
        const codeSnippetPayload = codeBlocks.length > 0 ? JSON.stringify(codeBlocks) : undefined;
        const primaryLangPayload = codeBlocks.length > 0 ? codeBlocks[0].language : undefined;

        await apiClient.post(`/stream/course/${courseId}/draft`, {
          body,
          codeSnippet: codeSnippetPayload,
          language: primaryLangPayload,
          taskId: selectedTaskId || undefined,
          materials: attachments.length > 0 ? attachments : undefined,
        });

        lastSavedContentRef.current = currentContentStr;
        setSaveStatus('saved');
        setHasDraftOnServer(true);
      } catch (err) {
        console.error('Auto-save draft error:', err);
        setSaveStatus('unsaved');
      } finally {
        isSavingRef.current = false;
      }
    }, 2500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [body, codeBlocks, attachments, selectedTaskId, courseId, isOpen, editPost]);

  if (!isOpen) return null;

  // Add Attachment
  const handleAddAttachment = () => {
    if (!newAttTitle.trim() || !newAttUrl.trim()) return;
    setAttachments([
      ...attachments,
      {
        title: newAttTitle.trim(),
        description: 'Post File Attachment',
        fileUrl: newAttUrl.trim(),
        fileSizeKb: 1024,
        mimeType: 'application/pdf',
      },
    ]);
    setNewAttTitle('');
    setNewAttUrl('');
    setShowAttInput(false);
  };

  const handleSelectDriveMaterials = (selected: SelectedDriveMaterial[]) => {
    const newItems: AttachmentItem[] = selected.map((s) => ({
      title: s.title,
      description: s.description,
      fileUrl: s.fileUrl,
      fileSizeKb: s.fileSizeKb,
      mimeType: s.mimeType,
    }));
    setAttachments((prev) => [...prev, ...newItems]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Handle live toggle for task integrity proctoring
  const handleToggleTaskProctoring = async (taskId: string, isExam: boolean) => {
    try {
      setAvailableTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isExam } : t))
      );
      await apiClient.patch(`/tasks/${taskId}`, { isExam });
    } catch (err) {
      console.error('Failed to update task proctoring setting:', err);
    }
  };

  // Handle Discard Private Draft
  const handleDiscardDraft = async () => {
    if (!confirm('Are you sure you want to discard this saved draft?')) return;
    try {
      await apiClient.delete(`/stream/course/${courseId}/draft`);
      setBody('');
      setCodeBlocks([]);
      setAttachments([]);
      setSelectedTaskId(null);
      setHasDraftOnServer(false);
      setSaveStatus('idle');
      lastSavedContentRef.current = JSON.stringify({
        body: '',
        codeBlocks: [],
        attachments: [],
        taskId: null,
      });
    } catch (err) {
      console.error('Failed to discard draft:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !selectedTaskId && codeBlocks.length === 0) return;

    try {
      setIsPublishing(true);

      const codeSnippetPayload = codeBlocks.length > 0 ? JSON.stringify(codeBlocks) : undefined;
      const primaryLangPayload = codeBlocks.length > 0 ? codeBlocks[0].language : undefined;
      const isAnyRunnable = codeBlocks.some((b) => b.isRunnable);

      if (editPost) {
        // Edit existing post
        await apiClient.put(`/stream/posts/${editPost.id}`, {
          body,
          codeSnippet: codeSnippetPayload,
          language: primaryLangPayload,
          isRunnable: isAnyRunnable,
          taskId: selectedTaskId || null,
          materials: attachments.length > 0 ? attachments : undefined,
          isDraft: false,
        });
      } else {
        // Create or publish announcement
        await apiClient.post('/stream/posts', {
          courseId,
          body,
          codeSnippet: codeSnippetPayload,
          language: primaryLangPayload,
          isRunnable: isAnyRunnable,
          taskId: selectedTaskId || undefined,
          materials: attachments.length > 0 ? attachments : undefined,
          isDraft: false,
        });

        // Clean up private draft if it was saved in DB
        try {
          await apiClient.delete(`/stream/course/${courseId}/draft`);
        } catch {
          // Ignore delete draft error if draft did not exist
        }
      }

      onPostCreated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save stream post';
      alert(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500/20 to-teal-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold">
              <FontAwesomeIcon icon={faFileCode} className="text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-base font-extrabold text-white">
                  {editPost ? 'Edit Class Stream Post' : 'Create Class Stream Post'}
                </h3>
                {/* Draft status indicator pill */}
                {!editPost && saveStatus !== 'idle' && (
                  <span
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                      saveStatus === 'saved'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : saveStatus === 'saving'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={
                        saveStatus === 'saved'
                          ? faCheckCircle
                          : saveStatus === 'saving'
                          ? faSpinner
                          : faCloud
                      }
                      className={saveStatus === 'saving' ? 'animate-spin' : ''}
                    />
                    <span>
                      {saveStatus === 'saved'
                        ? 'Private draft saved to DB'
                        : saveStatus === 'saving'
                        ? 'Saving draft...'
                        : 'Unsaved changes'}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Interactive Jupyter Notebook Editor • Integrated Code Cells • Learning Materials
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!editPost && hasDraftOnServer && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                title="Discard private draft stored in DB"
              >
                <FontAwesomeIcon icon={faUndo} className="text-[10px]" />
                <span>Discard Draft</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Word Markdown Editor */}
          <div className="space-y-2">
            <WordMarkdownEditor
              value={body}
              onChange={setBody}
              codeBlocks={codeBlocks}
              onCodeBlocksChange={setCodeBlocks}
              placeholder="Write your lesson post, question, or class update here... Use the toolbar above to format headings, bold text, bullet lists, or insert runnable code blocks directly!"
              minHeight="350px"
              isPostRunnable={true}
            />
          </div>

            {/* Attachments & Course Materials Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                  <FontAwesomeIcon icon={faPaperclip} className="text-brand-400" />
                  <span>Attachments & Task Links ({attachments.length + (selectedTaskId ? 1 : 0)})</span>
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskPicker(true)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/30 transition-all"
                  >
                    <FontAwesomeIcon icon={faLaptopCode} className="text-xs" />
                    <span>{selectedTaskId ? 'Change Attached Task' : 'Attach Programming Task'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDrivePicker(true)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all"
                  >
                    <FontAwesomeIcon icon={faCloud} className="text-xs" />
                    <span>Attach from Google Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttInput(!showAttInput)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    <span>Manual Link</span>
                  </button>
                </div>
              </div>

              {/* Attached Programming Task Card */}
              {selectedTaskId && (() => {
                const attachedTask = availableTasks.find((t) => t.id === selectedTaskId);
                return (
                  <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-2xl space-y-3 shadow-lg shadow-purple-950/30 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                          <FontAwesomeIcon icon={faLaptopCode} className="text-sm" />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold text-white truncate">
                              {attachedTask ? attachedTask.title : `Task (${selectedTaskId})`}
                            </span>
                            {attachedTask?.taskType && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                                {attachedTask.taskType}
                              </span>
                            )}
                            {attachedTask?.language && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-teal-300 border border-slate-700 uppercase">
                                {attachedTask.language}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                            {attachedTask?.maxPoints !== undefined && (
                              <span className="flex items-center space-x-1">
                                <FontAwesomeIcon icon={faAward} className="text-amber-400 text-[10px]" />
                                <span>{attachedTask.maxPoints} pts</span>
                              </span>
                            )}
                            {attachedTask?.deadline && (
                              <span className="flex items-center space-x-1">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-500 text-[10px]" />
                                <span>Due {new Date(attachedTask.deadline).toLocaleDateString()}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-purple-400 font-semibold">• Attached to this announcement</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(null)}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors shrink-0"
                        title="Remove attached task"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>

                    {/* Academic Integrity & Proctoring Toggle Control */}
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                            attachedTask?.isExam
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          }`}
                        >
                          <FontAwesomeIcon icon={attachedTask?.isExam ? faShieldAlt : faUnlock} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-200">
                              Academic Integrity Proctoring
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                attachedTask?.isExam
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {attachedTask?.isExam ? 'PROCTORING ON' : 'PRACTICE MODE (OFF)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {attachedTask?.isExam
                              ? 'Window focus loss & clipboard paste audits recorded during student solving session.'
                              : 'Relaxed solving mode. No anti-cheat focus warnings or integrity locks.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          attachedTask &&
                          handleToggleTaskProctoring(attachedTask.id, !attachedTask.isExam)
                        }
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shrink-0 ${
                          attachedTask?.isExam
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={attachedTask?.isExam ? faShieldAlt : faUnlock}
                          className="text-[10px]"
                        />
                        <span>{attachedTask?.isExam ? 'Proctoring: ON' : 'Proctoring: OFF'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {showAttInput && (
                <div className="p-4 bg-slate-950 border border-brand-500/30 rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newAttTitle}
                      onChange={(e) => setNewAttTitle(e.target.value)}
                      placeholder="Attachment Title (e.g., Chapter 4 Solution PDF)"
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                    <input
                      type="text"
                      value={newAttUrl}
                      onChange={(e) => setNewAttUrl(e.target.value)}
                      placeholder="File URL or Google Drive Link"
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAttInput(false)}
                      className="px-3 py-1.5 text-slate-400 text-xs font-medium hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Add Resource
                    </button>
                  </div>
                </div>
              )}

              {attachments.map((att, idx) => {
                const isGDrive = att.fileUrl.includes('drive.google.com') || att.fileUrl.includes('docs.google.com');
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                        isGDrive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                      }`}>
                        <FontAwesomeIcon icon={isGDrive ? faCloud : faPaperclip} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-200 truncate">{att.title}</p>
                          {isGDrive && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                              Google Drive
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-sm">{att.fileUrl}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 flex items-center justify-center transition-colors shrink-0"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center space-x-3">
              {codeBlocks.length > 0 && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium">
                  <span>{codeBlocks.length} code block(s)</span>
                </span>
              )}
              {selectedTaskId && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">
                  <span>1 programming task attached</span>
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!body.trim() && !selectedTaskId && codeBlocks.length === 0) || isPublishing}
                className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 disabled:opacity-40 transition-all active:scale-95"
              >
                {isPublishing
                  ? editPost
                    ? 'Saving Changes...'
                    : 'Publishing Announcement...'
                  : editPost
                  ? 'Save Changes'
                  : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>

        {/* TASK PICKER MODAL */}
        {showTaskPicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center text-sm border border-purple-500/30">
                    <FontAwesomeIcon icon={faLaptopCode} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Attach Programming Task</h4>
                    <p className="text-[11px] text-slate-400">Select a course task to attach to this stream post</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTaskPicker(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              {/* Search Filter */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="Search tasks by title or language..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-96">
                {availableTasks.filter(t => 
                  !taskSearchQuery || 
                  t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
                  (t.language && t.language.toLowerCase().includes(taskSearchQuery.toLowerCase()))
                ).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs space-y-1">
                    <p className="font-semibold text-slate-400">
                      {availableTasks.length === 0
                        ? 'No programming tasks found in this course.'
                        : 'No tasks match your search.'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      You can create tasks in the Classwork tab first, then link them to stream announcements.
                    </p>
                  </div>
                ) : (
                  availableTasks
                    .filter(t => 
                      !taskSearchQuery || 
                      t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
                      (t.language && t.language.toLowerCase().includes(taskSearchQuery.toLowerCase()))
                    )
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setShowTaskPicker(false);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          selectedTaskId === task.id
                            ? 'bg-purple-600/20 border-purple-500/60 shadow-md'
                            : 'bg-slate-950 border-slate-800 hover:border-purple-500/40 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-400 font-bold shrink-0">
                            <FontAwesomeIcon icon={faLaptopCode} className="text-xs" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-200 truncate">{task.title}</span>
                              {task.language && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-teal-300 border border-slate-700 uppercase">
                                  {task.language}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-0.5">
                              <span>{task.maxPoints} pts</span>
                              {task.deadline && (
                                <span>Due {new Date(task.deadline).toLocaleDateString()}</span>
                              )}
                              {task.taskType && (
                                <span className="uppercase text-[9px] text-slate-400">{task.taskType}</span>
                              )}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border flex items-center space-x-1 ${
                                  task.isExam
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                                }`}
                              >
                                <FontAwesomeIcon
                                  icon={task.isExam ? faShieldAlt : faUnlock}
                                  className="text-[8px]"
                                />
                                <span>{task.isExam ? 'Proctored' : 'Practice'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedTaskId === task.id
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-purple-600 hover:text-white'
                          }`}
                        >
                          {selectedTaskId === task.id ? 'Attached' : 'Select'}
                        </button>
                      </div>
                    ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500">{availableTasks.length} task(s) available</span>
                <button
                  type="button"
                  onClick={() => setShowTaskPicker(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE DRIVE PICKER MODAL */}
        <GoogleDrivePickerModal
          isOpen={showDrivePicker}
          onClose={() => setShowDrivePicker(false)}
          onSelectMaterials={handleSelectDriveMaterials}
          allowMultiple={true}
        />
      </div>
    );
  };
