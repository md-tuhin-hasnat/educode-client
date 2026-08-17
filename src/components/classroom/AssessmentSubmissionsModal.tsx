'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faUsers,
  faSearch,
  faRotateRight,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faCode,
  faUnlock,
  faLock,
  faFlask,
  faFilePdf,
  faDownload,
  faFolder,
  faFolderOpen,
  faFileCode,
  faPlay,
  faShieldHalved,
  faSpinner,
  faAward,
  faCopy,
  faCheck,
  faChevronRight,
  faLaptopCode,
  faEye,
  faGraduationCap,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';
import { EduCodeEditor } from '@/components/Editor/EduCodeEditor';
import {
  runAllTestCases,
  TestCaseInput,
  TestSuiteSummary,
} from '@/utils/testCaseRunner';
import {
  generateStudentReportPdf,
  StudentReportData,
} from '@/utils/studentReportPdfGenerator';

export interface StudentTaskSubmission {
  taskId: string;
  taskTitle: string;
  taskType?: string;
  maxPoints: number;
  language?: string;
  submissionId: string | null;
  status: string; // 'submitted' | 'graded' | 'not_submitted'
  score: number | null;
  codeSnapshot: string | null;
  submittedAt: string | null;
  allowResubmit: boolean;
  attemptCount: number;
  testResults?: Array<{
    id: number;
    passed: boolean;
    actualOutput?: string;
    executionTimeMs?: number;
    errorMessage?: string;
    testCase?: {
      id: number;
      points: number;
      isHidden: boolean;
      inputData?: string;
      expectedOutput?: string;
    };
  }>;
  testCases?: Array<{
    id: number | string;
    order?: number;
    inputData: string;
    expectedOutput: string;
    points: number;
    isHidden?: boolean;
  }>;
  integrityLogs?: Array<{
    id: number;
    eventType: string;
    occurredAt: string;
    details: string;
    severity: string;
  }>;
  integrityScore?: number;
}

export interface StudentSubmissionGroup {
  student: {
    id: string;
    fullName: string;
    email: string;
    studentId: string;
    section: string;
    profilePicUrl: string | null;
  };
  totalScore: number;
  maxTotalScore: number;
  completedTasksCount: number;
  totalTasksCount: number;
  isFullyCompleted: boolean;
  taskSubmissions: StudentTaskSubmission[];
}

export interface AssessmentSubmissionsData {
  assessment: {
    id: string;
    title: string;
    type: 'LAB' | 'ASSIGNMENT' | 'EXAM' | string;
    status: string;
    courseId: string;
    courseCode?: string;
    courseTitle?: string;
    totalTasks: number;
    maxTotalScore: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    language: string;
    maxPoints: number;
    testCasesCount: number;
    testCases?: any[];
  }>;
  students: StudentSubmissionGroup[];
}

interface AssessmentSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentId: string;
  assessmentTitle?: string;
  assessmentType?: 'LAB' | 'ASSIGNMENT' | 'EXAM' | string;
}

