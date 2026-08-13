'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faClock,
  faPlay,
  faServer,
  faExternalLinkAlt,
  faBookOpen,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';

interface StudentClassroom {
  id: string;
  subjectCode: string;
  code: string;
  title: string;
  classCode: string;
  teacher?: { fullName: string; email: string };
  ta?: { fullName: string } | null;
  _count?: {
    tasks: number;
    materials: number;
  };
}

interface ExamTask {
  id: string;
  title: string;
  course: string;
  durationMinutes: number;
  language: string;
  status: string;
  deadline: string;
}

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<StudentClassroom[]>([]);
  const [activeExams, setActiveExams] = useState<ExamTask[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudentDashboardData() {
      try {
        setLoading(true);
        const [coursesRes, tasksRes] = await Promise.all([
          api.get('/courses'),
          api.get('/tasks'),
        ]);

        setClassrooms(coursesRes.data);

        if (Array.isArray(tasksRes.data)) {
          const liveExams = tasksRes.data.map((t: { id: string; title?: string; course?: { subjectCode?: string; code?: string }; durationMinutes?: number; allowedLanguages?: string[]; status?: string; dueDate?: string }) => ({
            id: t.id,
            title: t.title || 'Practical Coding Task',
            course: t.course?.subjectCode || t.course?.code || 'CSE-201',
            durationMinutes: t.durationMinutes || 120,
            language: t.allowedLanguages?.[0] || 'cpp',
            status: t.status || 'AVAILABLE',
            deadline: t.dueDate ? new Date(t.dueDate).toLocaleString() : 'Open',
          }));
          setActiveExams(liveExams);
        }

        setIsConnected(true);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-tealAccent-400">
            <span className="w-2 h-2 rounded-full bg-tealAccent-400 animate-pulse"></span>
            <span>Student Academic Workspace</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Welcome back, {user?.name || 'Student'}!</h1>
          <p className="text-xs text-slate-400 mt-1">
            You are enrolled in <strong className="text-tealAccent-300 font-semibold">{classrooms.length} institutional classrooms</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2 text-xs">
            <FontAwesomeIcon icon={faServer} className={isConnected ? 'text-emerald-400' : 'text-slate-500'} />
            <span className="text-slate-300">{isConnected ? 'Live Backend Connected' : 'Offline / Standalone Mode'}</span>
          </div>
        </div>
      </div>

      {/* Enrolled Classrooms Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My Institutional Classrooms</h2>
        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center">Loading classrooms...</p>
        ) : classrooms.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
            No enrolled classrooms found. Contact your Administrator to assign you to your subject classrooms.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((c) => (
              <div
                key={c.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-tealAccent-400/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-tealAccent-500/20 text-tealAccent-300 border border-tealAccent-500/30 text-[11px] font-mono font-bold">
                      {c.subjectCode || c.code}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      Code: {c.classCode}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2.5">{c.title}</h3>

                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                    <p>Instructor: <strong className="text-slate-200">{c.teacher?.fullName || 'Assigned Instructor'}</strong></p>
                    {c.ta && <p className="text-amber-400">TA: {c.ta.fullName}</p>}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <FontAwesomeIcon icon={faCode} className="text-tealAccent-400" />
                      <span>{c._count?.tasks || 0} Tasks</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <FontAwesomeIcon icon={faBookOpen} className="text-brand-400" />
                      <span>{c._count?.materials || 0} Materials</span>
                    </span>
                  </div>

                  <Link
                    href={`/student/classrooms/${c.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-tealAccent-600 hover:from-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-600/20 flex items-center space-x-1.5 transition-all"
                  >
                    <span>Open Hub</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Tasks & Exams */}
      <div id="tasks" className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Tasks & Examinations</h2>
        {activeExams.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-slate-800 p-6 text-center text-slate-400 text-xs">
            No active exams or tasks scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeExams.map((exam) => (
              <div
                key={exam.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                      {exam.course}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <FontAwesomeIcon icon={faClock} />
                      <span>{exam.durationMinutes} mins</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2">{exam.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Allowed Language: <strong className="text-slate-200">{exam.language}</strong></p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Deadline: {exam.deadline}</span>
                  <Link
                    href={`/student/exam?taskId=${exam.id}`}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all"
                  >
                    <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                    <span>Launch Exam IDE</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
