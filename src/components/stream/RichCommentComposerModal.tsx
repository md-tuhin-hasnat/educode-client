'use client';

import React, { useState, useEffect } from 'react';
import { WordMarkdownEditor } from './WordMarkdownEditor';
import { CodeBlockItem } from './PostContentRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faPaperclip,
  faPlus,
  faTrash,
  faFileCode,
  faComments,
  faPaperPlane,
  faSpinner,
  faReply,
  faPen,
} from '@fortawesome/free-solid-svg-icons';

export interface AttachmentItem {
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeKb?: number;
  mimeType?: string;
}

interface RichCommentComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (body: string) => Promise<void>;
  initialBody?: string;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  replyingToName?: string;
}

export const RichCommentComposerModal: React.FC<RichCommentComposerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialBody = '',
  title = 'Add Stream Comment',
  subtitle = 'Interactive Jupyter Notebook Editor • Runnable Code Blocks • Attachments',
  submitLabel = 'Post Comment',
  replyingToName,
}) => {
  const [body, setBody] = useState(initialBody);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attachment inputs
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [showAttInput, setShowAttInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBody(initialBody || '');
      setCodeBlocks([]);
      setAttachments([]);
      setShowAttInput(false);
      setNewAttTitle('');
      setNewAttUrl('');
    }
  }, [isOpen, initialBody]);

  if (!isOpen) return null;

  const handleAddAttachment = () => {
    if (!newAttTitle.trim() || !newAttUrl.trim()) return;
    setAttachments([
      ...attachments,
      {
        title: newAttTitle.trim(),
        description: 'Comment Resource Link',
        fileUrl: newAttUrl.trim(),
      },
    ]);
    setNewAttTitle('');
    setNewAttUrl('');
    setShowAttInput(false);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && codeBlocks.length === 0) return;

    let finalBody = body.trim();

    // NOTE: Code blocks are already embedded as markdown fences within `body`
    // by WordMarkdownEditor.syncCellsToParent(), so we do NOT re-append them here.

    if (attachments.length > 0) {
      const attsMd =
        '\n\n---\n**📎 Attached Resources:**\n' +
        attachments.map((a) => `- [${a.title}](${a.fileUrl})`).join('\n');
      finalBody += attsMd;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(finalBody);
      onClose();
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalIcon = replyingToName ? faReply : title.includes('Edit') ? faPen : faComments;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
              <FontAwesomeIcon icon={modalIcon} className="text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">{title}</h3>
                {replyingToName && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 border border-teal-500/30 text-teal-300">
                    Replying to @{replyingToName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
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
              placeholder={
                replyingToName
                  ? `Write a detailed reply to @${replyingToName}... Use formatting toolbar, or insert runnable code blocks!`
                  : "Write your comment, question, or discussion point... Use toolbar to format text or attach runnable code cells!"
              }
              minHeight="280px"
              isPostRunnable={true}
            />
          </div>

          {/* Attachments & Resource Links Section */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <FontAwesomeIcon icon={faPaperclip} className="text-teal-400" />
                <span>Comment Attachments ({attachments.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAttInput(!showAttInput)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                <span>Attach Link</span>
              </button>
            </div>

            {showAttInput && (
              <div className="p-4 bg-slate-950 border border-teal-500/30 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newAttTitle}
                    onChange={(e) => setNewAttTitle(e.target.value)}
                    placeholder="Link Title (e.g., Reference Documentation)"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                  <input
                    type="text"
                    value={newAttUrl}
                    onChange={(e) => setNewAttUrl(e.target.value)}
                    placeholder="URL (e.g., https://cppreference.com...)"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
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
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Add Resource
                  </button>
                </div>
              </div>
            )}

            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <FontAwesomeIcon icon={faPaperclip} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">{att.title}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-sm">{att.fileUrl}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 flex items-center justify-center transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {codeBlocks.length > 0 && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium">
                <FontAwesomeIcon icon={faFileCode} />
                <span>{codeBlocks.length} code block(s) attached</span>
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
              onClick={handleSubmitForm}
              disabled={(!body.trim() && codeBlocks.length === 0) || isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 disabled:opacity-40 transition-all active:scale-95 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                  <span>{submitLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
