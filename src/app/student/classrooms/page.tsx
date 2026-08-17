'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChalkboardTeacher,
  faCode,
  faBookOpen,
  faExternalLinkAlt,
  faSearch,
  faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';

interface StudentClassroom {
  id: string;
  subjectCode: string;
  code: string;
  title: string;
  classCode: string;
  department?: { name: string; code: string };
  section?: { name: string };
  teacher?: { fullName: string; email: string };
  ta?: { fullName: string } | null;
  _count?: {
    tasks: number;
    materials: number;
    streamPosts: number;
  };
}

export default function StudentClassroomsDirectoryPage() {
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<StudentClassroom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassrooms() {
      try {
        setLoading(true);
        const res = await api.get('/courses');
        setClassrooms(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load classrooms:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClassrooms();
  }, []);

  const filteredClassrooms = classrooms.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.subjectCode || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.teacher?.fullName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-teal-400">
            <FontAwesomeIcon icon={faGraduationCap} />
            <span>Student Academic Portal</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">My Assigned Classrooms</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and access all academic courses and subject classrooms you are enrolled in.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classrooms or instructor..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 focus:border-teal-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Classrooms Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading classrooms...</div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs space-y-2">
          <FontAwesomeIcon icon={faChalkboardTeacher} className="text-4xl text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-200">No Assigned Classrooms Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `No classrooms matching "${searchQuery}".`
              : 'You are not assigned to any classrooms yet. Contact your administrator or academic advisor.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClassrooms.map((c) => (
            <div
              key={c.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-teal-400/50 transition-all flex flex-col justify-between shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-mono font-bold">
                    {c.subjectCode || c.code}
                  </span>
                  <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                    {c.section ? `Sec: ${c.section.name}` : `Code: ${c.classCode}`}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3 line-clamp-2">{c.title}</h3>

                <div className="text-xs text-slate-400 mt-2.5 space-y-1">
                  <p>
                    Instructor:{' '}
                    <strong className="text-slate-200">
                      {c.teacher?.fullName || 'Assigned Instructor'}
                    </strong>
                  </p>
                  {c.ta && <p className="text-amber-400">TA: {c.ta.fullName}</p>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <FontAwesomeIcon icon={faCode} className="text-teal-400" />
                    <span>{c._count?.tasks || 0} Tasks</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <FontAwesomeIcon icon={faBookOpen} className="text-brand-400" />
                    <span>{c._count?.materials || 0}</span>
                  </span>
                </div>

                <Link
                  href={`/student/classrooms/${c.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-teal-600/20 flex items-center space-x-1.5 transition-all"
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
  );
}
