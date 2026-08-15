'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faEdit,
  faCheckCircle,
  faTimesCircle,
  faCode,
  faCalendarAlt,
  faBookOpen,
  faVial,
  faEyeSlash,
  faEye,
  faClock,
  faTasks,
  faExternalLinkAlt,
  faPlus,
  faChalkboardTeacher,
  faCopy,
  faCheck,
  faTerminal,
  faFlask,
  faGraduationCap,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';
import TeacherTaskIDE from '@/components/TeacherTaskIDE';

interface TestCase {
  id: number;
  inputData: string;
  expectedOutput: string;
  points: number;
  isHidden: boolean;
  order: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  templateCode?: string | null;
  taskType: string;
  language: string;
  maxPoints: number;
  deadline: string;
  allowAutocomplete: boolean;
  allowMultiFile: boolean;
  isExam: boolean;
  examDurationMin: number | null;
  isPublished: boolean;
  createdAt: string;
  assessmentId?: string | null;
  assessment?: {
    id: string;
    title: string;
    type: string;
    tasks?: Array<{
      id: string;
      title: string;
      taskType: string;
      language: string;
      maxPoints: number;
    }>;
  } | null;
  course: {
    id: string;
    code: string;
    title: string;
  };
  testCases: TestCase[];
}

export default function TeacherTaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ide'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTask() {
      try {
        setLoading(true);
        const res = await api.get(`/tasks/${id}`);
        setTask(res.data);
      } catch (err: unknown) {
        console.error('Failed to fetch task details:', err);
        setError('Task not found or you do not have permission to view it.');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchTask();
    }
  }, [id]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Loading problem workspace...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="glass-panel p-12 rounded-2xl border border-red-900/30 bg-red-900/10 text-center space-y-4 max-w-2xl mx-auto mt-10">
        <FontAwesomeIcon icon={faTimesCircle} className="text-5xl text-red-400" />
        <h2 className="text-xl font-bold text-white">Task Not Found</h2>
        <p className="text-sm text-red-300">{error}</p>
        <div className="pt-4">
          <Link href="/teacher/tasks" className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors">
            Back to Tasks
          </Link>
        </div>
      </div>
    );
  }

  const siblingTasks = task.assessment?.tasks || [];

  return (
    <div className="w-full max-w-[1800px] mx-auto px-3 md:px-6 pb-12 space-y-4">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
        <Link href="/teacher/tasks" className="hover:text-white transition-colors flex items-center space-x-1.5 font-medium">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Tasks</span>
        </Link>
        <span className="text-slate-600">/</span>
        <Link
          href={`/courses/${task.course.id}?tab=classwork`}
          className="hover:text-brand-300 transition-colors font-medium flex items-center space-x-1"
        >
          <FontAwesomeIcon icon={faChalkboardTeacher} className="text-brand-400 text-[11px]" />
          <span>{task.course.code} - {task.course.title}</span>
        </Link>
        {task.assessment && (
          <>
            <span className="text-slate-600">/</span>
            <Link
              href={`/courses/${task.course.id}?tab=classwork`}
              className={`hover:underline font-semibold flex items-center space-x-1 ${
                task.assessment.type === 'LAB' ? 'text-emerald-400' : task.assessment.type === 'EXAM' ? 'text-rose-400' : 'text-brand-400'
              }`}
            >
              <FontAwesomeIcon icon={task.assessment.type === 'LAB' ? faFlask : task.assessment.type === 'EXAM' ? faGraduationCap : faBookOpen} />
              <span>{task.assessment.title}</span>
            </Link>
          </>
        )}
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-bold truncate max-w-xs">{task.title}</span>
      </div>

      {/* Full-Width Header Panel */}
      <div className="glass-panel p-5 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {task.assessment ? (
                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5 border ${
                  task.assessment.type === 'LAB'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : task.assessment.type === 'EXAM'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-brand-500/20 text-brand-300 border-brand-500/30'
                }`}>
                  <FontAwesomeIcon icon={task.assessment.type === 'LAB' ? faFlask : task.assessment.type === 'EXAM' ? faGraduationCap : faBookOpen} />
                  <span>{task.assessment.type}: {task.assessment.title}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <FontAwesomeIcon icon={faTasks} />
                  <span>{task.taskType}</span>
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                {task.course.code}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <FontAwesomeIcon icon={faCode} />
                <span>{task.language}</span>
              </span>
              {task.isPublished ? (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Published</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <FontAwesomeIcon icon={faTimesCircle} />
                  <span>Draft</span>
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight truncate">{task.title}</h1>
            
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-500" />
                <span>Due Date: <strong className="text-slate-200">{new Date(task.deadline).toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center space-x-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="text-slate-500" />
                <span>Max Points: <strong className="text-brand-400">{task.maxPoints} pts</strong></span>
              </div>
              <div className="flex items-center space-x-1.5">
                <FontAwesomeIcon icon={faVial} className="text-slate-500" />
                <span>Evaluation Suite: <strong className="text-emerald-400">{task.testCases.length} Test Cases</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link 
              href={`/teacher/tasks/${task.id}/edit`}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-brand-600/20"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span>Edit Task</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sibling Tasks / Problem Set Switcher (When parent Lab / Assessment contains multiple tasks) */}
      {siblingTasks.length > 1 && (
        <div className="glass-panel p-3.5 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon
              icon={task.assessment?.type === 'LAB' ? faFlask : task.assessment?.type === 'EXAM' ? faGraduationCap : faBookOpen}
              className={task.assessment?.type === 'LAB' ? 'text-emerald-400' : task.assessment?.type === 'EXAM' ? 'text-rose-400' : 'text-brand-400'}
            />
            <span className="text-xs font-extrabold text-white">
              {task.assessment?.title} Problem Set ({siblingTasks.length} Problems):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {siblingTasks.map((st, idx) => {
              const isCurrent = st.id === task.id;
              return (
                <Link
                  key={st.id}
                  href={`/teacher/tasks/${st.id}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                    isCurrent
                      ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isCurrent ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-[150px]">{st.title}</span>
                  <span className="text-[10px] opacity-75">({st.maxPoints} pts)</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs (Ordered: Overview & Instructions -> IDE & Testing Lab) */}
      <div className="flex items-center space-x-2 border-b border-slate-800 overflow-x-auto pb-0.5">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-brand-500 text-brand-400 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FontAwesomeIcon icon={faBookOpen} />
          <span>Overview & Instructions</span>
        </button>

        <button 
          onClick={() => setActiveTab('ide')}
          className={`px-5 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'ide'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-400/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FontAwesomeIcon icon={faCode} />
          <span>IDE & Testing Lab</span>
        </button>
      </div>

      {/* Tab 1: Overview & Instructions (With Online Judge / Codeforces style Test Cases) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Statement Card */}
            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <FontAwesomeIcon icon={faBookOpen} className="text-brand-400" />
                <span>Problem Statement & Specifications</span>
              </h3>
              <div className="prose prose-invert prose-slate max-w-none">
                {task.description ? (
                  <div className="whitespace-pre-wrap text-slate-200 text-xs md:text-sm leading-relaxed bg-slate-950/70 p-5 rounded-xl border border-slate-800/80 font-sans">
                    {task.description}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs">No description provided for this task.</p>
                )}
              </div>
            </div>

            {/* Template Code Preview (if any) */}
            {task.templateCode && (
              <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <FontAwesomeIcon icon={faCode} className="text-emerald-400" />
                    <span>Starter / Template Code Preview</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('ide')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <span>Open in IDE</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                  </button>
                </div>
                <pre className="bg-[#0e131f] rounded-xl p-4 text-xs font-mono text-slate-200 border border-slate-800 overflow-x-auto max-h-72">
                  {task.templateCode}
                </pre>
              </div>
            )}

            {/* Codeforces / OJ Style Embedded Examples & Test Cases */}
            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <FontAwesomeIcon icon={faTerminal} className="text-emerald-400 text-sm" />
                  <h3 className="text-sm font-extrabold text-white">
                    Examples & Test Cases ({task.testCases.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Total Points: <strong className="text-brand-400">{task.testCases.reduce((acc, tc) => acc + tc.points, 0)}</strong> / {task.maxPoints} pts
                </span>
              </div>

              {task.testCases.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-slate-400 space-y-2">
                  <FontAwesomeIcon icon={faVial} className="text-3xl text-slate-600" />
                  <p className="text-xs font-bold text-slate-300">No sample test cases provided for this task.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {task.testCases.map((tc, index) => {
                    const inputKey = `input_${tc.id || index}`;
                    const outputKey = `output_${tc.id || index}`;

                    return (
                      <div
                        key={tc.id || index}
                        className="rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden shadow-lg"
                      >
                        {/* Example Header */}
                        <div className="bg-[#111622] px-4 py-2.5 border-b border-slate-800/90 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="w-5 h-5 rounded-md bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center text-[11px] font-bold">
                              {index + 1}
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {tc.isHidden ? `Evaluation Case #${tc.order || index + 1}` : `Example ${index + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {tc.isHidden ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded flex items-center space-x-1">
                                <FontAwesomeIcon icon={faEyeSlash} />
                                <span>Hidden Evaluation</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded flex items-center space-x-1">
                                <FontAwesomeIcon icon={faEye} />
                                <span>Sample Test</span>
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                              {tc.points} pts
                            </span>
                          </div>
                        </div>

                        {/* Codeforces / OJ Style Input & Output Blocks */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Standard Input */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              <span>Standard Input</span>
                              {tc.inputData && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(tc.inputData, inputKey)}
                                  className="text-slate-500 hover:text-slate-300 flex items-center space-x-1 font-normal text-[10px] transition-colors"
                                >
                                  <FontAwesomeIcon icon={copiedKey === inputKey ? faCheck : faCopy} className={copiedKey === inputKey ? 'text-emerald-400' : ''} />
                                  <span>{copiedKey === inputKey ? 'Copied' : 'Copy'}</span>
                                </button>
                              )}
                            </div>
                            <pre className="bg-[#0b0f19] rounded-xl p-3.5 text-xs text-slate-200 font-mono overflow-x-auto border border-slate-800/80 min-h-[5.5rem] whitespace-pre-wrap select-all">
                              {tc.inputData || <span className="text-slate-600 italic">No input</span>}
                            </pre>
                          </div>

                          {/* Standard Output */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              <span>Standard Output</span>
                              {tc.expectedOutput && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(tc.expectedOutput, outputKey)}
                                  className="text-slate-500 hover:text-slate-300 flex items-center space-x-1 font-normal text-[10px] transition-colors"
                                >
                                  <FontAwesomeIcon icon={faCopy} className={copiedKey === outputKey ? 'text-emerald-400' : ''} />
                                  <span>{copiedKey === outputKey ? 'Copied' : 'Copy'}</span>
                                </button>
                              )}
                            </div>
                            <pre className="bg-[#0b0f19] rounded-xl p-3.5 text-xs text-emerald-400 font-mono overflow-x-auto border border-slate-800/80 min-h-[5.5rem] whitespace-pre-wrap select-all">
                              {tc.expectedOutput || <span className="text-slate-600 italic">Empty output</span>}
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column (1/3 width) */}
          <div className="space-y-6">
            {/* Task Configuration Card */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                <FontAwesomeIcon icon={faTasks} className="text-brand-400" />
                <span>Task Configurations & Rules</span>
              </h3>
              
              <ul className="space-y-3 text-xs">
                <li className="flex items-center justify-between">
                  <span className="text-slate-400">Exam Mode</span>
                  {task.isExam ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1.5"><FontAwesomeIcon icon={faCheckCircle} /><span>Enabled</span></span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faTimesCircle} /><span>Disabled</span></span>
                  )}
                </li>
                
                {task.isExam && task.examDurationMin && (
                  <li className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                    <span className="text-slate-400">Exam Duration</span>
                    <span className="text-white font-bold flex items-center space-x-1.5"><FontAwesomeIcon icon={faClock} className="text-brand-400" /><span>{task.examDurationMin} mins</span></span>
                  </li>
                )}

                <li className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">Monaco Autocomplete</span>
                  {task.allowAutocomplete ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1.5"><FontAwesomeIcon icon={faCheckCircle} /><span>Allowed</span></span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faTimesCircle} /><span>Blocked</span></span>
                  )}
                </li>

                <li className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">Multi-file Project</span>
                  {task.allowMultiFile ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1.5"><FontAwesomeIcon icon={faCheckCircle} /><span>Yes</span></span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faTimesCircle} /><span>No (Single file)</span></span>
                  )}
                </li>

                <li className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                  <span className="text-slate-400">Evaluation Points</span>
                  <span className="text-brand-400 font-bold">{task.maxPoints} pts max</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full-Width IDE */}
      {activeTab === 'ide' && (
        <div className="h-[calc(100vh-210px)] min-h-[680px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <TeacherTaskIDE task={task} />
        </div>
      )}
    </div>
  );
}
