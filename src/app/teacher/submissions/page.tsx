'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFolder,
  faFolderOpen,
  faFlask,
  faFileAlt,
  faAward,
  faStream,
  faUsers,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faUnlock,
  faLock,
  faRotateRight,
  faChevronDown,
  faChevronRight,
  faExternalLinkAlt,
  faLaptopCode,
  faCode,
  faFileCode,
  faFilter,
  faGraduationCap,
  faLayerGroup,
  faBookOpen,
  faChalkboardTeacher,
  faListCheck,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AssessmentSubmissionsModal } from '@/components/classroom/AssessmentSubmissionsModal';

export interface GroupedProblemSubmission {
  taskId: string;
  taskTitle: string;
  maxPoints: number;
  language?: string;
  submissionId: string | null;
  status: string;
  score: number;
  codeSnapshot: string | null;
  submittedAt: string | null;
  allowResubmit: boolean;
  attemptCount: number;
  testCasesCount: number;
}

export interface GroupedStudentDossier {
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
  allowResubmitAny: boolean;
  taskSubmissions: GroupedProblemSubmission[];
}

export interface GroupedAssessmentItem {
  id: string;
  targetType: 'ASSESSMENT' | 'TASK';
  title: string;
  description?: string | null;
  type: 'EXAM' | 'LAB' | 'ASSIGNMENT' | 'POST' | string;
  status: string;
  totalTasks: number;
  maxScore: number;
  createdAt: string;
  deadline: string | null;
  enrolledCount: number;
  submittedCount: number;
  fullyCompletedCount: number;
  resubmitGrantedCount: number;
  averageScore: number;
  students: GroupedStudentDossier[];
}

export interface ClassroomSubmissionsGroup {
  id: string;
  code: string;
  title: string;
  enrolledCount: number;
  categories: {
    LAB: GroupedAssessmentItem[];
    ASSIGNMENT: GroupedAssessmentItem[];
    EXAM: GroupedAssessmentItem[];
    POST: GroupedAssessmentItem[];
  };
  stats: {
    totalAssessments: number;
    totalSubmissions: number;
    totalLabs: number;
    totalAssignments: number;
    totalExams: number;
    totalPosts: number;
  };
}

