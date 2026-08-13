'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faReply,
  faTrash,
  faComments,
  faChevronDown,
  faChevronRight,
  faPen,
  faPlus,
  faSpinner,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faPaperclip,
  faFileCode,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
import { PostContentRenderer } from './PostContentRenderer';
import { RichCommentComposerModal } from './RichCommentComposerModal';

interface CommentUser {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
}

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string | null;
  user: CommentUser;
  replies?: CommentItem[];
}

export type CommentData = CommentItem;

interface StreamCommentsProps {
  postId: string;
  comments: CommentItem[];
  currentUserId?: string;
  userRole?: string;
  onRefreshComments?: () => void;
  onCommentAdded?: () => void;
}

// User Role Badge Helper
const UserRoleBadge: React.FC<{ role?: string }> = ({ role }) => {
  if (!role) return null;
  const upperRole = role.toUpperCase();

  if (upperRole === 'TEACHER') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-950 text-teal-300 border border-teal-700/60 shadow-sm">
        <FontAwesomeIcon icon={faChalkboardTeacher} className="text-[9px]" />
        Teacher
      </span>
    );
  }
  if (upperRole === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-700/60 shadow-sm">
        <FontAwesomeIcon icon={faUserShield} className="text-[9px]" />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
      <FontAwesomeIcon icon={faUserGraduate} className="text-[9px]" />
      Student
    </span>
  );
};

