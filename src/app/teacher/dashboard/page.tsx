'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faUsers,
  faClipboardList,
  faServer,
  faChalkboardTeacher,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';

interface ClassroomItem {
  id: string;
  subjectCode: string;
  code: string;
  title: string;
  classCode: string;
  teacher?: { fullName: string };
  ta?: { fullName: string } | null;
  _count?: {
    enrollments: number;
    tasks: number;
    materials: number;
  };
}

export default function TeacherDashboardPage() {
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeacherClassrooms() {
      try {
        setLoading(true);
        const res = await api.get('/courses');
        setClassrooms(res.data);
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    }
    fetchTeacherClassrooms();
  }, []);

  const totalStudents = classrooms.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
  const totalTasks = classrooms.reduce((sum, c) => sum + (c._count?.tasks || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Faculty Management Workspace</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Instructor Control Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access your assigned institutional classrooms, create exams & assignments, and manage stream announcements.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2 text-xs">
            <FontAwesomeIcon icon={faServer} className={isConnected ? 'text-emerald-400' : 'text-slate-500'} />
            <span className="text-slate-300">{isConnected ? 'Live Backend Connected' : 'Offline / Standalone Mode'}</span>
          </div>
          <Link
            href="/teacher/tasks/new"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 flex items-center space-x-2 transition-all"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Create New Task</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Enrolled Students</p>
            <p className="text-lg font-bold text-white">{totalStudents}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
            <FontAwesomeIcon icon={faClipboardList} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Total Tasks/Exams</p>
            <p className="text-lg font-bold text-white">{totalTasks}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg">
            <FontAwesomeIcon icon={faChalkboardTeacher} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">My Classrooms</p>
            <p className="text-lg font-bold text-purple-300">{classrooms.length}</p>
          </div>
        </div>
      </div>

      {/* Assigned Classrooms Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">My Institutional Classrooms</h2>
        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center">Loading classrooms...</p>
        ) : classrooms.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
            No assigned classrooms. Contact your Administrator to assign you to a classroom.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((c) => (
              <div key={c.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-brand-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-mono font-bold">
                      {c.subjectCode || c.code}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      Code: {c.classCode}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2.5">{c.title}</h3>

                  {c.ta && (
                    <p className="text-xs text-amber-400 mt-1 font-medium">
                      TA: {c.ta.fullName}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span><strong className="text-slate-200">{c._count?.enrollments || 0}</strong> Students</span>
                    <span>•</span>
                    <span><strong className="text-slate-200">{c._count?.tasks || 0}</strong> Tasks</span>
                  </div>

                  <Link
                    href={`/teacher/classrooms/${c.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 flex items-center space-x-1.5 transition-all"
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
    </div>
  );
}