export default function SubmissionsPage() {
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<ClassroomSubmissionsGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Classroom Selection (default to first course or 'ALL')
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('ALL');

  // Active Category Tab: 'ALL' | 'LAB' | 'ASSIGNMENT' | 'EXAM' | 'POST'
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'ALL' | 'LAB' | 'ASSIGNMENT' | 'EXAM' | 'POST'
  >('ALL');

  // Search query
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Expanded items in accordion: set of item IDs
  const [expandedItems, setExpandedItems] = useState<{ [itemId: string]: boolean }>({});

  // Active Dossier Modal target
  const [modalTarget, setModalTarget] = useState<{
    targetId: string;
    targetType: 'ASSESSMENT' | 'TASK';
    title: string;
    type: string;
  } | null>(null);

  const fetchGroupedSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<{ success: boolean; classrooms: ClassroomSubmissionsGroup[] }>(
        '/submissions/grouped',
      );
      const list = res.data.classrooms || [];
      setClassrooms(list);
      if (list.length > 0 && selectedClassroomId === 'ALL') {
        setSelectedClassroomId(list[0].id);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load classroom submissions';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassroomId]);

  useEffect(() => {
    fetchGroupedSubmissions();
  }, [fetchGroupedSubmissions]);

  // Overall Global KPI aggregations
  const globalKpis = useMemo(() => {
    let totalClassrooms = classrooms.length;
    let totalEnrolled = 0;
    let totalLabs = 0;
    let totalAssignments = 0;
    let totalExams = 0;
    let totalPosts = 0;
    let totalSubmissions = 0;
    let totalResubmits = 0;

    for (const c of classrooms) {
      totalEnrolled += c.enrolledCount;
      totalLabs += c.categories.LAB.length;
      totalAssignments += c.categories.ASSIGNMENT.length;
      totalExams += c.categories.EXAM.length;
      totalPosts += c.categories.POST.length;
      totalSubmissions += c.stats.totalSubmissions;

      const allItems = [
        ...c.categories.LAB,
        ...c.categories.ASSIGNMENT,
        ...c.categories.EXAM,
        ...c.categories.POST,
      ];
      for (const item of allItems) {
        totalResubmits += item.resubmitGrantedCount;
      }
    }

    return {
      totalClassrooms,
      totalEnrolled,
      totalLabs,
      totalAssignments,
      totalExams,
      totalPosts,
      totalSubmissions,
      totalResubmits,
    };
  }, [classrooms]);

  // Determine currently active classrooms to render
  const displayedClassrooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return classrooms
      .filter((c) => {
        if (selectedClassroomId !== 'ALL' && c.id !== selectedClassroomId) {
          return false;
        }
        return true;
      })
      .map((c) => {
        const filterItems = (items: GroupedAssessmentItem[]) => {
          return items.filter((item) => {
            if (!term) return true;

            const matchesTitle = item.title.toLowerCase().includes(term);
            const matchesCourse = c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term);
            const matchesStudent = item.students.some(
              (sd) =>
                sd.student.studentId.toLowerCase().includes(term) ||
                sd.student.fullName.toLowerCase().includes(term) ||
                sd.student.email.toLowerCase().includes(term),
            );
            const matchesProblem = item.students.some((sd) =>
              sd.taskSubmissions.some((ts) => ts.taskTitle.toLowerCase().includes(term)),
            );

            return matchesTitle || matchesCourse || matchesStudent || matchesProblem;
          });
        };

        const labItems =
          activeCategoryTab === 'ALL' || activeCategoryTab === 'LAB'
            ? filterItems(c.categories.LAB)
            : [];
        const assignmentItems =
          activeCategoryTab === 'ALL' || activeCategoryTab === 'ASSIGNMENT'
            ? filterItems(c.categories.ASSIGNMENT)
            : [];
        const examItems =
          activeCategoryTab === 'ALL' || activeCategoryTab === 'EXAM'
            ? filterItems(c.categories.EXAM)
            : [];
        const postItems =
          activeCategoryTab === 'ALL' || activeCategoryTab === 'POST'
            ? filterItems(c.categories.POST)
            : [];

        const totalFilteredItems =
          labItems.length + assignmentItems.length + examItems.length + postItems.length;

        return {
          ...c,
          categories: {
            LAB: labItems,
            ASSIGNMENT: assignmentItems,
            EXAM: examItems,
            POST: postItems,
          },
          totalFilteredItems,
        };
      });
  }, [classrooms, selectedClassroomId, activeCategoryTab, searchTerm]);

  const toggleExpandItem = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getCategoryMeta = (type: string) => {
    switch (type.toUpperCase()) {
      case 'EXAM':
        return {
          label: 'EXAMINATION',
          shortLabel: 'Exam',
          icon: faAward,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          accentBorder: 'border-l-4 border-l-rose-500',
          cardBg: 'bg-[#100d18]',
        };
      case 'LAB':
        return {
          label: 'LABORATORY',
          shortLabel: 'Lab',
          icon: faFlask,
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          accentBorder: 'border-l-4 border-l-teal-500',
          cardBg: 'bg-[#09131a]',
        };
      case 'ASSIGNMENT':
        return {
          label: 'ASSIGNMENT',
          shortLabel: 'Assignment',
          icon: faFileAlt,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          accentBorder: 'border-l-4 border-l-indigo-500',
          cardBg: 'bg-[#0d1022]',
        };
      case 'POST':
        return {
          label: 'STREAM POST',
          shortLabel: 'Post Task',
          icon: faStream,
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          accentBorder: 'border-l-4 border-l-purple-500',
          cardBg: 'bg-[#120e20]',
        };
      default:
        return {
          label: type,
          shortLabel: type,
          icon: faFileAlt,
          badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
          accentBorder: 'border-l-4 border-l-slate-600',
          cardBg: 'bg-[#0c1220]',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 via-indigo-500/20 to-purple-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/10">
            <FontAwesomeIcon icon={faChalkboardTeacher} className="text-xl" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Instructor Hub
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                Submission Dossier Center
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
              Course Submissions & Grading Management
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchGroupedSubmissions}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-sm active:scale-95"
            title="Refresh All Submission Records"
          >
            <FontAwesomeIcon
              icon={faRotateRight}
              className={`text-xs ${isLoading ? 'animate-spin text-teal-400' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Institutional Top KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 bg-[#0a0f1d] border border-slate-800 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Enrolled Students
          </p>
          <p className="text-lg font-black text-white mt-0.5">{globalKpis.totalEnrolled}</p>
        </div>

        <div className="p-3 bg-teal-950/20 border border-teal-500/20 rounded-2xl">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
            Total Labs
          </p>
          <p className="text-lg font-black text-teal-300 mt-0.5">{globalKpis.totalLabs}</p>
        </div>

        <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            Assignments
          </p>
          <p className="text-lg font-black text-indigo-300 mt-0.5">{globalKpis.totalAssignments}</p>
        </div>

        <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-2xl">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
            Exams
          </p>
          <p className="text-lg font-black text-rose-300 mt-0.5">{globalKpis.totalExams}</p>
        </div>

        <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
            Stream Posts
          </p>
          <p className="text-lg font-black text-purple-300 mt-0.5">{globalKpis.totalPosts}</p>
        </div>

        <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Submissions
          </p>
          <p className="text-lg font-black text-emerald-300 mt-0.5">
            {globalKpis.totalSubmissions}
          </p>
        </div>

        <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-2xl col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Re-submits
          </p>
          <p className="text-lg font-black text-amber-300 mt-0.5">
            {globalKpis.totalResubmits}
          </p>
        </div>
      </div>

      {/* STEP 1: CLASSROOM SELECTOR TABS (Crystal Clear Course Selection) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Select Classroom Course ({classrooms.length})
            </span>
          </div>
          {classrooms.length > 1 && (
            <button
              onClick={() => setSelectedClassroomId('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedClassroomId === 'ALL'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              View All Classrooms
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {classrooms.map((c) => {
            const isSelected = selectedClassroomId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClassroomId(c.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#0e1d2c] via-[#0d1624] to-[#0a101b] border-teal-500/60 ring-2 ring-teal-500/20 shadow-xl shadow-teal-500/5'
                    : 'bg-[#090e1a] hover:bg-[#0c1322] border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                {/* Top Row: Course Code & Active Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-black border uppercase tracking-wider ${
                      isSelected
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {c.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                    <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
                    <span>{c.enrolledCount} Students</span>
                  </span>
                </div>

                {/* Course Title */}
                <div className="my-2.5">
                  <h3
                    className={`text-sm font-black truncate ${
                      isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {c.title}
                  </h3>
                </div>

                {/* Bottom Category Mini Pills */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 w-full">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-teal-400 font-bold">{c.categories.LAB.length}L</span>
                    <span>•</span>
                    <span className="text-indigo-400 font-bold">{c.categories.ASSIGNMENT.length}A</span>
                    <span>•</span>
                    <span className="text-rose-400 font-bold">{c.categories.EXAM.length}E</span>
                    <span>•</span>
                    <span className="text-purple-400 font-bold">{c.categories.POST.length}P</span>
                  </div>
                  <span
                    className={`font-bold ${
                      c.stats.totalSubmissions > 0 ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {c.stats.totalSubmissions} Subs
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="p-3.5 bg-[#090e1a] border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student ID (e.g. STU-2026), student name, assessment title, problem..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-teal-500/60 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        {/* Category Tabs inside Selected View */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'All Items', icon: faLayerGroup },
              { id: 'LAB', label: 'Labs', icon: faFlask },
              { id: 'ASSIGNMENT', label: 'Assignments', icon: faFileAlt },
              { id: 'EXAM', label: 'Exams', icon: faAward },
              { id: 'POST', label: 'Stream Posts', icon: faStream },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategoryTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 ${
                activeCategoryTab === tab.id
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-[10px]" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Hierarchy: Distinct Course Sections -> Category Sections -> Assessment Cards -> Students -> Problems */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-3xl text-teal-400" />
          <p className="text-sm font-medium">Aggregating classroom submission records and dossiers...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-500/10 border border-rose-500/30 rounded-3xl text-center space-y-3 max-w-lg mx-auto">
          <p className="text-sm font-bold text-rose-400">{error}</p>
          <button
            onClick={fetchGroupedSubmissions}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
          >
            Try Again
          </button>
        </div>
      ) : displayedClassrooms.length === 0 ? (
        <div className="py-20 bg-[#090e1a] border border-slate-800 rounded-3xl text-center p-8 space-y-3">
          <FontAwesomeIcon icon={faFolderOpen} className="text-4xl text-slate-600" />
          <h3 className="text-base font-bold text-white">No Matching Submissions Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm
              ? `No assessments, stream posts, or student submissions matched your search "${searchTerm}".`
              : 'You do not have any published assessments or stream code posts in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {displayedClassrooms.map((classroom) => {
            const allCategories: Array<{
              key: 'LAB' | 'ASSIGNMENT' | 'EXAM' | 'POST';
              categoryTitle: string;
              categorySubtitle: string;
              icon: typeof faFlask;
              badgeClass: string;
              items: GroupedAssessmentItem[];
            }> = [
              {
                key: 'LAB',
                categoryTitle: 'Laboratory Practical Sessions',
                categorySubtitle: 'Hands-on programming laboratory evaluations with automated test runner',
                icon: faFlask,
                badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                items: classroom.categories.LAB,
              },
              {
                key: 'ASSIGNMENT',
                categoryTitle: 'Graded Homework & Problem Sets',
                categorySubtitle: 'Take-home coding assignments and problem implementations',
                icon: faFileAlt,
                badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                items: classroom.categories.ASSIGNMENT,
              },
              {
                key: 'EXAM',
                categoryTitle: 'Timed Examinations & Contests',
                categorySubtitle: 'Proctored assessments and timed coding examinations',
                icon: faAward,
                badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                items: classroom.categories.EXAM,
              },
              {
                key: 'POST',
                categoryTitle: 'Class Stream Code Tasks (Single Problem)',
                categorySubtitle: 'Code problems attached directly to announcements and stream posts',
                icon: faStream,
                badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                items: classroom.categories.POST,
              },
            ];

            return (
              <div
                key={classroom.id}
                className="bg-[#080d19] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-6 pb-6"
              >
                {/* 🌟 LEVEL 1: DISTINCT CLASSROOM HERO BANNER (Unmistakable Course Identity) */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0b1928] via-[#0e172a] to-[#0b1928] border-b border-teal-500/20 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-2xl shadow-xl shadow-teal-500/10 shrink-0">
                        <FontAwesomeIcon icon={faGraduationCap} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-black bg-teal-500 text-slate-950 uppercase tracking-wider shadow-sm">
                            {classroom.code}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700">
                            {classroom.enrolledCount} Enrolled Students
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {classroom.stats.totalSubmissions} Submissions Received
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
                          {classroom.title}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Items</p>
                        <p className="text-sm font-black font-mono text-teal-300">
                          {classroom.stats.totalAssessments} Total
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LEVEL 2 & 3: CATEGORIES & ASSESSMENT CARDS */}
                <div className="px-4 sm:px-6 space-y-6">
                  {allCategories.map(({ key, categoryTitle, categorySubtitle, icon, badgeClass, items }) => {
                    if (items.length === 0) return null;

                    return (
                      <div key={key} className="space-y-3.5">
                        {/* Category Sub-Header */}
                        <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800/80">
                          <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400 text-xs shrink-0">
                            <FontAwesomeIcon icon={icon} />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-200">
                              {categoryTitle} ({items.length})
                            </h3>
                          </div>
                        </div>

                        {/* Assessment / Post Cards Grid */}
                        <div className="grid grid-cols-1 gap-3.5">
                          {items.map((item) => {
                            const meta = getCategoryMeta(item.type);
                            const isExpanded = !!expandedItems[item.id];
                            const submissionPercent =
                              item.enrolledCount > 0
                                ? Math.round((item.submittedCount / item.enrolledCount) * 100)
                                : 0;

                            return (
                              <div
                                key={item.id}
                                className={`rounded-2xl border border-slate-800 transition-all shadow-md overflow-hidden ${meta.cardBg} ${meta.accentBorder}`}
                              >
                                {/* Card Header */}
                                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                  <div className="min-w-0 space-y-1.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${meta.badgeColor}`}
                                      >
                                        {meta.label}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-teal-300 border border-slate-800">
                                        {item.totalTasks === 1 ? '1 Problem' : `${item.totalTasks} Problems`}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-800">
                                        {item.maxScore} Pts
                                      </span>
                                      {item.deadline && (
                                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                                          <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                                          <span>Due {new Date(item.deadline).toLocaleString()}</span>
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-base sm:text-lg font-black text-white truncate">
                                      {item.title}
                                    </h4>
                                  </div>

                                  {/* Right side metrics and action buttons */}
                                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0">
                                    {/* Submission Rate Bar & Mini KPI Pills */}
                                    <div className="flex items-center space-x-3 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80">
                                      <div className="text-right">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">
                                          Turn-in Rate
                                        </p>
                                        <p className="text-xs font-mono font-bold text-teal-300">
                                          {item.submittedCount} / {item.enrolledCount} ({submissionPercent}%)
                                        </p>
                                      </div>
                                      <div className="w-16 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                                        <div
                                          className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full"
                                          style={{ width: `${Math.min(100, submissionPercent)}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center space-x-2">
                                      {/* Open Full Dossier Modal Button */}
                                      <button
                                        onClick={() =>
                                          setModalTarget({
                                            targetId: item.id,
                                            targetType: item.targetType,
                                            title: item.title,
                                            type: item.type,
                                          })
                                        }
                                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
                                        title="Open Folder Dossier Explorer with Code View, Test Runner & PDF Export"
                                      >
                                        <FontAwesomeIcon icon={faFolderOpen} className="text-xs" />
                                        <span>Open Submission Dossier</span>
                                      </button>

                                      {/* Quick Expand Toggle Button */}
                                      <button
                                        onClick={() => toggleExpandItem(item.id)}
                                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                                      >
                                        <span>Students ({item.students.length})</span>
                                        <FontAwesomeIcon
                                          icon={faChevronDown}
                                          className={`text-[10px] transition-transform ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* LEVEL 4 & 5: EXPANDED STUDENTS & PROBLEMS LIST */}
                                {isExpanded && (
                                  <div className="border-t border-slate-800/80 bg-[#070b16] p-4 sm:p-5 space-y-2.5 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                                      <span>Student Folder (ID / Name)</span>
                                      <div className="flex items-center space-x-6">
                                        <span>Problems Breakdown ({item.totalTasks})</span>
                                        <span>Total Score</span>
                                        <span>Dossier</span>
                                      </div>
                                    </div>

                                    {item.students.length === 0 ? (
                                      <p className="text-xs text-slate-500 text-center py-4">
                                        No students enrolled in this course yet.
                                      </p>
                                    ) : (
                                      item.students.map((sd) => {
                                        const hasSub = sd.completedTasksCount > 0;
                                        const isFull = sd.isFullyCompleted;

                                        return (
                                          <div
                                            key={sd.student.id}
                                            className="p-3 bg-[#0a0f1d] border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                                          >
                                            {/* Student Identity */}
                                            <div className="flex items-center space-x-3 min-w-0">
                                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xs font-black shadow-sm shrink-0">
                                                {sd.student.fullName.charAt(0)}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-xs font-black text-white truncate">
                                                    {sd.student.fullName}
                                                  </span>
                                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                                    {sd.student.studentId}
                                                  </span>
                                                  {sd.allowResubmitAny && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                                                      <FontAwesomeIcon icon={faUnlock} className="text-[8px]" />
                                                      <span>Unlocked</span>
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate">
                                                  {sd.student.email}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Problem Chips & Scores */}
                                            <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
                                              {/* Problems list (For post, 1 problem) */}
                                              <div className="flex items-center space-x-1.5">
                                                {sd.taskSubmissions.map((ts, pIdx) => {
                                                  const pSub = ts.status === 'submitted' || ts.status === 'graded';
                                                  const ext = (ts.language || 'cpp').toLowerCase() === 'python' ? 'py' : (ts.language || 'cpp').toLowerCase() === 'java' ? 'java' : 'cpp';

                                                  return (
                                                    <span
                                                      key={ts.taskId}
                                                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border flex items-center space-x-1 ${
                                                        pSub
                                                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                                          : 'bg-slate-900 text-slate-500 border-slate-800'
                                                      }`}
                                                      title={`${ts.taskTitle}.${ext} (${ts.score}/${ts.maxPoints} pts)`}
                                                    >
                                                      <FontAwesomeIcon icon={faFileCode} className="text-[9px]" />
                                                      <span className="truncate max-w-[90px]">
                                                        {item.totalTasks === 1 ? `${ts.taskTitle}.${ext}` : `P${pIdx + 1}: ${ts.score}p`}
                                                      </span>
                                                    </span>
                                                  );
                                                })}
                                              </div>

                                              {/* Total Score */}
                                              <div className="text-right min-w-[70px]">
                                                <span
                                                  className={`px-2 py-1 rounded-lg text-xs font-mono font-black ${
                                                    isFull
                                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                      : hasSub
                                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                                                  }`}
                                                >
                                                  {sd.totalScore} / {sd.maxTotalScore}p
                                                </span>
                                              </div>

                                              {/* Quick open in modal */}
                                              <button
                                                onClick={() =>
                                                  setModalTarget({
                                                    targetId: item.id,
                                                    targetType: item.targetType,
                                                    title: item.title,
                                                    type: item.type,
                                                  })
                                                }
                                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-teal-400 hover:text-teal-300 border border-slate-800 transition-all text-xs"
                                                title="Inspect student submission folder"
                                              >
                                                <FontAwesomeIcon icon={faFolderOpen} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Assessment / Task Submissions Dossier Modal */}
      {modalTarget && (
        <AssessmentSubmissionsModal
          isOpen={!!modalTarget}
          onClose={() => setModalTarget(null)}
          assessmentId={modalTarget.targetType === 'ASSESSMENT' ? modalTarget.targetId : undefined}
          taskId={modalTarget.targetType === 'TASK' ? modalTarget.targetId : undefined}
          assessmentTitle={modalTarget.title}
          assessmentType={modalTarget.type}
        />
      )}
    </div>
  );
}