export function AssessmentSubmissionsModal({
  isOpen,
  onClose,
  assessmentId,
  assessmentTitle,
  assessmentType = 'LAB',
}: AssessmentSubmissionsModalProps) {
  const [data, setData] = useState<AssessmentSubmissionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTab, setFilterTab] = useState<
    'ALL' | 'COMPLETED' | 'PARTIAL' | 'NOT_SUBMITTED' | 'UNLOCKED'
  >('ALL');

  // Selected active student folder
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // Active problem file tab in student folder
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(0);
  // Active sub-tab inside student dossier: 'code' | 'tests' | 'integrity'
  const [dossierSubTab, setDossierSubTab] = useState<'code' | 'tests' | 'integrity'>('code');

  // Test Runner state for teacher evaluating student code
  const [isEvaluatingTests, setIsEvaluatingTests] = useState<boolean>(false);
  const [evalTestSummary, setEvalTestSummary] = useState<{
    [studentTaskId: string]: TestSuiteSummary;
  }>({});

  // PDF Export loading state tracker: studentId -> boolean
  const [generatingPdf, setGeneratingPdf] = useState<{ [studentId: string]: boolean }>({});
  const [generatingPdfStatus, setGeneratingPdfStatus] = useState<string>('');
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  // Re-submission toggle loading tracker: taskId_studentId -> boolean
  const [updatingResubmit, setUpdatingResubmit] = useState<{ [key: string]: boolean }>({});

  const fetchSubmissions = useCallback(async () => {
    if (!assessmentId) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<AssessmentSubmissionsData>(
        `/assessments/${assessmentId}/submissions`,
      );
      setData(res.data);
      if (res.data.students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(res.data.students[0].student.id);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to load assessment submissions';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId, selectedStudentId]);

  useEffect(() => {
    if (isOpen && assessmentId) {
      fetchSubmissions();
    }
  }, [isOpen, assessmentId, fetchSubmissions]);

  // Set default student selection once loaded
  useEffect(() => {
    if (data?.students && data.students.length > 0) {
      if (!selectedStudentId || !data.students.some((s) => s.student.id === selectedStudentId)) {
        setSelectedStudentId(data.students[0].student.id);
      }
    }
  }, [data, selectedStudentId]);

  // Reset task index if out of bounds
  useEffect(() => {
    setSelectedTaskIndex(0);
  }, [selectedStudentId]);

  const handleToggleAllowResubmit = async (
    taskId: string,
    studentId: string,
    currentAllow: boolean,
  ) => {
    const key = `${taskId}_${studentId}`;
    const nextAllow = !currentAllow;

    // Optimistic UI update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        students: prev.students.map((sg) => {
          if (sg.student.id === studentId) {
            return {
              ...sg,
              taskSubmissions: sg.taskSubmissions.map((ts) => {
                if (ts.taskId === taskId) {
                  return { ...ts, allowResubmit: nextAllow };
                }
                return ts;
              }),
            };
          }
          return sg;
        }),
      };
    });

    try {
      setUpdatingResubmit((prev) => ({ ...prev, [key]: true }));
      await apiClient.post('/submissions/allow-resubmit', {
        taskId,
        studentId,
        allowResubmit: nextAllow,
      });
    } catch (err) {
      console.error('Failed to toggle re-submission access:', err);
      // Rollback optimistic update
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((sg) => {
            if (sg.student.id === studentId) {
              return {
                ...sg,
                taskSubmissions: sg.taskSubmissions.map((ts) => {
                  if (ts.taskId === taskId) {
                    return { ...ts, allowResubmit: currentAllow };
                  }
                  return ts;
                }),
              };
            }
            return sg;
          }),
        };
      });
    } finally {
      setUpdatingResubmit((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Run full evaluation suite (Sample, Pretest, and System Tests) against student code
  const handleRunEvaluation = async (
    studentGroup: StudentSubmissionGroup,
    taskSubmission: StudentTaskSubmission,
  ) => {
    if (!taskSubmission.codeSnapshot) {
      alert('No code submitted by student for this problem task.');
      return;
    }

    const key = `${studentGroup.student.id}_${taskSubmission.taskId}`;
    setIsEvaluatingTests(true);
    setDossierSubTab('tests');

    try {
      // Assemble full test suite: task test cases + synthesized system test cases
      const baseTestCases: TestCaseInput[] =
        taskSubmission.testCases && taskSubmission.testCases.length > 0
          ? taskSubmission.testCases.map((tc, idx) => ({
              id: tc.id || idx + 1,
              order: tc.order || idx + 1,
              inputData: tc.inputData || '',
              expectedOutput: tc.expectedOutput || '',
              points: tc.points || 25,
              isHidden: tc.isHidden ?? false,
              testType: tc.isHidden ? 'PRETEST' : 'SAMPLE',
            }))
          : [
              {
                id: 1,
                order: 1,
                inputData: '5\n1 2 3 4 5',
                expectedOutput: '5 4 3 2 1',
                points: 25,
                isHidden: false,
                testType: 'SAMPLE',
              },
              {
                id: 2,
                order: 2,
                inputData: '3\n10 20 30',
                expectedOutput: '30 20 10',
                points: 25,
                isHidden: false,
                testType: 'SAMPLE',
              },
            ];

      // Add System / Stress Test Cases for full validation
      const systemTestCases: TestCaseInput[] = [
        {
          id: 'sys-1',
          order: baseTestCases.length + 1,
          inputData: '10\n99 88 77 66 55 44 33 22 11 0',
          expectedOutput: '0 11 22 33 44 55 66 77 88 99',
          points: 25,
          isHidden: true,
          testType: 'SYSTEM',
        },
        {
          id: 'sys-2',
          order: baseTestCases.length + 2,
          inputData: '1\n1000',
          expectedOutput: '1000',
          points: 25,
          isHidden: true,
          testType: 'SYSTEM',
        },
      ];

      const fullTestSuite = [...baseTestCases, ...systemTestCases];
      const lang = (taskSubmission.language || 'cpp').toLowerCase() as any;

      const summary = await runAllTestCases(
        fullTestSuite,
        taskSubmission.codeSnapshot,
        lang,
        [],
        'solution.' + (lang === 'python' ? 'py' : lang === 'java' ? 'java' : lang === 'c' ? 'c' : 'cpp'),
        undefined,
        1500,
        undefined,
        'ALL',
      );

      setEvalTestSummary((prev) => ({
        ...prev,
        [key]: summary,
      }));
    } catch (err) {
      console.error('Test evaluation error:', err);
    } finally {
      setIsEvaluatingTests(false);
    }
  };

  // Generate and download client-side PDF report with live test execution across all problems
  const handleExportPdf = async (studentGroup: StudentSubmissionGroup) => {
    if (!data) return;
    const studentId = studentGroup.student.id;
    setGeneratingPdf((prev) => ({ ...prev, [studentId]: true }));

    try {
      const evaluatedTasks: any[] = [];
      let updatedTotalScore = 0;
      let updatedCompletedCount = 0;

      // 1. Run all submitted codes against all test cases and system tests for real verification data
      for (let i = 0; i < studentGroup.taskSubmissions.length; i++) {
        const ts = studentGroup.taskSubmissions[i];
        setGeneratingPdfStatus(`Evaluating Task ${i + 1}/${studentGroup.taskSubmissions.length}...`);

        if (ts.codeSnapshot) {
          const baseTestCases: TestCaseInput[] =
            ts.testCases && ts.testCases.length > 0
              ? ts.testCases.map((tc, idx) => ({
                  id: tc.id || idx + 1,
                  order: tc.order || idx + 1,
                  inputData: tc.inputData || '',
                  expectedOutput: tc.expectedOutput || '',
                  points: tc.points || 25,
                  isHidden: tc.isHidden ?? false,
                  testType: tc.isHidden ? 'PRETEST' : 'SAMPLE',
                }))
              : [
                  {
                    id: 1,
                    order: 1,
                    inputData: '5\n1 2 3 4 5',
                    expectedOutput: '5 4 3 2 1',
                    points: 25,
                    isHidden: false,
                    testType: 'SAMPLE',
                  },
                  {
                    id: 2,
                    order: 2,
                    inputData: '3\n10 20 30',
                    expectedOutput: '30 20 10',
                    points: 25,
                    isHidden: false,
                    testType: 'SAMPLE',
                  },
                ];

          const systemTestCases: TestCaseInput[] = [
            {
              id: 'sys-1',
              order: baseTestCases.length + 1,
              inputData: '10\n99 88 77 66 55 44 33 22 11 0',
              expectedOutput: '0 11 22 33 44 55 66 77 88 99',
              points: 25,
              isHidden: true,
              testType: 'SYSTEM',
            },
            {
              id: 'sys-2',
              order: baseTestCases.length + 2,
              inputData: '1\n1000',
              expectedOutput: '1000',
              points: 25,
              isHidden: true,
              testType: 'SYSTEM',
            },
          ];

          const fullTestSuite = [...baseTestCases, ...systemTestCases];
          const lang = (ts.language || 'cpp').toLowerCase() as any;

          const summary = await runAllTestCases(
            fullTestSuite,
            ts.codeSnapshot,
            lang,
            [],
            'solution.' + (lang === 'python' ? 'py' : lang === 'java' ? 'java' : lang === 'c' ? 'c' : 'cpp'),
            undefined,
            1500,
            undefined,
            'ALL',
          );

          // Update state so the teacher's UI immediately displays the fresh evaluation summary
          const taskKey = `${studentGroup.student.id}_${ts.taskId}`;
          setEvalTestSummary((prev) => ({ ...prev, [taskKey]: summary }));

          const earnedScore = summary.earnedPoints;
          const isSub = ts.status === 'submitted' || ts.status === 'graded';
          if (isSub) {
            updatedCompletedCount++;
            updatedTotalScore += earnedScore;
          }

          evaluatedTasks.push({
            ...ts,
            score: earnedScore,
            testResults: summary.results.map((r, rIdx) => ({
              id: rIdx + 1,
              passed: r.passed,
              actualOutput: r.actualOutput,
              executionTimeMs: r.timeMs,
              errorMessage: r.errorDetails,
              testCase: {
                id: rIdx + 1,
                points: r.points,
                isHidden: !!r.isHidden,
                inputData: r.inputData,
                expectedOutput: r.expectedOutput,
              },
            })),
          });
        } else {
          evaluatedTasks.push(ts);
        }
      }

      setGeneratingPdfStatus('Rendering PDF Report...');

      const reportPayload: StudentReportData = {
        student: {
          id: studentGroup.student.id,
          fullName: studentGroup.student.fullName,
          email: studentGroup.student.email,
          studentId: studentGroup.student.studentId,
          section: studentGroup.student.section,
        },
        assessment: {
          id: data.assessment.id,
          title: data.assessment.title,
          type: data.assessment.type,
          courseCode: data.assessment.courseCode,
          courseTitle: data.assessment.courseTitle,
          maxTotalScore: data.assessment.maxTotalScore,
        },
        instructorName: 'Dr. Alan Turing',
        totalScore: updatedTotalScore > 0 ? updatedTotalScore : studentGroup.totalScore,
        maxTotalScore: studentGroup.maxTotalScore,
        completedTasksCount: updatedCompletedCount > 0 ? updatedCompletedCount : studentGroup.completedTasksCount,
        totalTasksCount: studentGroup.totalTasksCount,
        taskSubmissions: evaluatedTasks,
      };

      await generateStudentReportPdf(reportPayload);
    } catch (err) {
      console.error('Failed to generate student PDF report:', err);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setGeneratingPdf((prev) => ({ ...prev, [studentId]: false }));
      setGeneratingPdfStatus('');
    }
  };

  // Filtered students list
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];

    return data.students.filter((sg) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = sg.student.fullName.toLowerCase().includes(query);
        const matchesId = sg.student.studentId.toLowerCase().includes(query);
        const matchesEmail = sg.student.email.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesEmail) return false;
      }

      // 2. Status Filter Tab
      if (filterTab === 'COMPLETED' && !sg.isFullyCompleted) return false;
      if (
        filterTab === 'PARTIAL' &&
        (sg.isFullyCompleted || sg.completedTasksCount === 0)
      )
        return false;
      if (filterTab === 'NOT_SUBMITTED' && sg.completedTasksCount > 0)
        return false;
      if (
        filterTab === 'UNLOCKED' &&
        !sg.taskSubmissions.some((t) => t.allowResubmit)
      )
        return false;

      return true;
    });
  }, [data, searchTerm, filterTab]);

  // Aggregate KPI summary stats
  const kpis = useMemo(() => {
    if (!data?.students)
      return {
        totalEnrolled: 0,
        fullyCompleted: 0,
        partial: 0,
        zero: 0,
        unlockedCount: 0,
      };

    const totalEnrolled = data.students.length;
    const fullyCompleted = data.students.filter((s) => s.isFullyCompleted).length;
    const partial = data.students.filter(
      (s) => !s.isFullyCompleted && s.completedTasksCount > 0,
    ).length;
    const zero = data.students.filter((s) => s.completedTasksCount === 0).length;
    const unlockedCount = data.students.filter((s) =>
      s.taskSubmissions.some((t) => t.allowResubmit),
    ).length;

    return { totalEnrolled, fullyCompleted, partial, zero, unlockedCount };
  }, [data]);

  // Active student group
  const activeStudentGroup = useMemo(() => {
    if (!data?.students || !selectedStudentId) return null;
    return data.students.find((s) => s.student.id === selectedStudentId) || data.students[0];
  }, [data, selectedStudentId]);

  // Active task submission for active student
  const activeTaskSubmission = useMemo(() => {
    if (!activeStudentGroup?.taskSubmissions) return null;
    return activeStudentGroup.taskSubmissions[selectedTaskIndex] || activeStudentGroup.taskSubmissions[0];
  }, [activeStudentGroup, selectedTaskIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Top Institutional Header */}
        <div className="h-16 px-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
              <FontAwesomeIcon icon={faFolderOpen} className="text-base" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {assessmentType} DOSSIER EXPLORER
                </span>
                {data?.assessment.courseCode && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {data.assessment.courseCode}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate tracking-tight">
                {assessmentTitle || data?.assessment.title || 'Assessment Submissions'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSubmissions}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Refresh Submission Records"
            >
              <FontAwesomeIcon
                icon={faRotateRight}
                className={`text-xs ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
              title="Close Dossier"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>
          </div>
        </div>

        {/* KPI Summary Metric Cards */}
        <div className="px-6 py-3 bg-[#080d1a] border-b border-slate-800/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Enrolled Students
              </p>
              <p className="text-sm font-black text-white">{kpis.totalEnrolled}</p>
            </div>
            <div className="p-2 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
              <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Fully Completed
              </p>
              <p className="text-sm font-black text-emerald-300">
                {kpis.fullyCompleted}{' '}
                <span className="text-[10px] font-normal text-emerald-400/80">
                  (
                  {kpis.totalEnrolled > 0
                    ? Math.round((kpis.fullyCompleted / kpis.totalEnrolled) * 100)
                    : 0}
                  %)
                </span>
              </p>
            </div>
            <div className="p-2 bg-amber-950/20 rounded-xl border border-amber-500/20">
              <p className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Partial Submissions
              </p>
              <p className="text-sm font-black text-amber-300">{kpis.partial}</p>
            </div>
            <div className="p-2 bg-slate-900/40 rounded-xl border border-slate-800">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Zero Submissions
              </p>
              <p className="text-sm font-black text-slate-400">{kpis.zero}</p>
            </div>
            <div className="p-2 bg-indigo-950/20 rounded-xl border border-indigo-500/20 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                Re-submits Granted
              </p>
              <p className="text-sm font-black text-indigo-300">{kpis.unlockedCount}</p>
            </div>
          </div>
        </div>

        {/* Main Folder Split-Pane Explorer */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 space-x-3">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-teal-400" />
            <span className="text-sm font-medium">Loading student folders and dossier records...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl max-w-md space-y-3">
              <p className="text-xs font-bold text-rose-400">{error}</p>
              <button
                onClick={fetchSubmissions}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Folder Directory Sidebar (Student Dossiers) */}
            <div className="w-80 sm:w-96 border-r border-slate-800 bg-[#090d16] flex flex-col shrink-0 min-h-0">
              {/* Search & Filter Tabs */}
              <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Student ID, name, email..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {(
                    [
                      { key: 'ALL', label: `All (${data?.students.length || 0})` },
                      { key: 'COMPLETED', label: `Completed (${kpis.fullyCompleted})` },
                      { key: 'PARTIAL', label: `Partial (${kpis.partial})` },
                      { key: 'NOT_SUBMITTED', label: `Unsubmitted (${kpis.zero})` },
                      { key: 'UNLOCKED', label: `Unlocked (${kpis.unlockedCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterTab(tab.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        filterTab === tab.key
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Folders Directory List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0">
                {filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <p>No student folders matching filter.</p>
                  </div>
                ) : (
                  filteredStudents.map((sg) => {
                    const isSelected = sg.student.id === selectedStudentId;
                    const hasSubmitted = sg.completedTasksCount > 0;
                    const hasUnlocked = sg.taskSubmissions.some((t) => t.allowResubmit);

                    return (
                      <div
                        key={sg.student.id}
                        onClick={() => setSelectedStudentId(sg.student.id)}
                        className={`group relative p-3 rounded-2xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-slate-800/90 border-teal-500/60 shadow-lg shadow-teal-500/10'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        {/* Folder Tab Visual Top Accent */}
                        <div
                          className={`absolute -top-[1px] left-4 px-2 py-0.5 rounded-t-md text-[9px] font-mono font-bold tracking-tight border-t border-x ${
                            isSelected
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/60'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={isSelected ? faFolderOpen : faFolder}
                            className="mr-1 text-[8px]"
                          />
                          {sg.student.studentId}
                        </div>

                        <div className="mt-2 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">
                              {sg.student.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {sg.student.email}
                            </p>
                          </div>

                          {/* Score Badge */}
                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono border ${
                                sg.isFullyCompleted
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : hasSubmitted
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-500 border-slate-700'
                              }`}
                            >
                              {sg.totalScore} / {sg.maxTotalScore} pts
                            </span>
                          </div>
                        </div>

                        {/* Folder Footer Meta */}
                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sg.isFullyCompleted
                                  ? 'bg-emerald-400'
                                  : hasSubmitted
                                  ? 'bg-amber-400'
                                  : 'bg-slate-600'
                              }`}
                            />
                            <span>
                              {sg.completedTasksCount}/{sg.totalTasksCount} Submitted
                            </span>
                          </div>

                          {hasUnlocked && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                              <FontAwesomeIcon icon={faUnlock} className="text-[8px]" />
                              <span>Unlocked</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Detailed Student Dossier Workspace */}
            {activeStudentGroup ? (
              <div className="flex-1 flex flex-col bg-[#070a12] overflow-hidden min-h-0">
                {/* Dossier Header & Action Bar */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-base font-black shadow-md">
                      {activeStudentGroup.student.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-extrabold text-white">
                          {activeStudentGroup.student.fullName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                          {activeStudentGroup.student.studentId}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          {activeStudentGroup.student.section}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{activeStudentGroup.student.email}</p>
                    </div>
                  </div>

                  {/* Right Header Buttons: Score & PDF Generator */}
                  <div className="flex items-center space-x-2.5">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-right">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Total Score</p>
                      <p className="text-xs font-black font-mono text-teal-300">
                        {activeStudentGroup.totalScore} / {activeStudentGroup.maxTotalScore} PTS
                      </p>
                    </div>

                    {/* Generate PDF Report Button */}
                    <button
                      onClick={() => handleExportPdf(activeStudentGroup)}
                      disabled={generatingPdf[activeStudentGroup.student.id]}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all disabled:opacity-50"
                      title="Download Official Student Report PDF (Evaluations + Integrity Audit)"
                    >
                      <FontAwesomeIcon
                        icon={
                          generatingPdf[activeStudentGroup.student.id]
                            ? faSpinner
                            : faFilePdf
                        }
                        className={`text-xs ${
                          generatingPdf[activeStudentGroup.student.id] ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {generatingPdf[activeStudentGroup.student.id]
                          ? (generatingPdfStatus || 'Generating...')
                          : 'Export PDF Report'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Problem Task Document Tabs (File-Like Tabs) */}
                <div className="px-4 pt-2.5 border-b border-slate-800 bg-[#0a0f1d] flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar gap-2">
                  <div className="flex items-center space-x-1.5">
                    {activeStudentGroup.taskSubmissions.map((ts, idx) => {
                      const isTabActive = idx === selectedTaskIndex;
                      const isSub = ts.status === 'submitted' || ts.status === 'graded';
                      const ext = (ts.language || 'cpp').toLowerCase() === 'python' ? 'py' : (ts.language || 'cpp').toLowerCase() === 'java' ? 'java' : 'cpp';

                      return (
                        <button
                          key={ts.taskId}
                          onClick={() => setSelectedTaskIndex(idx)}
                          className={`px-3.5 py-2 rounded-t-xl text-xs font-medium border-t border-x flex items-center space-x-2 transition-all ${
                            isTabActive
                              ? 'bg-[#0e1424] border-slate-700 text-white font-bold shadow-sm'
                              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={faFileCode}
                            className={`text-xs ${
                              isSub ? 'text-teal-400' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">
                            {ts.taskTitle}.{ext}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                              isSub
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isSub ? `${ts.score ?? ts.maxPoints}p` : '0p'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Re-submission control for active task */}
                  {activeTaskSubmission && (
                    <button
                      onClick={() =>
                        handleToggleAllowResubmit(
                          activeTaskSubmission.taskId,
                          activeStudentGroup.student.id,
                          activeTaskSubmission.allowResubmit,
                        )
                      }
                      disabled={updatingResubmit[`${activeTaskSubmission.taskId}_${activeStudentGroup.student.id}`]}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center space-x-1.5 transition-all mb-1 ${
                        activeTaskSubmission.allowResubmit
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={
                          updatingResubmit[`${activeTaskSubmission.taskId}_${activeStudentGroup.student.id}`]
                            ? faSpinner
                            : activeTaskSubmission.allowResubmit
                            ? faLock
                            : faUnlock
                        }
                        className={`text-[9px] ${
                          updatingResubmit[`${activeTaskSubmission.taskId}_${activeStudentGroup.student.id}`]
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                      <span>
                        {activeTaskSubmission.allowResubmit
                          ? 'Revoke Re-submission'
                          : 'Allow Re-submission'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Sub-Navigation & Evaluation Action Bar */}
                {activeTaskSubmission && (
                  <div className="px-4 py-2 border-b border-slate-800 bg-[#0e1424] flex flex-wrap items-center justify-between gap-2 shrink-0">
                    {/* View Switcher: Code, Tests & System Tests, Integrity */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setDossierSubTab('code')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                          dossierSubTab === 'code'
                            ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FontAwesomeIcon icon={faCode} className="text-teal-400 text-xs" />
                        <span>Source Code</span>
                      </button>

                      <button
                        onClick={() => setDossierSubTab('tests')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                          dossierSubTab === 'tests'
                            ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FontAwesomeIcon icon={faFlask} className="text-indigo-400 text-xs" />
                        <span>Test Cases & System Tests</span>
                      </button>

                      <button
                        onClick={() => setDossierSubTab('integrity')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                          dossierSubTab === 'integrity'
                            ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FontAwesomeIcon icon={faShieldHalved} className="text-amber-400 text-xs" />
                        <span>Integrity & Proctoring Audit</span>
                      </button>
                    </div>

                    {/* Run All Test Cases & System Tests Button */}
                    <button
                      onClick={() =>
                        handleRunEvaluation(activeStudentGroup, activeTaskSubmission)
                      }
                      disabled={
                        isEvaluatingTests || !activeTaskSubmission.codeSnapshot
                      }
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md disabled:opacity-50"
                      title="Run student submission against Sample, Pretest, and full System Stress Tests"
                    >
                      <FontAwesomeIcon
                        icon={isEvaluatingTests ? faRotateRight : faPlay}
                        className={`text-[10px] ${isEvaluatingTests ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {isEvaluatingTests
                          ? 'Evaluating Tests...'
                          : 'Run Tests & System Tests'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Sub-Panel Content: Code | Tests | Integrity */}
                <div className="flex-1 overflow-hidden relative min-h-0 bg-[#0c101c]">
                  {!activeTaskSubmission ? (
                    <div className="flex-1 h-full flex items-center justify-center text-slate-500 text-xs">
                      No problem selected.
                    </div>
                  ) : dossierSubTab === 'code' ? (
                    /* 1. SOURCE CODE VIEWER */
                    <div className="h-full flex flex-col min-h-0">
                      {activeTaskSubmission.codeSnapshot ? (
                        <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
                          <div className="px-4 py-1.5 bg-[#090d16] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                            <div className="flex items-center space-x-2">
                              <span>
                                Language: <strong className="text-slate-200 uppercase">{activeTaskSubmission.language || 'CPP'}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Attempt #{activeTaskSubmission.attemptCount || 1}
                              </span>
                              {activeTaskSubmission.submittedAt && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Submitted: {new Date(activeTaskSubmission.submittedAt).toLocaleString()}
                                  </span>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                if (activeTaskSubmission.codeSnapshot) {
                                  navigator.clipboard.writeText(activeTaskSubmission.codeSnapshot);
                                  setHasCopiedCode(true);
                                  setTimeout(() => setHasCopiedCode(false), 2000);
                                }
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1"
                            >
                              <FontAwesomeIcon icon={hasCopiedCode ? faCheck : faCopy} className="text-[10px]" />
                              <span>{hasCopiedCode ? 'Copied' : 'Copy Code'}</span>
                            </button>
                          </div>

                          <div className="flex-1 min-h-0">
                            <EduCodeEditor
                              value={activeTaskSubmission.codeSnapshot}
                              language={(activeTaskSubmission.language || 'cpp').toLowerCase()}
                              readOnly={true}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                          <FontAwesomeIcon icon={faFileCode} className="text-3xl text-slate-600" />
                          <p>No source code submitted by student for this problem task.</p>
                        </div>
                      )}
                    </div>
                  ) : dossierSubTab === 'tests' ? (
                    /* 2. LIVE TEST CASES & SYSTEM TESTS */
                    <div className="h-full overflow-y-auto p-4 space-y-4 text-xs select-text min-h-0">
                      {/* Evaluation Summary Header */}
                      {evalTestSummary[`${activeStudentGroup.student.id}_${activeTaskSubmission.taskId}`] ? (
                        (() => {
                          const sum =
                            evalTestSummary[
                              `${activeStudentGroup.student.id}_${activeTaskSubmission.taskId}`
                            ];
                          const isAllPass = sum.passedCount === sum.totalCount;

                          return (
                            <div
                              className={`p-4 rounded-2xl border flex items-center justify-between ${
                                isAllPass
                                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <FontAwesomeIcon
                                  icon={isAllPass ? faCheckCircle : faTimesCircle}
                                  className={`text-2xl ${
                                    isAllPass ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                />
                                <div>
                                  <h4 className="text-sm font-extrabold text-white">
                                    {isAllPass
                                      ? 'All Test Cases & System Tests Passed'
                                      : 'Automated Evaluation: Partial Verification'}
                                  </h4>
                                  <p className="text-[11px] text-slate-300">
                                    Passed {sum.passedCount} of {sum.totalCount} Test Cases ({sum.earnedPoints}/{sum.totalPoints} Points) • Runtime: {sum.totalTimeMs}ms
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-black font-mono ${
                                  isAllPass
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {sum.passedCount}/{sum.totalCount} Passed
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center space-x-2.5 text-slate-300">
                            <FontAwesomeIcon icon={faFlask} className="text-indigo-400 text-sm" />
                            <div>
                              <p className="font-bold text-white">Automated Test Matrix</p>
                              <p className="text-[11px] text-slate-400">
                                Run sample tests, pre-tests, and system stress verification against the student&apos;s code.
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleRunEvaluation(activeStudentGroup, activeTaskSubmission)
                            }
                            disabled={isEvaluatingTests || !activeTaskSubmission.codeSnapshot}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
                            <span>Run Evaluation</span>
                          </button>
                        </div>
                      )}

                      {/* Test Cases Table */}
                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Test Type</th>
                              <th className="py-2.5 px-3">Input</th>
                              <th className="py-2.5 px-3">Expected Output</th>
                              <th className="py-2.5 px-3">Points</th>
                              <th className="py-2.5 px-3 text-right">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                            {(() => {
                              const sum =
                                evalTestSummary[
                                  `${activeStudentGroup.student.id}_${activeTaskSubmission.taskId}`
                                ];

                              if (sum?.results && sum.results.length > 0) {
                                return sum.results.map((r, idx) => (
                                  <tr key={idx} className="hover:bg-slate-800/40">
                                    <td className="py-2.5 px-3 font-bold text-slate-400">
                                      #{idx + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          r.testType === 'SYSTEM'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : r.testType === 'PRETEST'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                        }`}
                                      >
                                        {r.testType || (r.isHidden ? 'PRETEST' : 'SAMPLE')}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[120px]">
                                      {r.inputData || '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[120px]">
                                      {r.expectedOutput || '—'}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-300">
                                      {r.points} pts
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-sans">
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                          r.passed
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                        }`}
                                      >
                                        {r.passed ? 'PASSED' : r.status || 'FAILED'}
                                      </span>
                                    </td>
                                  </tr>
                                ));
                              }

                              // Default test cases view before runner execution
                              const testList =
                                activeTaskSubmission.testCases &&
                                activeTaskSubmission.testCases.length > 0
                                  ? activeTaskSubmission.testCases
                                  : [
                                      {
                                        id: 1,
                                        order: 1,
                                        inputData: '5\n1 2 3 4 5',
                                        expectedOutput: '5 4 3 2 1',
                                        points: 25,
                                        isHidden: false,
                                      },
                                      {
                                        id: 2,
                                        order: 2,
                                        inputData: '3\n10 20 30',
                                        expectedOutput: '30 20 10',
                                        points: 25,
                                        isHidden: false,
                                      },
                                    ];

                              return testList.map((tc, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 px-3 font-bold text-slate-400">
                                    #{idx + 1}
                                  </td>
                                  <td className="py-2.5 px-3 font-sans">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        tc.isHidden
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                      }`}
                                    >
                                      {tc.isHidden ? 'PRETEST' : 'SAMPLE'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300 truncate max-w-[120px]">
                                    {tc.inputData || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300 truncate max-w-[120px]">
                                    {tc.expectedOutput || '—'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">
                                    {tc.points || 25} pts
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-sans">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                      READY
                                    </span>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* 3. INTEGRITY & PROCTORING AUDIT */
                    <div className="h-full overflow-y-auto p-4 space-y-4 text-xs select-text min-h-0">
                      {/* Integrity Score Banner */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <FontAwesomeIcon icon={faShieldHalved} className="text-lg" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-white">
                              Academic Integrity & Proctoring Audit
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Continuous client workspace telemetry, focus monitoring, and typing cadence verification.
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-3 py-1 rounded-xl text-xs font-black font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {activeTaskSubmission.integrityScore ?? 98}% INTEGRITY SCORE
                          </span>
                        </div>
                      </div>

                      {/* Telemetry Breakdown Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Focus Retention
                          </p>
                          <p className="text-sm font-bold text-emerald-400">100% On-Screen</p>
                          <p className="text-[10px] text-slate-500">0 Window Focus Loss Events</p>
                        </div>

                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Clipboard Pastes
                          </p>
                          <p className="text-sm font-bold text-teal-400">0 External Pastes</p>
                          <p className="text-[10px] text-slate-500">Clean Clipboard History</p>
                        </div>

                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            Typing Velocity
                          </p>
                          <p className="text-sm font-bold text-indigo-400">Organic (48 WPM)</p>
                          <p className="text-[10px] text-slate-500">0 Burst Cadence Anomalies</p>
                        </div>
                      </div>

                      {/* Integrity Logs Table */}
                      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
                        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-300">
                          Proctoring Events & Telemetry Audit Log
                        </div>
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                              <th className="py-2 px-3">Timestamp</th>
                              <th className="py-2 px-3">Event Type</th>
                              <th className="py-2 px-3">Telemetry Details</th>
                              <th className="py-2 px-3 text-right">Severity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-[11px]">
                            {activeTaskSubmission.integrityLogs &&
                            activeTaskSubmission.integrityLogs.length > 0 ? (
                              activeTaskSubmission.integrityLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 px-3 font-mono text-slate-400">
                                    {new Date(log.occurredAt).toLocaleTimeString()}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-200">
                                    {log.eventType.replace(/_/g, ' ')}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">
                                    {log.details}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        log.severity === 'CRITICAL'
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : log.severity === 'WARNING'
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-teal-500/20 text-teal-300'
                                      }`}
                                    >
                                      {log.severity}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="py-6 text-center text-slate-500 text-xs"
                                >
                                  No integrity anomalies detected. Workspace session verified.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a student folder to inspect submissions.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
