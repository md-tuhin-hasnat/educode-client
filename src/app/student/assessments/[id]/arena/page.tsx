"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faClock,
  faCheckCircle,
  faSpinner,
  faFlask,
  faGraduationCap,
  faBookOpen,
  faPlay,
  faCode,
  faShieldHalved,
  faRocket,
  faCircleCheck,
  faTerminal,
  faLaptopCode,
  faLock,
  faRotateRight,
  faFileLines,
  faHourglassHalf,
} from '@fortawesome/free-solid-svg-icons';

export default function StudentArenaPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [assessment, setAssessment] = useState<any>(null);
  const [myParticipantStatus, setMyParticipantStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const endTimeMsRef = useRef<number | null>(null);

  // 1. Join Arena on mount
  useEffect(() => {
    const joinArena = async () => {
      if (!user?.token || !id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}/arena/join`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );
        if (!res.ok) {
          const err = await res.json();
          // For non-exam assessments or if already joined, ignore strict join errors
          if (err.statusCode !== 400 && err.statusCode !== 404) {
            setError(err.message || 'Failed to join arena');
          }
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    };
    joinArena();
  }, [id, user]);

  // 2. Poll for assessment status and participant approval
  useEffect(() => {
    if (!user?.token || !id) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          },
        );
        if (!res.ok) return;
        const data = await res.json();
        setAssessment(data);

        // Find my participant record
        const me = data.participants?.find((p: any) => p.studentId === user.id);
        if (me) setMyParticipantStatus(me);

        // Compute synchronized session timer
        if (data.status === 'FINISHED') {
          endTimeMsRef.current = null;
          setTimeRemainingSeconds(0);
        } else if (data.startTime && data.durationMin) {
          const start = new Date(data.startTime).getTime();
          const end = start + Number(data.durationMin) * 60 * 1000;
          endTimeMsRef.current = end;
          const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
          setTimeRemainingSeconds(diff);

          // If proctored exam started and running with approved status, auto redirect to solve
          if (data.type === 'EXAM' && me?.isApproved && diff > 0) {
            router.push(`/student/assessments/${id}/solve`);
          }
        } else if (data.status === 'RUNNING' && data.durationMin) {
          const fallbackStart = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          const end = fallbackStart + Number(data.durationMin) * 60 * 1000;
          endTimeMsRef.current = end;
          const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
          setTimeRemainingSeconds(diff);
        } else {
          endTimeMsRef.current = null;
          setTimeRemainingSeconds(null);
        }
      } catch (err) {
        // Silent error for polling
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [id, user, router]);

  // Local seconds countdown tick using precise timestamp reference
  useEffect(() => {
    if (timeRemainingSeconds === null) return;
    const interval = setInterval(() => {
      if (endTimeMsRef.current !== null) {
        const remaining = Math.max(0, Math.floor((endTimeMsRef.current - Date.now()) / 1000));
        setTimeRemainingSeconds(remaining);
      } else {
        setTimeRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemainingSeconds !== null]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading && !assessment) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-teal-400 animate-spin" />
        <div className="text-sm font-semibold text-slate-400">Connecting to Assessment Arena...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-8 rounded-3xl max-w-md text-center space-y-4">
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={() => router.push('/student/classrooms')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Return to Classrooms
          </button>
        </div>
      </div>
    );
  }

  const isExam = assessment?.type === 'EXAM';
  const isLab = assessment?.type === 'LAB';
  const isApproved = myParticipantStatus?.isApproved;
  const isRunning = assessment?.status === 'RUNNING' || (timeRemainingSeconds !== null && timeRemainingSeconds > 0);
  const isFinished = assessment?.status === 'FINISHED' || (assessment?.status === 'RUNNING' && timeRemainingSeconds === 0);

  const tasks = assessment?.tasks || [];
  const totalPoints = tasks.reduce((sum: number, t: any) => sum + (t.maxPoints || 0), 0);
  const totalTimeMin = assessment?.durationMin || (isLab ? 90 : 60);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-teal-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <header className="h-16 border-b border-slate-800/80 px-6 sm:px-10 flex items-center justify-between bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <button
          onClick={() => {
            if (assessment?.courseId) {
              router.push(`/student/classrooms/${assessment.courseId}`);
            } else {
              router.back();
            }
          }}
          className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800/60"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Classroom {assessment?.course?.code ? `(${assessment.course.code})` : ''}</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <span
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 border ${
              isLab
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : isExam
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-brand-500/15 border-brand-500/30 text-brand-300'
            }`}
          >
            <FontAwesomeIcon icon={isLab ? faFlask : isExam ? faGraduationCap : faBookOpen} />
            <span>{isLab ? 'LAB ARENA' : isExam ? 'EXAM ARENA' : 'ASSIGNMENT ARENA'}</span>
          </span>

          {isFinished ? (
            <div className="px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faLock} className="text-[10px]" />
              <span>Session Concluded</span>
            </div>
          ) : timeRemainingSeconds !== null && timeRemainingSeconds > 0 ? (
            <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-inner animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Time Left: {formatTime(timeRemainingSeconds)}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-teal-400 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-inner">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              <span>Total Time: {totalTimeMin} Mins</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Arena Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
        {isLab ? (
          /* ========================================================================= */
          /* 🧪 LABORATORY PRACTICE ARENA                                             */
          /* ========================================================================= */
          <div className="glass-panel bg-slate-900/70 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden">
            {/* Top Glow Accent */}
            <div
              className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${
                isFinished
                  ? 'from-slate-700 via-slate-600 to-slate-800'
                  : 'from-emerald-500 via-teal-400 to-cyan-500'
              }`}
            ></div>
            <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

            {/* Arena Header */}
            <div className="text-center space-y-3">
              <div
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wider ${
                  isFinished
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <FontAwesomeIcon icon={isFinished ? faLock : faFlask} />
                <span>{isFinished ? 'Laboratory Session Concluded' : 'Laboratory Practice Arena'}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{assessment?.title}</h1>
              {assessment?.description && (
                <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">{assessment.description}</p>
              )}
            </div>

            {/* Prominent Live Synchronized Countdown Timer Display */}
            {timeRemainingSeconds !== null && timeRemainingSeconds > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-950 border border-teal-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-xl shadow-inner">
                    <FontAwesomeIcon icon={faHourglassHalf} className="animate-spin" style={{ animationDuration: '8s' }} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Live Session Time Remaining</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Synchronized countdown for all classroom students</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="px-5 py-2 rounded-xl bg-slate-950/80 border border-teal-500/50 text-2xl sm:text-3xl font-black text-teal-300 font-mono tracking-widest shadow-inner">
                    {formatTime(timeRemainingSeconds)}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-1.5">
                  <FontAwesomeIcon icon={faClock} className="text-teal-400" />
                  <span>{isFinished ? 'Session Status' : timeRemainingSeconds !== null ? 'Time Remaining' : 'Total Duration'}</span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {isFinished
                    ? 'Concluded'
                    : timeRemainingSeconds !== null
                    ? formatTime(timeRemainingSeconds)
                    : `${totalTimeMin} Minutes`}
                </div>
                <div className="text-[10px] text-teal-400 font-semibold">
                  {isFinished
                    ? 'Coding submissions closed'
                    : timeRemainingSeconds !== null
                    ? `Total budget: ${totalTimeMin} mins`
                    : 'Hands-on time budget'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-1.5">
                  <FontAwesomeIcon icon={faCode} className="text-emerald-400" />
                  <span>Problem Tasks</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{tasks.length} Problems</div>
                <div className="text-[10px] text-emerald-400 font-semibold">Interactive Coding Modules</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center space-x-1.5">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-brand-400" />
                  <span>Max Score</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{totalPoints} Points</div>
                <div className="text-[10px] text-brand-400 font-semibold">Automated Test Evaluation</div>
              </div>
            </div>

            {/* Laboratory Session Status Notice */}
            {isFinished ? (
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
                <div className="flex items-center justify-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <FontAwesomeIcon icon={faLock} />
                  <span>Session Has Been Concluded</span>
                </div>
                <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                  This laboratory session was finalized by the instructor. Coding submissions are currently locked. If your instructor extends the session time, this page will automatically unlock.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <FontAwesomeIcon icon={faLaptopCode} />
                  <span>Hands-on Interactive Environment</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All {tasks.length} problem statements, starter code templates, sample test cases, and hidden test suites will be unlocked simultaneously inside the IDE workspace upon launching.
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">⚡ Compiler Output & Terminal</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">🧪 Automated Test Suite Checks</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">💾 Live Draft Auto-Saving</span>
                </div>
              </div>
            )}

            {/* Launch / Action CTA */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isFinished ? (
                <>
                  <button
                    disabled
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800 text-slate-500 font-bold text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 border border-slate-700 cursor-not-allowed"
                  >
                    <FontAwesomeIcon icon={faLock} />
                    <span>Session Concluded</span>
                  </button>

                  <button
                    onClick={() => router.push(`/student/classrooms/${assessment?.courseId}`)}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <FontAwesomeIcon icon={faFileLines} />
                    <span>Return to Classroom Stream</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push(`/student/assessments/${id}/solve`)}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <FontAwesomeIcon icon={faRocket} className="text-base" />
                    <span>Start Lab Practice Session</span>
                  </button>

                  <button
                    onClick={() => router.push(`/student/classrooms/${assessment?.courseId}`)}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition-all"
                  >
                    Back to Classwork
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 🎓 PROCTORED EXAM ARENA                                                  */
          /* ========================================================================= */
          <div className="glass-panel bg-slate-900/70 border border-slate-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-2xl w-full mx-auto text-center space-y-8 relative overflow-hidden">
            {/* Top Glow Accent */}
            <div
              className={`absolute top-0 left-0 w-full h-2 transition-colors duration-1000 ${
                isFinished
                  ? 'bg-slate-700'
                  : isApproved
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-500'
                  : 'bg-gradient-to-r from-amber-400 to-rose-500'
              }`}
            ></div>
            <div
              className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-1000 ${
                isFinished ? 'bg-slate-700' : isApproved ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></div>

            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider">
                <FontAwesomeIcon icon={faShieldHalved} />
                <span>Proctored Exam Arena</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{assessment?.title}</h1>
              <p className="text-xs text-slate-400 flex items-center justify-center space-x-2">
                <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono font-bold">
                  {assessment?.type}
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <FontAwesomeIcon icon={faClock} className="text-teal-400" />
                  <span>
                    {isFinished ? 'Concluded' : timeRemainingSeconds !== null ? `Remaining: ${formatTime(timeRemainingSeconds)}` : `Duration: ${totalTimeMin} Mins`}
                  </span>
                </span>
                <span>•</span>
                <span>{tasks.length} Problems</span>
              </p>
            </div>

            <div className="py-6">
              {isFinished ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-slate-400">
                    <FontAwesomeIcon icon={faLock} className="text-3xl" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white">Examination Concluded</h2>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      This exam has ended. All candidate work was submitted automatically.
                    </p>
                  </div>
                </div>
              ) : isApproved ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin opacity-25"></div>
                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-4xl" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white">Attendance Verified</h2>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      You have been approved by the instructor. The exam will start automatically once the instructor launches the timer.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-pulse"></div>
                    <FontAwesomeIcon icon={faSpinner} className="text-amber-400 text-4xl animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white">Waiting for Attendance Approval</h2>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      The instructor is currently verifying student attendance. Please wait quietly to be admitted into the exam arena.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 flex items-center justify-center space-x-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <span className="text-xs font-semibold text-slate-400">Live connection to Exam Session Server</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
