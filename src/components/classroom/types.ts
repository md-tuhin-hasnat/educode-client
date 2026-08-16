import { CommentData } from '@/components/stream/StreamComments';

export interface StreamPostAttachment {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeKb: number;
  mimeType: string;
}

export interface StreamPostItem {
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

export interface CourseTaskItem {
  id: string;
  title: string;
  description?: string;
  taskType?: 'assignment' | 'exam' | 'lab' | string;
  language?: string;
  maxPoints: number;
  deadline?: string;
  isExam?: boolean;
  examDurationMin?: number;
  isPublished?: boolean;
  assessmentId?: string | null;
  assessment?: { id: string; title: string; type: string } | null;
  testCases?: Array<{ id: number; points: number; isHidden: boolean }>;
  _count?: { submissions: number };
  submissions?: { id: string; score: number; status: string; studentId: string }[];
}

export interface CourseAssessmentItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  status?: string;
  startTime?: string;
  durationMin?: number;
  createdAt?: string;
  tasks?: CourseTaskItem[];
  _count?: { participants: number; tasks: number };
}

export interface CourseMaterialItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileSizeKb: number;
  mimeType: string;
  createdAt: string;
}

export interface CourseData {
  id: string;
  code: string;
  title: string;
  description?: string;
  department?: { name: string };
  teacher?: { id: string; fullName: string; email: string };
  tas?: { id: string; fullName: string; email: string }[];
  enrollments?: { student: { id: string; fullName: string; email: string; studentId?: string } }[];
  tasks?: CourseTaskItem[];
  materials?: CourseMaterialItem[];
}

export type ClassroomActiveTab = 'stream' | 'classwork' | 'people' | 'grades';
