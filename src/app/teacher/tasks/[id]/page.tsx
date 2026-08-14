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
  faTrashAlt,
  faRocket,
  faTasks
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
  const [activeTab, setActiveTab] = useState<'overview' | 'testcases' | 'ide'>('overview');

  useEffect(() => {
    async function fetchTask() {
      try {
        setLoading(true);
        const res = await api.get(`/tasks/${id}`);
        setTask(res.data);
      } catch (err: any) {
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



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Loading task details...</p>
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Navigation */}
      <div className="flex items-center space-x-3 text-sm">
        <Link href="/teacher/tasks" className="text-slate-400 hover:text-white transition-colors flex items-center space-x-2">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Tasks</span>
        </Link>
      </div>

      {/* Header Panel */}
      <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
        {/* Background Decorative Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                <FontAwesomeIcon icon={faTasks} />
                <span>{task.taskType}</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold uppercase tracking-wider">
                {task.course.code}
              </span>
              {task.isPublished ? (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Published</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <FontAwesomeIcon icon={faTimesCircle} />
                  <span>Draft</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-white">{task.title}</h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400 pt-2">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faCode} className="text-slate-500" />
                <span>Language: <strong className="text-slate-200 uppercase">{task.language}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-500" />
                <span>Due: <strong className="text-slate-200">{new Date(task.deadline).toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faCheckCircle} className="text-slate-500" />
                <span>Max Points: <strong className="text-brand-400">{task.maxPoints}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3 min-w-[140px]">
            <Link 
              href={`/teacher/tasks/${task.id}/edit`}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow shadow-blue-500/20"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span>Edit Task</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${activeTab === 'overview' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
        >
          <FontAwesomeIcon icon={faBookOpen} />
          <span>Overview & Settings</span>
        </button>
        <button 
          onClick={() => setActiveTab('testcases')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${activeTab === 'testcases' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
        >
          <FontAwesomeIcon icon={faVial} />
          <span>Test Cases ({task.testCases.length})</span>
        </button>
        <button 
          onClick={() => setActiveTab('ide')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center space-x-2 ${activeTab === 'ide' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
        >
          <FontAwesomeIcon icon={faCode} />
          <span>IDE & Testing</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-4">Task Description</h3>
                <div className="prose prose-invert prose-slate max-w-none">
                  {task.description ? (
                    <div className="whitespace-pre-wrap text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      {task.description}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-sm">No description provided for this task.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-4">Configuration</h3>
                
                <ul className="space-y-3">
                  <li className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Exam Mode</span>
                    {task.isExam ? (
                      <span className="text-emerald-400 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faCheckCircle} /><span>Enabled</span></span>
                    ) : (
                      <span className="text-slate-500 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faTimesCircle} /><span>Disabled</span></span>
                    )}
                  </li>
                  
                  {task.isExam && task.examDurationMin && (
                    <li className="flex items-center justify-between text-sm pt-2 border-t border-slate-800/50">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-white font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faClock} className="text-brand-400" /><span>{task.examDurationMin} mins</span></span>
                    </li>
                  )}

                  <li className="flex items-center justify-between text-sm pt-2 border-t border-slate-800/50">
                    <span className="text-slate-400">Autocomplete</span>
                    {task.allowAutocomplete ? (
                      <span className="text-emerald-400 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faCheckCircle} /><span>Allowed</span></span>
                    ) : (
                      <span className="text-slate-500 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faTimesCircle} /><span>Blocked</span></span>
                    )}
                  </li>

                  <li className="flex items-center justify-between text-sm pt-2 border-t border-slate-800/50">
                    <span className="text-slate-400">Multi-file Project</span>
                    {task.allowMultiFile ? (
                      <span className="text-emerald-400 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faCheckCircle} /><span>Yes</span></span>
                    ) : (
                      <span className="text-slate-500 font-medium flex items-center space-x-1.5"><FontAwesomeIcon icon={faTimesCircle} /><span>No (Single file)</span></span>
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === 'testcases' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">Evaluation Test Cases</h3>
              <p className="text-xs text-slate-400">Total Points: <strong className="text-brand-400">{task.testCases.reduce((acc, tc) => acc + tc.points, 0)}</strong> / {task.maxPoints}</p>
            </div>

            {task.testCases.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl border border-slate-800 text-center text-slate-400">
                <FontAwesomeIcon icon={faVial} className="text-3xl mb-3 text-slate-600" />
                <p>No test cases defined for this task.</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-6">
                {task.testCases.map((tc, index) => (
                  <div key={tc.id} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                    <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-md bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-bold text-white">Test Case #{tc.order || index + 1}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {tc.isHidden ? (
                          <span className="text-xs text-amber-400 flex items-center space-x-1 bg-amber-400/10 px-2 py-0.5 rounded" title="Hidden from students">
                            <FontAwesomeIcon icon={faEyeSlash} />
                            <span>Hidden</span>
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center space-x-1 bg-emerald-400/10 px-2 py-0.5 rounded" title="Visible to students">
                            <FontAwesomeIcon icon={faEye} />
                            <span>Visible</span>
                          </span>
                        )}
                        <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                          {tc.points} pts
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Input</p>
                        <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800 min-h-[6rem] whitespace-pre-wrap">
                          {tc.inputData || <span className="text-slate-600 italic">No input</span>}
                        </pre>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expected Output</p>
                        <pre className="bg-slate-900 rounded-lg p-3 text-xs text-emerald-400 font-mono overflow-x-auto border border-slate-800 min-h-[6rem] whitespace-pre-wrap">
                          {tc.expectedOutput || <span className="text-slate-600 italic">Empty output</span>}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[75vh] w-full rounded-2xl overflow-hidden border border-slate-800">
            <TeacherTaskIDE task={task} />
          </div>
        )}
      </div>
    </div>
  );
}
