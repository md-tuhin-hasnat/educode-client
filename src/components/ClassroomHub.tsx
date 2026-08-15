'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStream,
  faTasks,
  faFolderOpen,
  faUsers,
  faGraduationCap,
  faPlus,
  faCode,
  faClock,
  faFileAlt,
  faExternalLinkAlt,
  faTrash,
  faEdit,
  faAward,
  faFileUpload,
  faPaperclip,
  faCloud,
  faFlask,
  faBookOpen,
  faCheckCircle,
  faLayerGroup,
  faListUl,
  faChevronRight,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { EnrollStudentsModal } from '@/components/EnrollStudentsModal';
import { RichPostComposer, CodeBlockItem } from '@/components/stream/RichPostComposer';
import { PostContentRenderer } from '@/components/stream/PostContentRenderer';
import { StreamComments, CommentData } from '@/components/stream/StreamComments';
import { GoogleDrivePickerModal, SelectedDriveMaterial } from '@/components/GoogleDrivePickerModal';

interface StreamPostAttachment {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeKb: number;
  mimeType: string;
}

interface StreamPostItem {
  id: string;
  body: string;
  codeSnippet?: string;
  language?: string;
  isRunnable?: boolean;
  attachmentUrl?: string;
  createdAt: string;
  author: { id: string; fullName: string; role: string; profilePicUrl?: string };
  materials?: StreamPostAttachment[];
  comments?: CommentData[];
}

interface CourseTaskItem {
  id: string;
  title: string;
  description?: string;
  taskType: string;
  language: string;
  maxPoints: number;
  deadline: string;
  isExam: boolean;
  examDurationMin?: number;
  assessmentId?: string | null;
  assessment?: { id: string; title: string; type: string } | null;
  testCases?: Array<{ id: number; points: number; isHidden: boolean }>;
  _count?: { submissions: number };
}

interface CourseAssessmentItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  startTime?: string;
  durationMin?: number;
  createdAt: string;
  tasks?: CourseTaskItem[];
  _count?: { participants: number; tasks: number };
}

interface CourseDetails {
  id: string;
  subjectCode: string;
  code: string;
  title: string;
  classCode: string;
  creditHours: number;
  department?: { name: string; code: string };
  intake?: { label: string; year: number; semester: string };
  section?: { name: string };
  teacher: { id: string; fullName: string; email: string; profilePicUrl?: string };
  ta?: { id: string; fullName: string; email: string; profilePicUrl?: string } | null;
  tasks: CourseTaskItem[];
  materials: Array<{
    id: string;
    title: string;
    description?: string;
    fileUrl: string;
    fileSizeKb: number;
    mimeType: string;
    createdAt: string;
    postId?: string | null;
    uploader: { id: string; fullName: string; role: string };
  }>;
  streamPosts: StreamPostItem[];
  enrollments: Array<{
    student: {
      id: string;
      fullName: string;
      email: string;
      profilePicUrl?: string;
      studentProfile?: { studentId: string };
    };
    section?: { name: string };
  }>;
  assessments: CourseAssessmentItem[];
}

interface ClassroomHubProps {
  courseId: string;
}

