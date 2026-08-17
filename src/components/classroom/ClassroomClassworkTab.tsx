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
                  ({labs.length} Labs)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {labs.map((lab) => {
                  const labTasks: CourseTaskItem[] = lab.tasks || [];
                  const totalPoints = labTasks.reduce((sum: number, t: CourseTaskItem) => sum + (t.maxPoints || 0), 0);

                  return (
                    <div
                      key={lab.id}
                      className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-emerald-500/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                              <FontAwesomeIcon icon={faFlask} />
                              <span>LAB SESSION</span>
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {labTasks.length} {labTasks.length === 1 ? 'Problem Task' : 'Problem Tasks'} ({totalPoints} pts)
                            </span>
                          </div>
                          <h4 className="text-base font-black text-white">{lab.title}</h4>
                          {lab.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{lab.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
                          {isTeacherOrAdmin && (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedSubmissionsAssessment({
                                    id: lab.id,
                                    title: lab.title,
                                    type: 'LAB',
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="View and manage student submissions"
                              >
                                <FontAwesomeIcon icon={faUsers} />
                                <span>Check Submissions</span>
                              </button>

                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${lab.id}`)
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Add Task to Lab</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Child Tasks List */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Problems in this Lab ({labTasks.length})
                        </p>

                        {labTasks.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                            No problems added to this lab yet.{' '}
                            {isTeacherOrAdmin && (
                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${lab.id}`)
                                }
                                className="text-emerald-400 font-bold hover:underline ml-1"
                              >
                                Add first problem
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {labTasks.map((t: CourseTaskItem, idx: number) => (
                              <div
                                key={t.id}
                                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                                      #{idx + 1}
                                    </span>
                                    <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                                  </div>
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                    <span className="uppercase font-mono text-emerald-400 font-semibold">{t.language}</span>
                                    <span>•</span>
                                    <span className="text-brand-300 font-semibold">{t.maxPoints} pts</span>
                                    <span>•</span>
                                    <span>{t.testCases?.length || 0} Cases</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() =>
                                    router.push(
                                      userRole === 'STUDENT'
                                        ? `/student/exam/${t.id}`
                                        : `/teacher/tasks/${t.id}`
                                    )
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center space-x-1 shrink-0 transition-all"
                                >
                                  <FontAwesomeIcon icon={faCode} className="text-[10px]" />
                                  <span>Solve / IDE</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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
                  ({assignments.length} Assignments)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {assignments.map((assignment) => {
                  const aTasks: CourseTaskItem[] = assignment.tasks || [];
                  const totalPoints = aTasks.reduce((sum: number, t: CourseTaskItem) => sum + (t.maxPoints || 0), 0);

                  return (
                    <div
                      key={assignment.id}
                      className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-brand-500/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                              <FontAwesomeIcon icon={faBookOpen} />
                              <span>ASSIGNMENT</span>
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {aTasks.length} {aTasks.length === 1 ? 'Problem Task' : 'Problem Tasks'} ({totalPoints} pts)
                            </span>
                          </div>
                          <h4 className="text-base font-black text-white">{assignment.title}</h4>
                          {assignment.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{assignment.description}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
                          {isTeacherOrAdmin && (
                            <>
                              <button
                                onClick={() =>
                                  setSelectedSubmissionsAssessment({
                                    id: assignment.id,
                                    title: assignment.title,
                                    type: 'ASSIGNMENT',
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="View and manage student submissions"
                              >
                                <FontAwesomeIcon icon={faUsers} />
                                <span>Check Submissions</span>
                              </button>

                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${assignment.id}`)
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Add Task to Assignment</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Child Tasks List */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Problems in this Assignment ({aTasks.length})
                        </p>

                        {aTasks.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                            No tasks added yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {aTasks.map((t: CourseTaskItem, idx: number) => (
                              <div
                                key={t.id}
                                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-brand-500/30 transition-all"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-md bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold">
                                      #{idx + 1}
                                    </span>
                                    <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                                  </div>
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                    <span className="uppercase font-mono text-brand-300 font-semibold">{t.language}</span>
                                    <span>•</span>
                                    <span className="text-teal-300 font-semibold">{t.maxPoints} pts</span>
                                    <span>•</span>
                                    <span>{t.testCases?.length || 0} Cases</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() =>
                                    router.push(
                                      userRole === 'STUDENT'
                                        ? `/student/exam/${t.id}`
                                        : `/teacher/tasks/${t.id}`
                                    )
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs font-bold flex items-center space-x-1 shrink-0 transition-all"
                                >
                                  <FontAwesomeIcon icon={faCode} className="text-[10px]" />
                                  <span>Solve / IDE</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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
                  ({exams.length} Exams)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {exams.map((exam) => {
                  const examTasks: CourseTaskItem[] = exam.tasks || [];
                  const totalPoints = examTasks.reduce((sum: number, t: CourseTaskItem) => sum + (t.maxPoints || 0), 0);

                  return (
                    <div
                      key={exam.id}
                      className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-4 p-6 hover:border-rose-500/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                              <FontAwesomeIcon icon={faGraduationCap} />
                              <span>EXAM ASSESSMENT</span>
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                exam.status === 'RUNNING'
                                  ? 'text-teal-400 animate-pulse'
                                  : exam.status === 'FINISHED'
                                  ? 'text-slate-500'
                                  : 'text-amber-400'
                              }`}
                            >
                              {exam.status}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {examTasks.length} Problems ({totalPoints} pts) • {exam.durationMin || 60} mins
                            </span>
                          </div>
                          <h4 className="text-base font-black text-white">{exam.title}</h4>
                          {exam.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{exam.description}</p>
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
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700/80 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                                title="View and manage student exam submissions"
                              >
                                <FontAwesomeIcon icon={faUsers} />
                                <span>Check Submissions</span>
                              </button>

                              <button
                                onClick={() =>
                                  router.push(`/teacher/tasks/new?courseId=${courseId}&assessmentId=${exam.id}`)
                                }
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Add Problem</span>
                              </button>
                              <button
                                onClick={() => router.push(`/teacher/assessments/${exam.id}/arena`)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20"
                              >
                                Manage Arena ({exam._count?.participants || 0})
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => router.push(`/student/assessments/${exam.id}`)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-600/20"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} />
                              <span>Join Arena</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Child Tasks List */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Problems in this Exam ({examTasks.length})
                        </p>

                        {examTasks.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                            No problems added to this exam yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {examTasks.map((t: CourseTaskItem, idx: number) => (
                              <div
                                key={t.id}
                                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3 hover:border-rose-500/30 transition-all"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">
                                      #{idx + 1}
                                    </span>
                                    <h5 className="text-xs font-bold text-white truncate">{t.title}</h5>
                                  </div>
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                    <span className="uppercase font-mono text-rose-300 font-semibold">{t.language}</span>
                                    <span>•</span>
                                    <span className="text-teal-300 font-semibold">{t.maxPoints} pts</span>
                                    <span>•</span>
                                    <span>{t.testCases?.length || 0} Cases</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() =>
                                    router.push(
                                      userRole === 'STUDENT'
                                        ? `/student/exam/${t.id}`
                                        : `/teacher/tasks/${t.id}`
                                    )
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold flex items-center space-x-1 shrink-0 transition-all"
                                >
                                  <FontAwesomeIcon icon={faCode} className="text-[10px]" />
                                  <span>Solve / IDE</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
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
