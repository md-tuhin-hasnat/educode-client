'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileUpload } from '@fortawesome/free-solid-svg-icons';

interface PersonUser {
  id: string;
  fullName: string;
  email: string;
  profilePicUrl?: string;
  studentProfile?: { studentId: string };
}

interface ClassroomPeopleTabProps {
  teacher: { id: string; fullName: string; email: string; profilePicUrl?: string };
  ta?: { id: string; fullName: string; email: string; profilePicUrl?: string } | null;
  enrollments?: Array<{ student: PersonUser }>;
  isTeacherOrAdmin: boolean;
  onOpenEnrollModal: () => void;
}

export function ClassroomPeopleTab({
  teacher,
  ta,
  enrollments = [],
  isTeacherOrAdmin,
  onOpenEnrollModal,
}: ClassroomPeopleTabProps) {
  return (
    <div className="space-y-8">
      {/* Teachers Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-brand-400 tracking-wider uppercase border-b border-brand-500/30 pb-2">
          Teachers & Instructors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-brand-800 flex items-center justify-center text-white font-bold text-base shadow-lg">
              {teacher.fullName.charAt(0)}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                <span>{teacher.fullName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                  Lead Instructor
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{teacher.email}</p>
            </div>
          </div>

          {ta && (
            <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 to-teal-800 flex items-center justify-center text-white font-bold text-base shadow-lg">
                {ta.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>{ta.fullName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                    Teaching Assistant
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{ta.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enrolled Students Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-200 tracking-wider uppercase">
            Enrolled Classmates ({enrollments.length})
          </h3>
          {isTeacherOrAdmin && (
            <button
              type="button"
              onClick={onOpenEnrollModal}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <FontAwesomeIcon icon={faFileUpload} />
              <span>Enroll Students (CSV / Bulk)</span>
            </button>
          )}
        </div>

        {enrollments.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No students enrolled in this classroom yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {enrollments.map((e) => (
              <div
                key={e.student.id}
                className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                  {e.student.fullName.charAt(0)}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{e.student.fullName}</h4>
                  <p className="text-[10px] font-mono text-teal-400 truncate">
                    {e.student.studentProfile?.studentId || e.student.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
