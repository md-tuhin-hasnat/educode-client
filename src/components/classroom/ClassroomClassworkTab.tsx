import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlask,
  faBookOpen,
  faGraduationCap,
  faPlus,
  faCode,
  faExternalLinkAlt,
  faUsers,
  faClock,
  faRocket,
  faLaptopCode,
  faSliders,
  faLock,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { CourseAssessmentItem, CourseTaskItem } from './types';
import { AssessmentSubmissionsModal } from './AssessmentSubmissionsModal';

interface ClassroomClassworkTabProps {
  courseId: string;
  assessments?: CourseAssessmentItem[];
  tasks?: CourseTaskItem[];
  isTeacherOrAdmin: boolean;
  userRole?: string;
  onOpenCreateAssessment: (type: 'LAB' | 'ASSIGNMENT' | 'EXAM') => void;
}

export function ClassroomClassworkTab({
  courseId,
  assessments = [],
  tasks = [],
  isTeacherOrAdmin,
  userRole,
  onOpenCreateAssessment,
}: ClassroomClassworkTabProps) {
  const router = useRouter();
  const [selectedSubmissionsAssessment, setSelectedSubmissionsAssessment] = useState<{
    id: string;
    title: string;
    type: 'LAB' | 'ASSIGNMENT' | 'EXAM';
  } | null>(null);

  const labs = assessments.filter((a) => a.type === 'LAB');
  const assignments = assessments.filter((a) => a.type === 'ASSIGNMENT');
  const exams = assessments.filter((a) => a.type === 'EXAM');

  return (
    <div className="space-y-8">
      {/* Header & Quick Creation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-white">Coursework, Labs & Assessments</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive lab sessions, homework assignments, and exams containing programming problems.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenCreateAssessment('LAB')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <FontAwesomeIcon icon={faFlask} />
              <span>+ New Lab</span>
            </button>

            <button
              onClick={() => onOpenCreateAssessment('ASSIGNMENT')}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-brand-600/20 transition-all"
            >
              <FontAwesomeIcon icon={faBookOpen} />
              <span>+ New Assignment</span>
            </button>

            <button
              onClick={() => onOpenCreateAssessment('EXAM')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-rose-600/20 transition-all"
            >
              <FontAwesomeIcon icon={faGraduationCap} />
              <span>+ New Exam</span>
            </button>
          </div>
        )}
      </div>

      {!assessments.length && !tasks.length ? (
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
          {labs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-emerald-900/40 pb-2">
                <FontAwesomeIcon icon={faFlask} className="text-emerald-400 text-sm" />
                <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
                  Laboratory Sessions & Hands-on Practicals
                </h4>
                <span className="text-[11px] font-bold text-slate-500">
                  ({labs.length} {labs.length === 1 ? 'Lab' : 'Labs'})
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {labs.map((lab) => {
                  const labTasks: CourseTaskItem[] = lab.tasks || [];
                  const totalPoints = labTasks.reduce((sum: number, t: CourseTaskItem) => sum + (t.maxPoints || 0), 0);
                  const labDuration = lab.durationMin || 90;

                  return (
                    <div
                      key={lab.id}
                      className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-emerald-500/40 transition-all relative group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                              <FontAwesomeIcon icon={faFlask} />
                              <span>LAB SESSION</span>
                            </span>

                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-teal-300 text-[11px] font-mono font-bold flex items-center space-x-1.5 shadow-inner">
                              <FontAwesomeIcon icon={faClock} className="text-[10px] text-teal-400" />
                              <span>Total Time: {labDuration} mins</span>
                            </span>

                            <span className="text-xs text-slate-400 font-semibold">
                              {labTasks.length} {labTasks.length === 1 ? 'Problem' : 'Problems'} ({totalPoints} pts)
                            </span>
                          </div>

                          <h4 className="text-lg font-black text-white">{lab.title}</h4>
                          {lab.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl leading-relaxed">{lab.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
                          {isTeacherOrAdmin ? (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedSubmissionsAssessment({
                                    id: lab.id,
                                    title: lab.title,
                                    type: 'LAB',
                                  })
                                }
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="View and manage student submissions"
                              >
                                <FontAwesomeIcon icon={faUsers} />
                                <span>Check Submissions</span>
                              </button>

                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${lab.id}`)
                                }
                                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Add Task</span>
                              </button>

                              <button
                                onClick={() => router.push(`/teacher/assessments/${lab.id}/arena`)}
                                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 flex items-center space-x-1.5"
                              >
                                <FontAwesomeIcon icon={faSliders} />
                                <span>Manage Lab ({lab._count?.participants || 0})</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => router.push(`/student/assessments/${lab.id}/arena`)}
                              className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-all transform hover:-translate-y-0.5 ${
                                lab.status === 'FINISHED'
                                  ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white shadow-none'
                                  : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
                              }`}
                            >
                              <FontAwesomeIcon icon={lab.status === 'FINISHED' ? faLock : faRocket} className="text-sm" />
                              <span>{lab.status === 'FINISHED' ? 'Lab Concluded / Review' : 'Start Lab Practice Session'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Problems Concealed Notice Bar */}
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <FontAwesomeIcon icon={faLock} className="text-emerald-400/80 text-[10px]" />
                          <span>All {labTasks.length} problem statements & starter files are unlocked inside the IDE workspace.</span>
                        </div>

                        <span className="font-mono text-[11px] text-teal-400/90 font-semibold hidden sm:inline-block">
                          Automated Testing & Realtime Compilation
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📝 GROUP 2: ASSIGNMENTS & HOMEWORKS */}
          {assignments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-brand-900/40 pb-2">
                <FontAwesomeIcon icon={faBookOpen} className="text-brand-400 text-sm" />
                <h4 className="text-sm font-extrabold text-brand-400 uppercase tracking-wider">
                  Course Assignments & Project Modules
                </h4>
                <span className="text-[11px] font-bold text-slate-500">
                  ({assignments.length} {assignments.length === 1 ? 'Assignment' : 'Assignments'})
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {assignments.map((assignment) => {
                  const aTasks: CourseTaskItem[] = assignment.tasks || [];
                  const totalPoints = aTasks.reduce((sum: number, t: CourseTaskItem) => sum + (t.maxPoints || 0), 0);

                  return (
                    <div
                      key={assignment.id}
                      className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-brand-500/40 transition-all group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                              <FontAwesomeIcon icon={faBookOpen} />
                              <span>ASSIGNMENT</span>
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {aTasks.length} {aTasks.length === 1 ? 'Problem' : 'Problems'} ({totalPoints} pts)
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white">{assignment.title}</h4>
                          {assignment.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl leading-relaxed">{assignment.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
                          {isTeacherOrAdmin ? (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedSubmissionsAssessment({
                                    id: assignment.id,
                                    title: assignment.title,
                                    type: 'ASSIGNMENT',
                                  })
                                }
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="View and manage student submissions"
                              >
                                <FontAwesomeIcon icon={faUsers} />
                                <span>Check Submissions</span>
                              </button>

                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${assignment.id}`)
                                }
                                className="px-3.5 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Add Task</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => router.push(`/student/assessments/${assignment.id}/solve`)}
                              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-brand-600/20 transition-all transform hover:-translate-y-0.5"
                            >
                              <FontAwesomeIcon icon={faRocket} />
                              <span>Open Assignment Workspace</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Problems Concealed Notice Bar */}
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <FontAwesomeIcon icon={faLock} className="text-brand-400/80 text-[10px]" />
                          <span>All {aTasks.length} problem modules & instructions are revealed inside the Assignment Workspace.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 🎓 GROUP 3: EXAMS & ASSESSMENTS */}
          {exams.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-rose-900/40 pb-2">
                <FontAwesomeIcon icon={faGraduationCap} className="text-rose-400 text-sm" />
                <h4 className="text-sm font-extrabold text-rose-400 uppercase tracking-wider">
                  Exams & Evaluated Tests
                </h4>
                <span className="text-[11px] font-bold text-slate-500">
                  ({exams.length} {exams.length === 1 ? 'Exam' : 'Exams'})
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {exams.map((exam) => {
                  const examTasks: CourseTaskItem[] = exam.tasks || [];
                  const totalPoints = examTasks.reduce((sum: number, t: CourseTaskItem) => sum + (t.maxPoints || 0), 0);
                  const examDuration = exam.durationMin || 60;

                  return (
                    <div
                      key={exam.id}
                      className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-rose-500/40 transition-all group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                              <FontAwesomeIcon icon={faGraduationCap} />
                              <span>EXAM ASSESSMENT</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                exam.status === 'RUNNING'
                                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30 animate-pulse'
                                  : exam.status === 'FINISHED'
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {exam.status}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-rose-300 text-[11px] font-mono font-bold flex items-center space-x-1.5 shadow-inner">
                              <FontAwesomeIcon icon={faClock} className="text-[10px] text-rose-400" />
                              <span>Total Time: {examDuration} mins</span>
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {examTasks.length} Problems ({totalPoints} pts)
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white">{exam.title}</h4>
                          {exam.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl leading-relaxed">{exam.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
                          {isTeacherOrAdmin ? (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedSubmissionsAssessment({
                                    id: exam.id,
                                    title: exam.title,
                                    type: 'EXAM',
                                  })
                                }
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="View and manage student exam submissions"
                              >
                                <FontAwesomeIcon icon={faUsers} />
                                <span>Check Submissions</span>
                              </button>

                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${exam.id}`)
                                }
                                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Add Problem</span>
                              </button>
                              <button
                                onClick={() => router.push(`/teacher/assessments/${exam.id}/arena`)}
                                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center space-x-1.5"
                              >
                                <FontAwesomeIcon icon={faSliders} />
                                <span>Manage Arena ({exam._count?.participants || 0})</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => router.push(`/student/assessments/${exam.id}/arena`)}
                              className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center space-x-2 shadow-lg transition-all transform hover:-translate-y-0.5 ${
                                exam.status === 'FINISHED'
                                  ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white shadow-none'
                                  : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white shadow-rose-600/20'
                              }`}
                            >
                              <FontAwesomeIcon icon={exam.status === 'FINISHED' ? faLock : faExternalLinkAlt} />
                              <span>{exam.status === 'FINISHED' ? 'Exam Concluded / Review' : 'Enter Exam Arena'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Problems Concealed Notice Bar */}
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <FontAwesomeIcon icon={faShieldHalved} className="text-rose-400/80 text-[10px]" />
                          <span>Proctored examination: problems are revealed simultaneously upon arena entry.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assessment Submissions Inspector Modal */}
      {selectedSubmissionsAssessment && (
        <AssessmentSubmissionsModal
          isOpen={true}
          onClose={() => setSelectedSubmissionsAssessment(null)}
          assessmentId={selectedSubmissionsAssessment.id}
          assessmentTitle={selectedSubmissionsAssessment.title}
          assessmentType={selectedSubmissionsAssessment.type}
        />
      )}
    </div>
  );
}
