"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faUsers,
  faClock,
  faExclamationCircle,
  faPlay,
  faStop,
  faFlask,
  faGraduationCap,
  faBookOpen,
  faCheckCircle,
  faUserCheck,
  faEye,
  faFileCode,
  faPlus,
  faEdit,
  faRotateRight,
  faHourglassHalf,
  faSpinner,
  faXmark,
  faSave,
  faShieldHalved,
  faCode,
  faListCheck,
  faSearch,
  faBullhorn,
  faLock,
  faUnlock,
  faLayerGroup,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { AssessmentSubmissionsModal } from '@/components/classroom/AssessmentSubmissionsModal';

export default function TeacherArenaPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [assessment, setAssessment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isExtendingTime, setIsExtendingTime] = useState(false);
  const [customExtraMins, setCustomExtraMins] = useState<string>('15');
  const [approvingStudentId, setApprovingStudentId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [selectedSubmissionsModal, setSelectedSubmissionsModal] = useState<boolean>(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Search & Filter state for Student Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'WAITING' | 'APPROVED'>('ALL');

  // Edit Assessment Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDurationMin, setEditDurationMin] = useState(60);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch assessment');
      const data = await res.json();
      setAssessment(data);

      // Initialize edit fields
      if (!isEditModalOpen) {
        setEditTitle(data.title || '');
        setEditDescription(data.description || '');
        setEditDurationMin(data.durationMin || 60);
      }

      // Compute synchronized session timer
      if (data.status === 'RUNNING' && data.startTime && data.durationMin) {
        const start = new Date(data.startTime).getTime();
        const end = start + Number(data.durationMin) * 60 * 1000;
        const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
        setTimeRemainingSeconds(diff);
      } else {
        setTimeRemainingSeconds(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token && id) {
      fetchAssessment();

      // Polling for live updates every 3 seconds
      const interval = setInterval(fetchAssessment, 3000);
      return () => clearInterval(interval);
    }
  }, [user, id]);

  // Local seconds countdown tick
  useEffect(() => {
    if (timeRemainingSeconds === null) return;
    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemainingSeconds !== null]);

  const handleApprove = async (studentId: string) => {
    setApprovingStudentId(studentId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}/arena/approve/${studentId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${user?.token}` },
        },
      );
      if (res.ok) {
        await fetchAssessment();
      }
    } catch (err) {
      console.error('Failed to approve student', err);
    } finally {
      setApprovingStudentId(null);
    }
  };

  const handleApproveAll = async () => {
    const unapproved = participants.filter((p: any) => !p.isApproved);
    if (unapproved.length === 0) return;

    setIsApprovingAll(true);
    try {
      for (const p of unapproved) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}/arena/approve/${p.studentId}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${user?.token}` },
          },
        );
      }
      await fetchAssessment();
    } catch (err) {
      console.error('Failed to approve all students', err);
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleStartSession = async () => {
    if (!assessment) return;
    setIsStarting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          startTime: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        await fetchAssessment();
      } else {
        const err = await res.json();
        alert(err.message || `Failed to start ${typeLabel}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!assessment) return;
    if (!confirm(`Are you sure you want to end this ${typeLabel.toLowerCase()}? All student submissions will be automatically finalized and the workspace will be locked.`)) {
      return;
    }

    setIsEnding(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({
            status: 'FINISHED',
          }),
        },
      );

      if (res.ok) {
        await fetchAssessment();
      } else {
        const err = await res.json();
        alert(err.message || `Failed to end ${typeLabel}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsEnding(false);
    }
  };

  const handleAddExtraTime = async (extraMinutes: number) => {
    if (!assessment) return;
    if (extraMinutes <= 0 || isNaN(extraMinutes)) {
      alert('Please provide a valid number of extra minutes');
      return;
    }

    setIsExtendingTime(true);
    try {
      const isFinishedOrExpired =
        assessment.status === 'FINISHED' ||
        (assessment.startTime &&
          Date.now() >= new Date(assessment.startTime).getTime() + Number(assessment.durationMin) * 60 * 1000);

      let payload: any = {};
      if (isFinishedOrExpired) {
        // Reopen / resume session with new start time and extra duration
        payload = {
          status: 'RUNNING',
          startTime: new Date().toISOString(),
          durationMin: extraMinutes,
        };
      } else {
        // Extend existing running duration
        const newDuration = Number(assessment.durationMin || 60) + extraMinutes;
        payload = {
          durationMin: newDuration,
          status: 'RUNNING',
        };
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        await fetchAssessment();
        alert(`Successfully added +${extraMinutes} minutes! Session is now active for all students.`);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add extra time');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to add extra time');
    } finally {
      setIsExtendingTime(false);
    }
  };

  const handleSaveAssessmentEdit = async () => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/assessments/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            durationMin: Number(editDurationMin),
          }),
        },
      );

      if (res.ok) {
        await fetchAssessment();
        setIsEditModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update assessment');
      }
    } catch (err: any) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-teal-400 animate-spin" />
        <div className="text-sm font-semibold text-slate-400">Loading Assessment Command Arena...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-8 rounded-3xl max-w-md text-center space-y-4 shadow-2xl">
          <p className="font-bold text-sm">{error}</p>
          <button
            onClick={() => router.push('/teacher/classrooms')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Return to Classrooms
          </button>
        </div>
      </div>
    );
  }

  const participants = assessment?.participants || [];
  const tasks = assessment?.tasks || [];
  const totalPoints = tasks.reduce((sum: number, t: any) => sum + (t.points || t.maxPoints || 0), 0);
  const approvedCount = participants.filter((p: any) => p.isApproved).length;
  const waitingCount = participants.length - approvedCount;
  const isRunning = assessment?.status === 'RUNNING';
  const isFinished = assessment?.status === 'FINISHED';

  const isLab = assessment?.type === 'LAB';
  const isExam = assessment?.type === 'EXAM';
  const isAssignment = assessment?.type === 'ASSIGNMENT';

  const typeLabel = isLab ? 'Lab Session' : isExam ? 'Exam' : 'Assignment';

  // Filter participants
  const filteredParticipants = participants.filter((p: any) => {
    const matchesSearch =
      !searchQuery ||
      p.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === 'WAITING') return !p.isApproved;
    if (filterTab === 'APPROVED') return p.isApproved;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-teal-500 selection:text-slate-950">
      {/* Top Header Command Bar */}
      <header className="h-16 border-b border-slate-800/80 px-6 sm:px-10 flex items-center justify-between bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (assessment?.courseId) {
                router.push(`/teacher/classrooms/${assessment.courseId}`);
              } else {
                router.back();
              }
            }}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-xs font-bold px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 shadow-sm"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Classroom {assessment?.course?.code ? `(${assessment.course.code})` : ''}</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 border ${
                isLab
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : isExam
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-brand-500/15 border-brand-500/30 text-brand-300'
              }`}
            >
              <FontAwesomeIcon icon={isLab ? faFlask : isExam ? faGraduationCap : faBookOpen} />
              <span>{isLab ? 'LAB COMMAND ARENA' : isExam ? 'EXAM PROCTOR ARENA' : 'ASSIGNMENT ARENA'}</span>
            </span>

            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                isRunning
                  ? 'bg-teal-500/15 border-teal-500/30 text-teal-300 animate-pulse'
                  : isFinished
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {isRunning ? '● LIVE IN PROGRESS' : isFinished ? '⏹️ CONCLUDED' : '⏳ WAITING TO LAUNCH'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all hover:text-white"
          >
            <FontAwesomeIcon icon={faEdit} className="text-teal-400" />
            <span>Edit Details</span>
          </button>

          <button
            onClick={() => setSelectedSubmissionsModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-950 text-xs font-black transition-all shadow-md shadow-teal-500/20"
          >
            <FontAwesomeIcon icon={faFileCode} />
            <span>All Submissions ({participants.length})</span>
          </button>
        </div>
      </header>

      {/* Main Command Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Cockpit Hero Bar: Session Overview & Real-Time Controls */}
        <div
          className={`glass-panel rounded-3xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden space-y-6 ${
            isLab
              ? 'border-emerald-500/30 bg-slate-900/90'
              : isExam
              ? 'border-rose-500/30 bg-slate-900/90'
              : 'border-brand-500/30 bg-slate-900/90'
          }`}
        >
          {/* Top Decorative Glow Stripe */}
          <div
            className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${
              isLab
                ? 'from-emerald-500 via-teal-400 to-cyan-500'
                : isExam
                ? 'from-rose-500 via-red-500 to-amber-500'
                : 'from-brand-500 to-indigo-500'
            }`}
          ></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Title & Meta Info (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono font-bold flex items-center space-x-1.5">
                  <FontAwesomeIcon icon={faClock} className="text-teal-400 text-[10px]" />
                  <span>Base Duration: {assessment?.durationMin || 60} Mins</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono font-bold">
                  {tasks.length} Problems
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono font-bold">
                  {totalPoints} Total Points
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{assessment?.title}</h1>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                {assessment?.description ||
                  (isLab
                    ? 'Hands-on practical laboratory arena. Monitor student check-ins, approve attendance, adjust live duration, and inspect submissions.'
                    : 'Examination arena. Monitor synchronized candidate progress and test case executions.')}
              </p>
            </div>

            {/* Right: Live Timer & Primary Session Action (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-end gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 shadow-inner">
              {/* Digital Clock Box */}
              <div className="text-center sm:text-left lg:text-center xl:text-left space-y-0.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center sm:justify-start lg:justify-center xl:justify-start space-x-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-teal-400 animate-ping' : isFinished ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
                  <span>{isFinished ? 'Session Concluded' : isRunning ? 'Remaining Time' : 'Session Ready'}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-teal-300">
                  {isFinished
                    ? '00:00:00'
                    : isRunning && timeRemainingSeconds !== null
                    ? formatTime(timeRemainingSeconds)
                    : `${assessment?.durationMin || 60}:00`}
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="shrink-0 w-full sm:w-auto">
                {!isRunning && !isFinished && (
                  <button
                    onClick={handleStartSession}
                    disabled={isStarting}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center space-x-2 ${
                      isStarting
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : isLab
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
                        : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-500/25'
                    }`}
                  >
                    <FontAwesomeIcon icon={isStarting ? faSpinner : faPlay} className={isStarting ? 'animate-spin' : ''} />
                    <span>{isStarting ? 'Launching...' : `Start ${typeLabel}`}</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={handleEndSession}
                    disabled={isEnding}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center space-x-2"
                  >
                    <FontAwesomeIcon icon={isEnding ? faSpinner : faStop} className={isEnding ? 'animate-spin' : ''} />
                    <span>{isEnding ? 'Ending...' : `End ${typeLabel}`}</span>
                  </button>
                )}

                {isFinished && (
                  <button
                    onClick={() => handleAddExtraTime(15)}
                    disabled={isExtendingTime}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center space-x-2"
                  >
                    <FontAwesomeIcon icon={isExtendingTime ? faSpinner : faRotateRight} className={isExtendingTime ? 'animate-spin' : ''} />
                    <span>Re-open (+15 mins)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Live Time Extension Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <FontAwesomeIcon icon={faHourglassHalf} className="text-xs" />
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <span>Live Extra Time Adjustment</span>
                  <span className="text-[10px] text-teal-400 font-mono">(Syncs Live With All Students)</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Instantly extends duration or re-opens concluded sessions without data loss.
                </div>
              </div>
            </div>

            {/* Pill Buttons & Stepper */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleAddExtraTime(5)}
                disabled={isExtendingTime}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-bold transition-all"
              >
                +5 Mins
              </button>
              <button
                onClick={() => handleAddExtraTime(10)}
                disabled={isExtendingTime}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-bold transition-all"
              >
                +10 Mins
              </button>
              <button
                onClick={() => handleAddExtraTime(15)}
                disabled={isExtendingTime}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all shadow-sm"
              >
                +15 Mins
              </button>
              <button
                onClick={() => handleAddExtraTime(30)}
                disabled={isExtendingTime}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-slate-700 text-xs font-bold transition-all"
              >
                +30 Mins
              </button>

              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customExtraMins}
                  onChange={(e) => setCustomExtraMins(e.target.value)}
                  className="w-16 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono text-center focus:outline-none focus:border-teal-500"
                  placeholder="Mins"
                />
                <button
                  onClick={() => handleAddExtraTime(Number(customExtraMins))}
                  disabled={isExtendingTime || !customExtraMins}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-950 text-xs font-black transition-all flex items-center space-x-1"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 flex items-center space-x-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <FontAwesomeIcon icon={faUsers} className="text-xl" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</div>
              <div className="text-2xl font-black text-white font-mono">{participants.length}</div>
              <div className="text-[10px] text-slate-500">Checked-in students</div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 flex items-center space-x-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FontAwesomeIcon icon={faCheckCircle} className="text-xl" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Admitted & Active</div>
              <div className="text-2xl font-black text-white font-mono">{approvedCount}</div>
              <div className="text-[10px] text-emerald-400/90 font-semibold">
                {participants.length > 0 ? `${Math.round((approvedCount / participants.length) * 100)}% attendance` : '0%'}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-xl" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Admission</div>
                <div className="text-2xl font-black text-white font-mono">{waitingCount}</div>
                <div className="text-[10px] text-amber-400/90 font-semibold">Needs teacher approval</div>
              </div>
            </div>

            {waitingCount > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={isApprovingAll}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-md transition-all shrink-0"
              >
                <FontAwesomeIcon icon={faUserCheck} />
                <span>{isApprovingAll ? '...' : 'Admit All'}</span>
              </button>
            )}
          </div>

          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 flex items-center space-x-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FontAwesomeIcon icon={faFileCode} className="text-xl" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Problem Modules</div>
              <div className="text-2xl font-black text-white font-mono">{tasks.length}</div>
              <div className="text-[10px] text-indigo-300 font-semibold">Total {totalPoints} Points</div>
            </div>
          </div>
        </div>

        {/* 2-Column Space-Aware Cockpit Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Student Roster & Live Admission (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Table Header & Controls Bar */}
            <div className="glass-panel bg-slate-900/80 rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <FontAwesomeIcon icon={faUsers} className="text-teal-400" />
                  <span>Student Roster ({participants.length})</span>
                </h2>
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 text-[11px] font-bold">
                  <button
                    onClick={() => setFilterTab('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterTab === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({participants.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('WAITING')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterTab === 'WAITING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pending ({waitingCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('APPROVED')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterTab === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Admitted ({approvedCount})
                  </button>
                </div>

                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-2.5 text-slate-500 text-xs" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student..."
                    className="pl-7 pr-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500 w-36 sm:w-44"
                  />
                </div>
              </div>
            </div>

            {/* Roster Table */}
            <div className="glass-panel bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              {participants.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <FontAwesomeIcon icon={faUsers} className="mx-auto text-4xl text-slate-600" />
                  <p className="font-bold text-sm text-slate-300">No students have checked in yet.</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When students click &quot;Enter Arena&quot; from their classroom stream, they will appear here in real-time.
                  </p>
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <p className="font-bold text-sm text-slate-300">No students match your filter criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">Student</th>
                        <th className="px-5 py-3.5">Admission Status</th>
                        <th className="px-5 py-3.5">Check-in Time</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredParticipants.map((p: any) => (
                        <tr key={p.id || p.studentId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center space-x-3">
                              <img
                                src={
                                  p.student?.profilePicUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(p.student?.fullName || 'S')}&background=0D9488&color=fff`
                                }
                                alt={p.student?.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                              />
                              <div>
                                <div className="font-bold text-white text-xs">{p.student?.fullName || 'Student'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{p.student?.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            {p.isApproved ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 space-x-1">
                                <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                                <span>Admitted & Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 space-x-1 animate-pulse">
                                <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-xs font-mono text-slate-400">
                            {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString() : 'Just now'}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {!p.isApproved ? (
                                <button
                                  onClick={() => handleApprove(p.studentId)}
                                  disabled={approvingStudentId === p.studentId}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                                >
                                  <FontAwesomeIcon icon={faCheck} />
                                  <span>{approvingStudentId === p.studentId ? 'Approving...' : 'Approve'}</span>
                                </button>
                              ) : (
                                <span className="text-emerald-400/90 text-xs font-semibold flex items-center space-x-1">
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                  <span>Admitted</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Side Column: Problem Breakdown & Assessment Rules (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Assessment Problem Tasks Card */}
            <div className="glass-panel bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <FontAwesomeIcon icon={faCode} className="text-teal-400" />
                  <span>Problem Tasks ({tasks.length})</span>
                </h3>
                <span className="text-[10px] text-teal-400 font-bold">{totalPoints} Points Total</span>
              </div>

              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No tasks attached to this assessment.</p>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((task: any, index: number) => (
                    <div
                      key={task.id || index}
                      className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center space-x-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-teal-400 font-mono text-[10px] flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span className="truncate max-w-[180px]">{task.title}</span>
                        </span>
                        <span className="text-[11px] font-mono text-teal-400 font-bold">
                          {task.points || task.maxPoints || 100} pts
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 uppercase font-semibold">
                          {task.difficulty || 'Medium'}
                        </span>
                        <span>•</span>
                        <span>{task.testCases?.length || 0} Test Cases</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assessment Integrity & Security Card */}
            <div className="glass-panel bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-3.5 shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <FontAwesomeIcon icon={faShieldHalved} className="text-brand-400" />
                <span>Live Security & Policy</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Single Submission Rule</span>
                  <span className="text-emerald-400 font-bold text-[11px]">Enforced</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Auto-Submit Upon Expiration</span>
                  <span className="text-emerald-400 font-bold text-[11px]">Active</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Code Snapshot Sync</span>
                  <span className="text-teal-400 font-bold text-[11px]">Live (3s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submissions Dossier Modal */}
      {selectedSubmissionsModal && (
        <AssessmentSubmissionsModal
          isOpen={selectedSubmissionsModal}
          onClose={() => setSelectedSubmissionsModal(false)}
          assessmentId={id}
          assessmentTitle={assessment?.title}
          assessmentType={assessment?.type}
        />
      )}

      {/* Edit Assessment Details Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <FontAwesomeIcon icon={faEdit} className="text-teal-400" />
                <span>Edit Assessment Details</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Base Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={editDurationMin}
                  onChange={(e) => setEditDurationMin(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssessmentEdit}
                disabled={isSavingEdit || !editTitle.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-slate-950 text-xs font-black flex items-center space-x-2 shadow-lg transition-all disabled:opacity-50"
              >
                <FontAwesomeIcon icon={isSavingEdit ? faSpinner : faSave} className={isSavingEdit ? 'animate-spin' : ''} />
                <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
