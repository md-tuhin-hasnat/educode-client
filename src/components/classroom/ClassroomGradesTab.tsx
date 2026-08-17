'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAward,
  faFlask,
  faBookOpen,
  faGraduationCap,
  faUsers,
  faListCheck,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { CourseAssessmentItem, CourseTaskItem } from './types';
import { AssessmentSubmissionsModal } from './AssessmentSubmissionsModal';

interface ClassroomGradesTabProps {
  tasks?: CourseTaskItem[];
  assessments?: CourseAssessmentItem[];
  enrollmentCount: number;
}

export function ClassroomGradesTab({
  tasks = [],
  assessments = [],
  enrollmentCount,
}: ClassroomGradesTabProps) {
  const [selectedAssessment, setSelectedAssessment] = useState<{
    id: string;
    title: string;
    type?: string;
  } | null>(null);

  const totalPossibleCredit = tasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div>
        <h3 className="text-base font-extrabold text-white">Classroom Performance & Assessment Submissions</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Select any Lab, Assignment, or Exam to inspect student submissions grouped by Student ID and manage re-submission permissions.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-semibold">Total Assessments</p>
            <p className="text-2xl font-black text-white mt-1">{assessments.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-semibold">Total Problem Tasks</p>
            <p className="text-2xl font-black text-white mt-1">{tasks.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-semibold">Total Possible Points</p>
            <p className="text-2xl font-black text-brand-400 mt-1">{totalPossibleCredit} Pts</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-semibold">Enrolled Students</p>
            <p className="text-2xl font-black text-teal-400 mt-1">{enrollmentCount}</p>
          </div>
        </div>
      </div>

      {/* Assessment Submissions Browser */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <FontAwesomeIcon icon={faListCheck} className="text-teal-400 text-sm" />
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Check Submissions by Assessment
          </h4>
        </div>

        {assessments.length === 0 ? (
          <div className="py-12 text-center glass-panel rounded-3xl border border-slate-800 space-y-2">
            <FontAwesomeIcon icon={faAward} className="text-3xl text-slate-600 mb-1" />
            <p className="text-sm font-bold text-slate-300">No assessments created in this classroom yet</p>
            <p className="text-xs text-slate-500">Create a Lab, Assignment, or Exam from the Classwork tab to evaluate submissions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((a) => {
              const taskCount = a.tasks?.length || 0;
              const assessmentPoints = (a.tasks || []).reduce((sum, t) => sum + (t.maxPoints || 0), 0);

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssessment({ id: a.id, title: a.title, type: a.type })}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between space-y-4 group shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1 ${
                          a.type === 'LAB'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : a.type === 'EXAM'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={a.type === 'LAB' ? faFlask : a.type === 'EXAM' ? faGraduationCap : faBookOpen}
                        />
                        <span>{a.type}</span>
                      </span>

                      <span className="text-xs font-mono font-bold text-amber-400">
                        {assessmentPoints} pts
                      </span>
                    </div>

                    <h5 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-teal-300 transition-colors">
                      {a.title}
                    </h5>

                    {a.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{a.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                    <span className="text-slate-400 font-semibold">
                      {taskCount} {taskCount === 1 ? 'Problem' : 'Problems'}
                    </span>

                    <span className="text-teal-400 font-bold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                      <FontAwesomeIcon icon={faUsers} className="text-[11px]" />
                      <span>Check Submissions</span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assessment Submissions Modal */}
      {selectedAssessment && (
        <AssessmentSubmissionsModal
          isOpen={true}
          onClose={() => setSelectedAssessment(null)}
          assessmentId={selectedAssessment.id}
          assessmentTitle={selectedAssessment.title}
          assessmentType={selectedAssessment.type}
        />
      )}
    </div>
  );
}