export const StreamComments: React.FC<StreamCommentsProps> = ({
  postId,
  comments,
  onRefreshComments,
  onCommentAdded,
}) => {
  const { user } = useAuthStore();
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});

  // Rich Modal Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerConfig, setComposerConfig] = useState<{
    title: string;
    subtitle: string;
    submitLabel: string;
    replyingToName?: string;
    initialBody?: string;
    onSubmit: (body: string) => Promise<void>;
  }>({
    title: 'Add Stream Comment',
    subtitle: 'Interactive Jupyter Notebook Editor • Runnable Code Blocks • Attachments',
    submitLabel: 'Post Comment',
    onSubmit: async () => {},
  });

  const handleRefresh = () => {
    if (onRefreshComments) onRefreshComments();
    if (onCommentAdded) onCommentAdded();
  };

  const openCreateModal = () => {
    setComposerConfig({
      title: 'Add Stream Comment',
      subtitle: 'Interactive Jupyter Notebook Editor • Runnable Code Blocks • Attachments',
      submitLabel: 'Post Comment',
      initialBody: '',
      replyingToName: undefined,
      onSubmit: async (body: string) => {
        await apiClient.post(`/stream/posts/${postId}/comments`, {
          body,
          parentId: null,
        });
        handleRefresh();
      },
    });
    setIsComposerOpen(true);
  };

  const openReplyModal = (comment: CommentItem) => {
    setComposerConfig({
      title: 'Reply to Comment',
      subtitle: `Replying to @${comment.user.name} • Add runnable code cells & attachments`,
      submitLabel: 'Post Reply',
      initialBody: '',
      replyingToName: comment.user.name,
      onSubmit: async (body: string) => {
        await apiClient.post(`/stream/posts/${postId}/comments`, {
          body,
          parentId: comment.id,
        });
        handleRefresh();
      },
    });
    setIsComposerOpen(true);
  };

  const openEditModal = (comment: CommentItem) => {
    setComposerConfig({
      title: 'Edit Comment',
      subtitle: 'Modify comment markdown, runnable code cells, or attachments',
      submitLabel: 'Save Changes',
      initialBody: comment.body,
      replyingToName: undefined,
      onSubmit: async (body: string) => {
        await apiClient.patch(`/stream/comments/${comment.id}`, {
          body,
        });
        handleRefresh();
      },
    });
    setIsComposerOpen(true);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    setIsDeletingId(commentId);
    try {
      await apiClient.delete(`/stream/comments/${commentId}`);
      handleRefresh();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  const toggleCollapseReplies = (commentId: string) => {
    setCollapsedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderSingleComment = (comment: CommentItem, isReply = false) => {
    const isAuthor = user?.id === comment.user.id;
    const canManage = isAuthor || user?.role === 'ADMIN' || user?.role === 'TEACHER';
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isCollapsed = collapsedReplies[comment.id];

    return (
      <div
        key={comment.id}
        className={`group relative ${isReply ? 'mt-3 pl-4 border-l-2 border-slate-700/60' : 'mt-4'}`}
      >
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {comment.user.avatarUrl ? (
              <img
                src={comment.user.avatarUrl}
                alt={comment.user.name}
                className="w-8 h-8 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {comment.user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Comment Details */}
          <div className="flex-1 min-w-0">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 shadow-sm transition-colors hover:border-slate-700">
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-100 hover:text-teal-300 transition-colors">
                    {comment.user.name}
                  </span>
                  <UserRoleBadge role={comment.user.role} />
                  <span className="text-[11px] text-slate-400">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                  {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                    <span className="text-[10px] text-slate-500 italic">(edited)</span>
                  )}
                </div>

                {/* Actions: Edit & Delete */}
                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(comment)}
                      className="text-slate-400 hover:text-teal-400 p-1 text-xs transition-colors rounded hover:bg-slate-700/40"
                      title="Edit comment with rich editor"
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={isDeletingId === comment.id}
                      className="text-slate-400 hover:text-rose-400 p-1 text-xs transition-colors rounded hover:bg-slate-700/40 disabled:opacity-50"
                      title="Delete comment"
                    >
                      <FontAwesomeIcon
                        icon={isDeletingId === comment.id ? faSpinner : faTrash}
                        className={isDeletingId === comment.id ? 'spin' : ''}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Body rendered with PostContentRenderer */}
              <PostContentRenderer body={comment.body} defaultLanguage="cpp" isPostRunnable={true} />
            </div>

            {/* Sub-actions (Reply, Collapse) */}
            <div className="flex items-center gap-3 mt-1.5 ml-1 text-xs text-slate-400">
              {!isReply && (
                <button
                  onClick={() => openReplyModal(comment)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/20 transition-all"
                >
                  <FontAwesomeIcon icon={faReply} className="text-[10px]" />
                  <span>Reply</span>
                </button>
              )}

              {hasReplies && (
                <button
                  onClick={() => toggleCollapseReplies(comment.id)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={isCollapsed ? faChevronRight : faChevronDown}
                    className="text-[9px]"
                  />
                  <span>
                    {isCollapsed
                      ? `Show ${comment.replies!.length} ${
                          comment.replies!.length === 1 ? 'reply' : 'replies'
                        }`
                      : 'Hide replies'}
                  </span>
                </button>
              )}
            </div>

            {/* Render Nested Replies */}
            {hasReplies && !isCollapsed && (
              <div className="space-y-1">
                {comment.replies!.map((reply) => renderSingleComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 pt-5 border-t border-slate-700/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} className="text-teal-400" />
          <span>Discussion Thread ({comments.length})</span>
        </h4>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
            <FontAwesomeIcon icon={faFileCode} className="text-[10px]" />
            Runnable Code Blocks
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <FontAwesomeIcon icon={faPaperclip} className="text-[10px]" />
            Attachments
          </span>
        </div>
      </div>

      {/* Primary New Comment Trigger Card */}
      <div
        onClick={openCreateModal}
        className="mb-6 cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-700/70 hover:border-teal-500/60 rounded-2xl p-3.5 transition-all shadow-md hover:shadow-teal-900/20 group"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {(user as unknown as { avatarUrl?: string })?.avatarUrl ? (
              <img
                src={(user as unknown as { avatarUrl?: string }).avatarUrl}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate">
              Add to the discussion... Click to open Rich Comment Composer with Code &amp; Attachments
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 group-hover:from-teal-500 group-hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-1.5 shrink-0"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <span>Rich Comment</span>
          </button>
        </div>
      </div>

      {/* List of Comments */}
      {comments.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
          <p className="text-xs text-slate-400">No comments yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => renderSingleComment(comment))}
        </div>
      )}

      {/* Rich Comment Composer Modal */}
      <RichCommentComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={composerConfig.onSubmit}
        title={composerConfig.title}
        subtitle={composerConfig.subtitle}
        submitLabel={composerConfig.submitLabel}
        replyingToName={composerConfig.replyingToName}
        initialBody={composerConfig.initialBody}
      />
    </div>
  );
};