export const ClassroomHub: React.FC<ClassroomHubProps> = ({ courseId }) => {
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'materials' | 'people' | 'grades'>('stream');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);

  // Modals state
  const [showRichComposer, setShowRichComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<StreamPostItem | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Direct Material State
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDesc, setMaterialDesc] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Quick Assessment Creation State
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentType, setAssessmentType] = useState<'LAB' | 'ASSIGNMENT' | 'EXAM'>('LAB');
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentDesc, setAssessmentDesc] = useState('');
  const [assessmentDuration, setAssessmentDuration] = useState<number>(120);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);

  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTeacherOrAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentTitle.trim() || !course) return;

    try {
      setIsCreatingAssessment(true);
      const res = await apiClient.post('/assessments', {
        courseId: course.id,
        title: assessmentTitle.trim(),
        description: assessmentDesc.trim() || null,
        type: assessmentType,
        durationMin: assessmentType === 'EXAM' || assessmentType === 'LAB' ? Number(assessmentDuration) : null,
      });

      const newAssId = res.data?.id;
      setAssessmentTitle('');
      setAssessmentDesc('');
      setShowAssessmentModal(false);
      fetchCourse();

      if (newAssId) {
        router.push(`/teacher/tasks/new?courseId=${course.id}&assessmentId=${newAssId}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create assessment module';
      alert(msg);
    } finally {
      setIsCreatingAssessment(false);
    }
  };

  const mentionableUsers = useMemo(() => {
    if (!course) return [];
    const users = [];
    if (course.teacher) {
      users.push({ id: course.teacher.id, name: course.teacher.fullName, role: 'Teacher' });
    }
    if (course.ta) {
      users.push({ id: course.ta.id, name: course.ta.fullName, role: 'TA' });
    }
    if (course.enrollments) {
      course.enrollments.forEach((enr: { student: { id: string; fullName: string } }) => {
        users.push({ id: enr.student.id, name: enr.student.fullName, role: 'Student' });
      });
    }
    return users;
  }, [course]);

  // Deep-link: read tab & postId from URL query params (e.g. ?tab=stream&postId=abc)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['stream', 'classwork', 'materials', 'people', 'grades'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab);
    }
    const postIdParam = searchParams.get('postId');
    if (postIdParam) {
      setHighlightPostId(postIdParam);
    }
  }, [searchParams]);

  // Deep-link: scroll to highlighted post once course data is loaded
  useEffect(() => {
    if (highlightPostId && course && activeTab === 'stream') {
      // Small delay to allow DOM render
      const timer = setTimeout(() => {
        const el = document.getElementById(`stream-post-${highlightPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-teal-400/60');
          // Remove highlight after 4s
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-teal-400/60');
            setHighlightPostId(null);
          }, 4000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightPostId, course, activeTab]);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await apiClient.get(`/courses/${courseId}`);
      setCourse(res.data);
    } catch (err: unknown) {
      console.error('Error loading classroom details:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load classroom details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, fetchCourse]);

  // Real-time WebSocket connection for course room
  useEffect(() => {
    if (!courseId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const socket: Socket = io(`${socketUrl}/stream`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('joinCourse', { courseId });
    });

    socket.on('newPost', () => {
      fetchCourse();
    });

    socket.on('postUpdated', () => {
      fetchCourse();
    });

    socket.on('postDeleted', () => {
      fetchCourse();
    });

    socket.on('newComment', () => {
      fetchCourse();
    });

    socket.on('commentDeleted', () => {
      fetchCourse();
    });

    socket.on('commentUpdated', () => {
      fetchCourse();
    });

    return () => {
      socket.disconnect();
    };
  }, [courseId, fetchCourse]);

  const handleOpenNewComposer = () => {
    setEditingPost(null);
    setShowRichComposer(true);
  };

  const handleEditPost = (post: StreamPostItem) => {
    setEditingPost(post);
    setShowRichComposer(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this announcement post?')) return;
    try {
      await apiClient.delete(`/stream/posts/${postId}`);
      fetchCourse();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete post';
      alert(msg);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle.trim() || !materialUrl.trim()) return;

    try {
      setIsAddingMaterial(true);
      await apiClient.post(`/courses/${courseId}/materials`, {
        title: materialTitle,
        description: materialDesc,
        fileUrl: materialUrl,
        fileSizeKb: 1024,
        mimeType: 'application/pdf',
      });
      setMaterialTitle('');
      setMaterialDesc('');
      setMaterialUrl('');
      setShowMaterialModal(false);
      fetchCourse();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add material';
      alert(msg);
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const handleSelectDriveMaterials = async (selected: SelectedDriveMaterial[]) => {
    try {
      for (const item of selected) {
        await apiClient.post(`/courses/${courseId}/materials`, {
          title: item.title,
          description: item.description,
          fileUrl: item.fileUrl,
          fileSizeKb: item.fileSizeKb,
          mimeType: item.mimeType,
        });
      }
      fetchCourse();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to attach Google Drive materials';
      alert(msg);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to remove this class material?')) return;
    try {
      await apiClient.delete(`/courses/materials/${materialId}`);
      fetchCourse();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete material';
      alert(msg);
    }
  };

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




  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 font-medium">Loading Institutional Classroom Hub...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 mb-4 text-sm">
          {error || 'Classroom not found'}
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Aggregate materials for Materials Tab
  const directMaterials = course.materials?.filter((m) => !m.postId) || [];
  const postAttachedMaterials = course.materials?.filter((m) => !!m.postId) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Classroom Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel-glow border border-brand-500/20 p-8 shadow-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 text-xs font-bold tracking-wider">
                {course.subjectCode}
              </span>
              <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                Class Code: <strong className="font-mono text-white select-all">{course.classCode}</strong>
              </span>
              {course.section && (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                  Section: {course.section.name}
                </span>
              )}
              {course.intake && (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                  Intake: {course.intake.label}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{course.title}</h1>
            <div className="flex items-center space-x-6 text-xs text-slate-400 pt-1">
              <span>Lead Teacher: <strong className="text-slate-200">{course.teacher.fullName}</strong></span>
              {course.ta && (
                <span>Teaching Assistant: <strong className="text-teal-400">{course.ta.fullName}</strong></span>
              )}
              <span>Credit Hours: <strong className="text-slate-200">{course.creditHours}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {isTeacherOrAdmin && (
              <button
                onClick={() => router.push(`/teacher/tasks/new?courseId=${course.id}`)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all transform active:scale-[0.98]"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Create Task</span>
              </button>
            )}
            {isTeacherOrAdmin && (
              <button
                onClick={() => router.push(`/teacher/assessments/create?courseId=${course.id}`)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition-all transform active:scale-[0.98]"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Create Exam</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Classroom Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
        {[
          { id: 'stream', label: 'Stream', icon: faStream, count: course.streamPosts?.length },
          { id: 'classwork', label: 'Classwork', icon: faTasks, count: course.tasks?.length },
          { id: 'materials', label: 'Materials', icon: faFolderOpen, count: course.materials?.length },
          { id: 'people', label: 'People', icon: faUsers, count: course.enrollments?.length },
          { id: 'grades', label: 'Grades & Submissions', icon: faGraduationCap },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'stream' | 'classwork' | 'materials' | 'people' | 'grades')}
              className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-slate-800/80 text-brand-400 border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: STREAM */}
      {activeTab === 'stream' && (
        <div className="space-y-6">
          {/* Post Creation Box */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-brand-800 border border-brand-500/40 flex items-center justify-center text-white font-bold text-xs shadow-md">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <button
                onClick={handleOpenNewComposer}
                className="flex-1 bg-slate-900/90 border border-slate-700/80 hover:border-brand-500 rounded-xl px-4 py-3 text-xs text-left text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between shadow-inner"
              >
                <span>Announce something to your class (Markdown, Code Blocks, Attachments)...</span>
                <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 text-[10px] font-bold border border-brand-500/30">
                  Rich Editor
                </span>
              </button>
              <button
                onClick={handleOpenNewComposer}
                className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all active:scale-95 shrink-0"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>New Post</span>
              </button>
            </div>
          </div>

          {/* Stream Feed */}
          {course.streamPosts?.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800/60 space-y-2">
              <FontAwesomeIcon icon={faStream} className="text-4xl text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-200">Class Stream is Empty</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Post announcements, runnable code snippets, homework notes, or start a discussion thread.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {course.streamPosts?.map((post) => {
                const codeBlocks = parseCodeBlocks(post);

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
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(post.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {(isTeacherOrAdmin || user?.id === post.author?.id) && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditPost(post)}
                            className="p-2 text-slate-500 hover:text-brand-400 transition-colors rounded-xl hover:bg-brand-500/10"
                            title="Edit Post"
                          >
                            <FontAwesomeIcon icon={faEdit} className="text-xs" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-xl hover:bg-rose-500/10"
                            title="Delete Announcement"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interleaved Post Text & Embedded/Structured Code Blocks (Document-Style) */}
                    <PostContentRenderer
                      body={post.body}
                      codeBlocks={codeBlocks}
                      isPostRunnable={post.isRunnable ?? true}
                      defaultLanguage={post.language || 'cpp'}
                    />

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
                              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-slate-500 text-xs shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Threaded Chain Comments */}
                    <StreamComments
                      postId={post.id}
                      comments={post.comments || []}
                      currentUserId={user?.id}
                      userRole={user?.role}
                      onRefreshComments={fetchCourse}
                      mentionableUsers={mentionableUsers}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CLASSWORK */}
      {activeTab === 'classwork' && (
        <div className="space-y-8">
          {/* Header & Quick Creation Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Coursework, Labs & Assessments</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage interactive lab sessions, homework assignments, and exams containing programming problems.
              </p>
            </div>
            
            {isTeacherOrAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setAssessmentType('LAB');
                    setShowAssessmentModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <FontAwesomeIcon icon={faFlask} />
                  <span>+ New Lab</span>
                </button>

                <button
                  onClick={() => {
                    setAssessmentType('ASSIGNMENT');
                    setShowAssessmentModal(true);
                  }}
                  className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-brand-600/20 transition-all"
                >
                  <FontAwesomeIcon icon={faBookOpen} />
                  <span>+ New Assignment</span>
                </button>

                <button
                  onClick={() => {
                    setAssessmentType('EXAM');
                    setShowAssessmentModal(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-600/20 transition-all"
                >
                  <FontAwesomeIcon icon={faGraduationCap} />
                  <span>+ New Exam</span>
                </button>

                <button
                  onClick={() => router.push(`/teacher/tasks/new?courseId=${course.id}`)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>+ Problem Task</span>
                </button>
              </div>
            )}
          </div>

          {!course.assessments?.length && !course.tasks?.length ? (
            <div className="text-center py-16 glass-panel rounded-3xl border border-slate-800/60 space-y-3">
              <FontAwesomeIcon icon={faFlask} className="text-4xl text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No active labs, assignments, or exams created yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create a Lab, Assignment, or Exam and add multiple programming tasks to evaluate student solutions.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* 🧪 GROUP 1: LABS & PRACTICAL SESSIONS */}
              {course.assessments?.filter((a) => a.type === 'LAB').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-emerald-900/40 pb-2">
                    <FontAwesomeIcon icon={faFlask} className="text-emerald-400 text-sm" />
                    <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
                      Laboratory Sessions & Hands-on Practicals
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      ({course.assessments.filter((a) => a.type === 'LAB').length} Labs)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {course.assessments
                      .filter((a) => a.type === 'LAB')
                      .map((lab) => {
                        const labTasks = lab.tasks || [];
                        const totalPoints = labTasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

                        return (
                          <div
                            key={lab.id}
                            className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-emerald-500/40 transition-all"
                          >
                            {/* Lab Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2.5">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                                    <FontAwesomeIcon icon={faFlask} />
                                    <span>LAB SESSION</span>
                                  </span>
                                  <span className="text-xs text-slate-400 font-semibold">
                                    {labTasks.length} {labTasks.length === 1 ? 'Problem Task' : 'Problem Tasks'} ({totalPoints} pts)
                                  </span>
                                </div>
                                <h4 className="text-base font-black text-white">{lab.title}</h4>
                                {lab.description && (
                                  <p className="text-xs text-slate-400 line-clamp-2">{lab.description}</p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2.5 shrink-0">
                                {isTeacherOrAdmin && (
                                  <button
                                    onClick={() => router.push(`/teacher/tasks/new?courseId=${course.id}&assessmentId=${lab.id}`)}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                                  >
                                    <FontAwesomeIcon icon={faPlus} />
                                    <span>Add Task to Lab</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Child Tasks List */}
                            <div className="space-y-2.5">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Problems in this Lab ({labTasks.length})
                              </p>

                              {labTasks.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                                  No problems added to this lab yet.{' '}
                                  {isTeacherOrAdmin && (
                                    <button
                                      onClick={() => router.push(`/teacher/tasks/new?courseId=${course.id}&assessmentId=${lab.id}`)}
                                      className="text-emerald-400 font-bold hover:underline ml-1"
                                    >
                                      Add first problem
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {labTasks.map((t, idx) => (
                                    <div
                                      key={t.id}
                                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
                                    >
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                            #{idx + 1}
                                          </span>
                                          <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                                        </div>
                                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                          <span className="uppercase font-mono text-emerald-400 font-semibold">{t.language}</span>
                                          <span>•</span>
                                          <span className="text-brand-300 font-semibold">{t.maxPoints} pts</span>
                                          <span>•</span>
                                          <span>{t.testCases?.length || 0} Cases</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => router.push(user?.role === 'STUDENT' ? `/student/exam?taskId=${t.id}` : `/teacher/tasks/${t.id}`)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center space-x-1 shrink-0 transition-all"
                                      >
                                        <FontAwesomeIcon icon={faCode} className="text-[10px]" />
                                        <span>Solve / IDE</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 📝 GROUP 2: ASSIGNMENTS & HOMEWORKS */}
              {course.assessments?.filter((a) => a.type === 'ASSIGNMENT').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-brand-900/40 pb-2">
                    <FontAwesomeIcon icon={faBookOpen} className="text-brand-400 text-sm" />
                    <h4 className="text-sm font-extrabold text-brand-400 uppercase tracking-wider">
                      Course Assignments & Project Modules
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      ({course.assessments.filter((a) => a.type === 'ASSIGNMENT').length} Assignments)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {course.assessments
                      .filter((a) => a.type === 'ASSIGNMENT')
                      .map((assignment) => {
                        const aTasks = assignment.tasks || [];
                        const totalPoints = aTasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

                        return (
                          <div
                            key={assignment.id}
                            className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-brand-500/40 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2.5">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                                    <FontAwesomeIcon icon={faBookOpen} />
                                    <span>ASSIGNMENT</span>
                                  </span>
                                  <span className="text-xs text-slate-400 font-semibold">
                                    {aTasks.length} {aTasks.length === 1 ? 'Problem Task' : 'Problem Tasks'} ({totalPoints} pts)
                                  </span>
                                </div>
                                <h4 className="text-base font-black text-white">{assignment.title}</h4>
                                {assignment.description && (
                                  <p className="text-xs text-slate-400 line-clamp-2">{assignment.description}</p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2.5 shrink-0">
                                {isTeacherOrAdmin && (
                                  <button
                                    onClick={() => router.push(`/teacher/tasks/new?courseId=${course.id}&assessmentId=${assignment.id}`)}
                                    className="px-3.5 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                                  >
                                    <FontAwesomeIcon icon={faPlus} />
                                    <span>Add Task to Assignment</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Child Tasks List */}
                            <div className="space-y-2.5">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Problems in this Assignment ({aTasks.length})
                              </p>

                              {aTasks.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                                  No tasks added yet.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {aTasks.map((t, idx) => (
                                    <div
                                      key={t.id}
                                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-brand-500/30 transition-all"
                                    >
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="w-5 h-5 rounded-md bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold">
                                            #{idx + 1}
                                          </span>
                                          <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                                        </div>
                                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                          <span className="uppercase font-mono text-brand-300 font-semibold">{t.language}</span>
                                          <span>•</span>
                                          <span className="text-teal-300 font-semibold">{t.maxPoints} pts</span>
                                          <span>•</span>
                                          <span>{t.testCases?.length || 0} Cases</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => router.push(user?.role === 'STUDENT' ? `/student/exam?taskId=${t.id}` : `/teacher/tasks/${t.id}`)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs font-bold flex items-center space-x-1 shrink-0 transition-all"
                                      >
                                        <FontAwesomeIcon icon={faCode} className="text-[10px]" />
                                        <span>Solve / IDE</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 🎓 GROUP 3: EXAMS & ASSESSMENTS */}
              {course.assessments?.filter((a) => a.type === 'EXAM').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-rose-900/40 pb-2">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-rose-400 text-sm" />
                    <h4 className="text-sm font-extrabold text-rose-400 uppercase tracking-wider">
                      Exams & Evaluated Tests
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      ({course.assessments.filter((a) => a.type === 'EXAM').length} Exams)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {course.assessments
                      .filter((a) => a.type === 'EXAM')
                      .map((exam) => {
                        const examTasks = exam.tasks || [];
                        const totalPoints = examTasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

                        return (
                          <div
                            key={exam.id}
                            className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-rose-500/40 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2.5">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                                    <FontAwesomeIcon icon={faGraduationCap} />
                                    <span>EXAM ASSESSMENT</span>
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    exam.status === 'RUNNING' ? 'text-teal-400 animate-pulse'
                                    : exam.status === 'FINISHED' ? 'text-slate-500'
                                    : 'text-amber-400'
                                  }`}>
                                    {exam.status}
                                  </span>
                                  <span className="text-xs text-slate-400 font-semibold">
                                    {examTasks.length} Problems ({totalPoints} pts) • {exam.durationMin || 60} mins
                                  </span>
                                </div>
                                <h4 className="text-base font-black text-white">{exam.title}</h4>
                                {exam.description && (
                                  <p className="text-xs text-slate-400 line-clamp-2">{exam.description}</p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2.5 shrink-0">
                                {isTeacherOrAdmin ? (
                                  <>
                                    <button
                                      onClick={() => router.push(`/teacher/tasks/new?courseId=${course.id}&assessmentId=${exam.id}`)}
                                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                                    >
                                      <FontAwesomeIcon icon={faPlus} />
                                      <span>Add Problem</span>
                                    </button>
                                    <button
                                      onClick={() => router.push(`/teacher/assessments/${exam.id}/arena`)}
                                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
                                    >
                                      Manage Arena ({exam._count?.participants || 0})
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => router.push(`/student/assessments/${exam.id}`)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/20"
                                  >
                                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    <span>Join Arena</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Child Tasks List */}
                            <div className="space-y-2.5">
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Problems in this Exam ({examTasks.length})
                              </p>

                              {examTasks.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                                  No problems added to this exam yet.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {examTasks.map((t, idx) => (
                                    <div
                                      key={t.id}
                                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-rose-500/30 transition-all"
                                    >
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">
                                            #{idx + 1}
                                          </span>
                                          <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                                        </div>
                                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                          <span className="uppercase font-mono text-rose-300 font-semibold">{t.language}</span>
                                          <span>•</span>
                                          <span className="text-teal-300 font-semibold">{t.maxPoints} pts</span>
                                          <span>•</span>
                                          <span>{t.testCases?.length || 0} Cases</span>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => router.push(user?.role === 'STUDENT' ? `/student/exam?taskId=${t.id}` : `/teacher/tasks/${t.id}`)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold flex items-center space-x-1 shrink-0 transition-all"
                                      >
                                        <FontAwesomeIcon icon={faCode} className="text-[10px]" />
                                        <span>Solve / IDE</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 📂 GROUP 4: STANDALONE TASKS (if any) */}
              {course.tasks?.filter((t) => !t.assessmentId && !course.assessments?.some((a) => a.tasks?.some((at) => at.id === t.id))).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <FontAwesomeIcon icon={faTasks} className="text-slate-400 text-sm" />
                    <h4 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
                      Standalone Problem Tasks
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.tasks
                      .filter((t) => !t.assessmentId && !course.assessments?.some((a) => a.tasks?.some((at) => at.id === t.id)))
                      .map((task) => (
                        <div
                          key={task.id}
                          className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-brand-500/40 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                                {task.taskType}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">{task.maxPoints} Points</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-100">{task.title}</h4>
                          </div>

                          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                            <button
                              onClick={() => router.push(user?.role === 'STUDENT' ? `/student/exam?taskId=${task.id}` : `/teacher/tasks/${task.id}`)}
                              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold"
                            >
                              Open Task
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: MATERIALS (AGGREGATED & SORTED) */}
      {activeTab === 'materials' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Course Materials & References Hub</h3>
              <p className="text-xs text-slate-400 mt-0.5">Aggregated course slides, PDFs, Google Drive files, and post-linked attachments</p>
            </div>
            {isTeacherOrAdmin && (
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setShowDrivePicker(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <FontAwesomeIcon icon={faCloud} />
                  <span>Google Drive Upload & Fetch</span>
                </button>
                <button
                  onClick={() => setShowMaterialModal(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  title="Upload via direct link or custom URL"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>Manual Link</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 1: Direct Course Materials */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-brand-400 uppercase tracking-wider border-b border-brand-500/30 pb-2">
              📁 Institutional Course Documents ({directMaterials.length})
            </h4>

            {directMaterials.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-950/40">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mx-auto">
                  <FontAwesomeIcon icon={faCloud} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">No course materials added yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Upload slides or link documents directly from your synced Google Drive.</p>
                </div>
                {isTeacherOrAdmin && (
                  <button
                    onClick={() => setShowDrivePicker(true)}
                    className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                  >
                    Open Google Drive Hub
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {directMaterials.map((mat) => {
                  const isGDrive = mat.fileUrl.includes('drive.google.com') || mat.fileUrl.includes('docs.google.com');
                  return (
                    <div key={mat.id} className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${
                          isGDrive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                        }`}>
                          <FontAwesomeIcon icon={isGDrive ? faCloud : faFileAlt} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold text-slate-200">{mat.title}</h4>
                            {isGDrive && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                                Google Drive
                              </span>
                            )}
                          </div>
                          {mat.description && <p className="text-[11px] text-slate-400 mt-0.5">{mat.description}</p>}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Uploaded by {mat.uploader?.fullName} • {new Date(mat.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <a
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} />
                          <span>{isGDrive ? 'Open in Drive' : 'View / Download'}</span>
                        </a>
                        {isTeacherOrAdmin && (
                          <button
                            onClick={() => handleDeleteMaterial(mat.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors text-xs"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Post Attachments & Aggregated Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider border-b border-teal-500/30 pb-2">
              📌 Stream Post Attachments & Shared Resources ({postAttachedMaterials.length})
            </h4>

            {postAttachedMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No attachments shared in stream posts yet.</p>
            ) : (
              <div className="space-y-3">
                {postAttachedMaterials.map((mat) => (
                  <div key={mat.id} className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 text-lg">
                        <FontAwesomeIcon icon={faPaperclip} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{mat.title}</h4>
                        {mat.description && <p className="text-[11px] text-slate-400">{mat.description}</p>}
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Stream Attachment • {new Date(mat.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-lg text-xs font-medium flex items-center space-x-1.5"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                      <span>Open Link</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PEOPLE */}
      {activeTab === 'people' && (
        <div className="space-y-8">
          {/* Teachers Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-brand-400 tracking-wider uppercase border-b border-brand-500/30 pb-2">
              Teachers & Instructors
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-brand-800 flex items-center justify-center text-white font-bold text-base shadow-lg">
                  {course.teacher.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                    <span>{course.teacher.fullName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                      Lead Instructor
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{course.teacher.email}</p>
                </div>
              </div>

              {course.ta && (
                <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 to-teal-800 flex items-center justify-center text-white font-bold text-base shadow-lg">
                    {course.ta.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                      <span>{course.ta.fullName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                        Teaching Assistant
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{course.ta.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enrolled Students Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase">
                Enrolled Classmates ({course.enrollments?.length || 0})
              </h3>
              {isTeacherOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <FontAwesomeIcon icon={faFileUpload} />
                  <span>Enroll Students (CSV / Bulk)</span>
                </button>
              )}
            </div>

            {course.enrollments?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No students enrolled in this classroom yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {course.enrollments?.map((e) => (
                  <div key={e.student.id} className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                      {e.student.fullName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">{e.student.fullName}</h4>
                      <p className="text-[10px] font-mono text-teal-400 truncate">{e.student.studentProfile?.studentId || e.student.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: GRADES */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          <h3 className="text-base font-bold text-white">Classroom Performance & Grades</h3>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <p className="text-xs text-slate-400 font-medium">Total Tasks</p>
                <p className="text-2xl font-black text-white mt-1">{course.tasks?.length || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <p className="text-xs text-slate-400 font-medium">Total Possible Credit</p>
                <p className="text-2xl font-black text-brand-400 mt-1">
                  {course.tasks?.reduce((sum, t) => sum + t.maxPoints, 0) || 0} Pts
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <p className="text-xs text-slate-400 font-medium">Class Members</p>
                <p className="text-2xl font-black text-teal-400 mt-1">{course.enrollments?.length || 0}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center py-6">
              <FontAwesomeIcon icon={faAward} className="text-3xl text-amber-400 mb-2" />
              <p className="text-xs text-slate-300">Gradebook syncing active. Complete tasks to record real-time point evaluation.</p>
            </div>
          </div>
        </div>
      )}

      {/* RICH POST COMPOSER MODAL */}
      <RichPostComposer
        courseId={course.id}
        isOpen={showRichComposer}
        onClose={() => {
          setShowRichComposer(false);
          setEditingPost(null);
        }}
        onPostCreated={fetchCourse}
        editPost={editingPost ? {
          id: editingPost.id,
          body: editingPost.body,
          language: editingPost.language,
          isRunnable: editingPost.isRunnable,
          materials: editingPost.materials,
        } : undefined}
      />

      {/* ADD DIRECT MATERIAL MODAL */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Upload Class Material</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Material Title</label>
              <input
                type="text"
                required
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="Lecture 01 - Object Oriented Concepts"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={materialDesc}
                onChange={(e) => setMaterialDesc(e.target.value)}
                placeholder="Class slides and reference reading..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Resource / Document URL</label>
              <input
                type="url"
                required
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="https://drive.google.com/... or document URL"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMaterial}
                disabled={!materialTitle.trim() || !materialUrl.trim() || isAddingMaterial}
                className="px-5 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                Save Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE HUB MODAL */}
      <GoogleDrivePickerModal
        isOpen={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        onSelectMaterials={handleSelectDriveMaterials}
        courseTitle={course?.title}
        allowMultiple={true}
      />

      {/* ENROLL STUDENTS BULK MODAL */}
      {course && (
        <EnrollStudentsModal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          courseId={course.id}
          classroomTitle={course.title}
          subjectCode={course.subjectCode}
          onSuccess={fetchCourse}
        />
      )}

      {/* QUICK ASSESSMENT / LAB CREATION MODAL */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-slate-700 shadow-2xl space-y-5 bg-slate-900/95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon
                  icon={assessmentType === 'LAB' ? faFlask : assessmentType === 'ASSIGNMENT' ? faBookOpen : faGraduationCap}
                  className={`text-base ${
                    assessmentType === 'LAB' ? 'text-emerald-400' : assessmentType === 'ASSIGNMENT' ? 'text-brand-400' : 'text-rose-400'
                  }`}
                />
                <h3 className="text-base font-bold text-white">
                  Create New {assessmentType === 'LAB' ? 'Lab Session' : assessmentType === 'ASSIGNMENT' ? 'Assignment' : 'Exam Assessment'}
                </h3>
              </div>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Coursework Module Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['LAB', 'ASSIGNMENT', 'EXAM'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAssessmentType(t)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 ${
                        assessmentType === t
                          ? t === 'LAB'
                            ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                            : t === 'ASSIGNMENT'
                            ? 'bg-brand-600/30 text-brand-300 border-brand-500'
                            : 'bg-rose-600/30 text-rose-300 border-rose-500'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <FontAwesomeIcon icon={t === 'LAB' ? faFlask : t === 'ASSIGNMENT' ? faBookOpen : faGraduationCap} />
                      <span>{t === 'LAB' ? 'Lab' : t === 'ASSIGNMENT' ? 'Assignment' : 'Exam'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    assessmentType === 'LAB'
                      ? 'e.g. Lab 03 - Graph Algorithms & DFS'
                      : assessmentType === 'ASSIGNMENT'
                      ? 'e.g. Assignment 02 - Banking System Architecture'
                      : 'e.g. Final Exam 2026 - Data Structures'
                  }
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Instructions / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of this lab session or assignment requirements..."
                  value={assessmentDesc}
                  onChange={(e) => setAssessmentDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              {/* Duration for Labs / Exams */}
              {(assessmentType === 'LAB' || assessmentType === 'EXAM') && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Allocated Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={480}
                    value={assessmentDuration}
                    onChange={(e) => setAssessmentDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Defines the live arena or lab session timer (e.g. 120 mins = 2 hours).
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assessmentTitle.trim() || isCreatingAssessment}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-lg shadow-brand-600/30 transition-all"
                >
                  {isCreatingAssessment ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlus} />
                      <span>Create & Add Problems</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
