'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

import { EnrollStudentsModal } from '@/components/EnrollStudentsModal';
import { RichPostComposer } from '@/components/stream/RichPostComposer';
import { GoogleDrivePickerModal, SelectedDriveMaterial } from '@/components/GoogleDrivePickerModal';

import {
  StreamPostItem,
  CourseAssessmentItem,
  CourseTaskItem,
  CourseMaterialItem,
  ClassroomActiveTab,
} from './classroom/types';
import { ClassroomHeaderNav } from './classroom/ClassroomHeaderNav';
import { ClassroomStreamTab } from './classroom/ClassroomStreamTab';
import { ClassroomClassworkTab } from './classroom/ClassroomClassworkTab';
import { ClassroomMaterialsTab } from './classroom/ClassroomMaterialsTab';
import { ClassroomPeopleTab } from './classroom/ClassroomPeopleTab';
import { ClassroomGradesTab } from './classroom/ClassroomGradesTab';
import { CreateAssessmentModal } from './classroom/CreateAssessmentModal';
import { CreateMaterialModal } from './classroom/CreateMaterialModal';

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
  materials: Array<CourseMaterialItem & {
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
  const [activeTab, setActiveTab] = useState<ClassroomActiveTab | 'materials'>('stream');
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
  const roleUpper = (user?.role || '').toUpperCase();
  const isTeacherOrAdmin = roleUpper === 'ADMIN' || roleUpper === 'TEACHER' || roleUpper === 'TA';

  const fetchCourse = useCallback(async () => {
    try {
      const res = await apiClient.get(`/courses/${courseId}`);
      setCourse(res.data);
    } catch (err: unknown) {
      console.error('Error loading classroom details:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load classroom details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create assessment module';
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
      course.enrollments.forEach((enr) => {
        users.push({ id: enr.student.id, name: enr.student.fullName, role: 'Student' });
      });
    }
    return users;
  }, [course]);

  // Deep-link: read tab & postId from URL query params
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
      const timer = setTimeout(() => {
        const el = document.getElementById(`stream-post-${highlightPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-teal-400/60');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-teal-400/60');
            setHighlightPostId(null);
          }, 4000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightPostId, course, activeTab]);

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

    socket.on('newPost', () => fetchCourse());
    socket.on('postUpdated', () => fetchCourse());
    socket.on('postDeleted', () => fetchCourse());
    socket.on('newComment', () => fetchCourse());
    socket.on('commentDeleted', () => fetchCourse());
    socket.on('commentUpdated', () => fetchCourse());

    return () => {
      socket.disconnect();
    };
  }, [courseId, fetchCourse]);

  const handleOpenNewComposer = () => {
    if (!isTeacherOrAdmin) return;
    setEditingPost(null);
    setShowRichComposer(true);
  };

  const handleEditPost = (post: StreamPostItem) => {
    if (!isTeacherOrAdmin) return;
    setEditingPost(post);
    setShowRichComposer(true);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this announcement post?')) return;
    try {
      await apiClient.delete(`/stream/posts/${postId}`);
      fetchCourse();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete post';
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add material';
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
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to attach Google Drive materials';
      alert(msg);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to remove this class material?')) return;
    try {
      await apiClient.delete(`/courses/materials/${materialId}`);
      fetchCourse();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to delete material';
      alert(msg);
    }
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

  return (
    <div className="space-y-6 pb-12">
      {/* Classroom Hero Header Banner & Navigation */}
      <ClassroomHeaderNav
        course={course}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isTeacherOrAdmin={isTeacherOrAdmin}
      />

      {/* Tab: Stream */}
      {activeTab === 'stream' && (
        <ClassroomStreamTab
          streamPosts={course.streamPosts}
          tasks={course.tasks}
          currentUser={user}
          isTeacherOrAdmin={isTeacherOrAdmin}
          highlightPostId={highlightPostId}
          onOpenNewComposer={handleOpenNewComposer}
          onEditPost={handleEditPost}
          onDeletePost={handleDeletePost}
          onRefreshCourse={fetchCourse}
          mentionableUsers={mentionableUsers}
        />
      )}

      {/* Tab: Classwork */}
      {activeTab === 'classwork' && (
        <ClassroomClassworkTab
          courseId={course.id}
          assessments={course.assessments}
          tasks={course.tasks}
          isTeacherOrAdmin={isTeacherOrAdmin}
          userRole={user?.role}
          onOpenCreateAssessment={(type) => {
            setAssessmentType(type);
            setShowAssessmentModal(true);
          }}
        />
      )}

      {/* Tab: Materials */}
      {activeTab === 'materials' && (
        <ClassroomMaterialsTab
          materials={course.materials}
          isTeacherOrAdmin={isTeacherOrAdmin}
          onOpenDrivePicker={() => setShowDrivePicker(true)}
          onOpenMaterialModal={() => setShowMaterialModal(true)}
          onDeleteMaterial={handleDeleteMaterial}
        />
      )}

      {/* Tab: People */}
      {activeTab === 'people' && (
        <ClassroomPeopleTab
          teacher={course.teacher}
          ta={course.ta}
          enrollments={course.enrollments}
          isTeacherOrAdmin={isTeacherOrAdmin}
          onOpenEnrollModal={() => setShowEnrollModal(true)}
        />
      )}

      {/* Tab: Grades */}
      {activeTab === 'grades' && (
        <ClassroomGradesTab
          tasks={course.tasks}
          assessments={course.assessments}
          enrollmentCount={course.enrollments?.length || 0}
        />
      )}

      {/* Modals */}
      <RichPostComposer
        courseId={course.id}
        isOpen={showRichComposer}
        onClose={() => {
          setShowRichComposer(false);
          setEditingPost(null);
        }}
        onPostCreated={fetchCourse}
        editPost={
          editingPost
            ? {
                id: editingPost.id,
                body: editingPost.body,
                codeSnippet: editingPost.codeSnippet,
                language: editingPost.language,
                isRunnable: editingPost.isRunnable,
                taskId: editingPost.taskId || editingPost.task?.id || undefined,
                materials: editingPost.materials,
              }
            : undefined
        }
      />

      <CreateMaterialModal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        onSubmit={handleAddMaterial}
        materialTitle={materialTitle}
        setMaterialTitle={setMaterialTitle}
        materialDesc={materialDesc}
        setMaterialDesc={setMaterialDesc}
        materialUrl={materialUrl}
        setMaterialUrl={setMaterialUrl}
        isAdding={isAddingMaterial}
      />

      <CreateAssessmentModal
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        onSubmit={handleCreateAssessment}
        assessmentType={assessmentType}
        setAssessmentType={setAssessmentType}
        assessmentTitle={assessmentTitle}
        setAssessmentTitle={setAssessmentTitle}
        assessmentDesc={assessmentDesc}
        setAssessmentDesc={setAssessmentDesc}
        assessmentDuration={assessmentDuration}
        setAssessmentDuration={setAssessmentDuration}
        isCreating={isCreatingAssessment}
      />

      <GoogleDrivePickerModal
        isOpen={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        onSelectMaterials={handleSelectDriveMaterials}
      />

      <EnrollStudentsModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        courseId={course.id}
        classroomTitle={course.title}
        subjectCode={course.subjectCode}
        onSuccess={fetchCourse}
      />
    </div>
  );
};

export default ClassroomHub;
