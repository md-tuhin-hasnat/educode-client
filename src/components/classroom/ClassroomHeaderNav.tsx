'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStream,
  faTasks,
  faFolderOpen,
  faUsers,
  faGraduationCap,
  faPlus,
  IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';

interface CourseHeaderDetails {
  id: string;
  subjectCode: string;
  classCode: string;
  title: string;
  creditHours: number;
  section?: { name: string };
  intake?: { label: string };
  teacher: { id: string; fullName: string; email: string };
  ta?: { id: string; fullName: string; email: string } | null;
  streamPosts?: unknown[];
  tasks?: unknown[];
  materials?: unknown[];
  enrollments?: unknown[];
}

interface ClassroomHeaderNavProps {
  course: CourseHeaderDetails;
  activeTab: 'stream' | 'classwork' | 'materials' | 'people' | 'grades';
  setActiveTab: (tab: 'stream' | 'classwork' | 'materials' | 'people' | 'grades') => void;
  isTeacherOrAdmin: boolean;
}

interface TabDef {
  id: 'stream' | 'classwork' | 'materials' | 'people' | 'grades';
  label: string;
  icon: IconDefinition;
  count?: number;
}

export function ClassroomHeaderNav({
  course,
  activeTab,
  setActiveTab,
  isTeacherOrAdmin,
}: ClassroomHeaderNavProps) {
  const router = useRouter();

  const tabs: TabDef[] = [
    { id: 'stream', label: 'Stream', icon: faStream, count: course.streamPosts?.length },
    { id: 'classwork', label: 'Classwork', icon: faTasks, count: course.tasks?.length },
    { id: 'materials', label: 'Materials', icon: faFolderOpen, count: course.materials?.length },
    { id: 'people', label: 'People', icon: faUsers, count: course.enrollments?.length },
    { id: 'grades', label: 'Grades & Submissions', icon: faGraduationCap },
  ];

  return (
    <div className="space-y-6">
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
              <span>
                Lead Teacher: <strong className="text-slate-200">{course.teacher.fullName}</strong>
              </span>
              {course.ta && (
                <span>
                  Teaching Assistant: <strong className="text-teal-400">{course.ta.fullName}</strong>
                </span>
              )}
              <span>
                Credit Hours: <strong className="text-slate-200">{course.creditHours}</strong>
              </span>
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
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className={isActive ? 'text-brand-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-brand-500/30 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
