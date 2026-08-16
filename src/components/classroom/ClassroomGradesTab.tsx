'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAward } from '@fortawesome/free-solid-svg-icons';
import { CourseTaskItem } from './types';

interface ClassroomGradesTabProps {
  tasks?: CourseTaskItem[];
  enrollmentCount: number;
}

export function ClassroomGradesTab({
  tasks = [],
  enrollmentCount,
}: ClassroomGradesTabProps) {
  const totalPossibleCredit = tasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold text-white">Classroom Performance & Grades</h3>

      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-medium">Total Tasks</p>
            <p className="text-2xl font-black text-white mt-1">{tasks.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-medium">Total Possible Credit</p>
            <p className="text-2xl font-black text-brand-400 mt-1">{totalPossibleCredit} Pts</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-medium">Class Members</p>
            <p className="text-2xl font-black text-teal-400 mt-1">{enrollmentCount}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-center py-6">
          <FontAwesomeIcon icon={faAward} className="text-3xl text-amber-400 mb-2" />
          <p className="text-xs text-slate-300">
            Gradebook syncing active. Complete tasks to record real-time point evaluation.
          </p>
        </div>
      </div>
    </div>
  );
}
