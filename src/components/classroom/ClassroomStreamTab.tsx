'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStream,
  faPlus,
  faEdit,
  faTrash,
  faPaperclip,
  faFileAlt,
  faExternalLinkAlt,
  faLaptopCode,
  faAward,
  faCalendarAlt,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { PostContentRenderer } from '@/components/stream/PostContentRenderer';
import { StreamComments } from '@/components/stream/StreamComments';
import { CodeBlockItem } from '@/components/stream/RichPostComposer';
import { StreamPostItem, CourseTaskItem } from './types';

interface ClassroomStreamTabProps {
  streamPosts?: StreamPostItem[];
  tasks?: CourseTaskItem[];
  currentUser?: { id?: string; name?: string; role?: string } | null;
  isTeacherOrAdmin: boolean;
  highlightPostId: string | null;
  onOpenNewComposer: () => void;
  onEditPost: (post: StreamPostItem) => void;
  onDeletePost: (postId: string) => void;
  onRefreshCourse: () => void;
  mentionableUsers: { id: string; name: string; avatarUrl?: string; role?: string }[];
}

export function ClassroomStreamTab({
  streamPosts = [],
  tasks = [],
  currentUser,
  isTeacherOrAdmin,
  highlightPostId,
  onOpenNewComposer,
  onEditPost,
  onDeletePost,
  onRefreshCourse,
  mentionableUsers,
}: ClassroomStreamTabProps) {
  // Helper to parse multiple code blocks from post snippet field
  const parseCodeBlocks = (post: StreamPostItem): CodeBlockItem[] => {
    if (!post.codeSnippet || !post.codeSnippet.trim()) return [];

    const raw = post.codeSnippet.trim();
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item: Record<string, unknown>, idx: number) => ({
            id: (item.id as string) || `block_${idx}`,
            title: (item.title as string) || `Code Snippet #${idx + 1}`,
            code: (item.code as string) || '',
            language: (item.language as string) || post.language || 'cpp',
            isRunnable: (item.isRunnable as boolean) ?? (post.isRunnable ?? true),
            hasInput: (item.hasInput as boolean) ?? false,
            stdin: (item.stdin as string) ?? undefined,
          }));
        }
      } catch {
        // Fallback below
      }
    }

    // Single legacy code block
    return [
      {
        id: `legacy_${post.id}`,
        title: 'Code Snippet',
        code: post.codeSnippet,
        language: post.language || 'cpp',
        isRunnable: post.isRunnable ?? true,
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Post Creation Box */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-800 border border-brand-500/40 flex items-center justify-center text-white font-bold text-xs shadow-md">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <button
            onClick={onOpenNewComposer}
            className="flex-1 bg-slate-900/90 border border-slate-700/80 hover:border-brand-500 rounded-xl px-4 py-3 text-xs text-left text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between shadow-inner"
          >
            <span>Announce something to your class (Markdown, Code Blocks, Attachments)...</span>
            <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 text-[10px] font-bold border border-brand-500/30">
              Rich Editor
            </span>
          </button>
          <button
            onClick={onOpenNewComposer}
            className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all active:scale-95 shrink-0"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>New Post</span>
          </button>
        </div>
      </div>

      {/* Stream Feed */}
      {streamPosts.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800/60 space-y-2">
          <FontAwesomeIcon icon={faStream} className="text-4xl text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-200">Class Stream is Empty</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Post announcements, runnable code snippets, homework notes, or start a discussion thread.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {streamPosts.map((post) => {
            const codeBlocks = parseCodeBlocks(post);
            const attachedTask = post.task || (post.taskId ? tasks.find((t) => t.id === post.taskId) : null);

            return (
              <div
                key={post.id}
                id={`stream-post-${post.id}`}
                className={`glass-panel p-6 rounded-3xl border space-y-5 shadow-xl transition-all ${
                  highlightPostId === post.id
                    ? 'border-teal-400/60 ring-2 ring-teal-400/40 bg-teal-950/10'
                    : 'border-slate-800/90 hover:border-slate-700/80'
                }`}
              >
                {/* Post Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-sm shadow-md">
                      {post.author?.fullName?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-extrabold text-slate-100">{post.author?.fullName}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-brand-400 border border-slate-700 uppercase">
                          {post.author?.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {(isTeacherOrAdmin || currentUser?.id === post.author?.id) && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditPost(post)}
                        className="p-2 text-slate-500 hover:text-brand-400 transition-colors rounded-xl hover:bg-brand-500/10"
                        title="Edit Post"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-xs" />
                      </button>
                      <button
                        onClick={() => onDeletePost(post.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-xl hover:bg-rose-500/10"
                        title="Delete Announcement"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Interleaved Post Text & Embedded Code */}
                <PostContentRenderer
                  body={post.body}
                  codeBlocks={codeBlocks}
                  isPostRunnable={post.isRunnable ?? true}
                  defaultLanguage={post.language || 'cpp'}
                />

                {/* Attached Programming Task Widget */}
                {attachedTask && (
                  <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/30 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg transition-all">
                    <div className="flex items-start sm:items-center space-x-3.5 overflow-hidden flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/30 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-purple-600/30 shrink-0">
                        <FontAwesomeIcon icon={faLaptopCode} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            Attached Programming Task
                          </span>
                          {attachedTask.taskType && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                              {attachedTask.taskType}
                            </span>
                          )}
                          {attachedTask.language && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-teal-300 border border-slate-700 uppercase">
                              {attachedTask.language}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-white truncate mt-0.5">
                          {attachedTask.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                          {attachedTask.maxPoints !== undefined && (
                            <span className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faAward} className="text-amber-400 text-[10px]" />
                              <span>{attachedTask.maxPoints} Points</span>
                            </span>
                          )}
                          {attachedTask.deadline && (
                            <span className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-500 text-[10px]" />
                              <span>Due {new Date(attachedTask.deadline).toLocaleString()}</span>
                            </span>
                          )}
                          {attachedTask.isExam && (
                            <span className="text-rose-400 font-bold">• Timed Examination</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2 w-full sm:w-auto">
                      {isTeacherOrAdmin ? (
                        <a
                          href={`/teacher/submissions`}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md"
                        >
                          <span>View Submissions</span>
                          <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                        </a>
                      ) : (
                        <a
                          href={`/student/exam/${attachedTask.id}`}
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                        >
                          <span>Solve in IDE</span>
                          <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Post File Attachments */}
                {post.materials && post.materials.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <FontAwesomeIcon icon={faPaperclip} className="text-brand-400" />
                      <span>Attached Course Resources ({post.materials.length})</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {post.materials.map((mat) => (
                        <a
                          key={mat.id}
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-xl flex items-center justify-between group transition-all"
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <FontAwesomeIcon icon={faFileAlt} className="text-brand-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-200 group-hover:text-brand-300 truncate">
                                {mat.title}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">{mat.fileUrl}</p>
                            </div>
                          </div>
                          <FontAwesomeIcon
                            icon={faExternalLinkAlt}
                            className="text-slate-500 text-xs shrink-0"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Threaded Chain Comments */}
                <StreamComments
                  postId={post.id}
                  comments={post.comments || []}
                  currentUserId={currentUser?.id}
                  userRole={currentUser?.role}
                  onRefreshComments={onRefreshCourse}
                  mentionableUsers={mentionableUsers}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
