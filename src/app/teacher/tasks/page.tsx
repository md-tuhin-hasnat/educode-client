'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faCode,
  faCalendarAlt,
  faCheckCircle,
  faTimesCircle,
  faTasks,
  faUserGraduate,
  faChevronDown,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';

interface Task {
  id: string;
  title: string;
  description: string | null;
  language: 'c' | 'cpp' | 'java' | 'python';
  maxPoints: number;
  deadline: string;
  isPublished: boolean;
  createdAt: string;
  course: {
    id: string;
    code: string;
    title: string;
  };
  _count?: {
    submissions: number;
  };
}

export default function TeacherTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/tasks');
        setTasks(res.data);
      } catch (err: any) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  // Extract unique courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => {
      if (t.course?.id) {
        map.set(t.course.id, `${t.course.code} - ${t.course.title}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.course?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.course?.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse = selectedCourse === 'all' || task.course?.id === selectedCourse;
      const matchesLanguage = selectedLanguage === 'all' || task.language === selectedLanguage;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'published' && task.isPublished) ||
        (selectedStatus === 'draft' && !task.isPublished);

      return matchesSearch && matchesCourse && matchesLanguage && matchesStatus;
    });
  }, [tasks, searchQuery, selectedCourse, selectedLanguage, selectedStatus]);

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'java':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'cpp':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'c':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400">
            <FontAwesomeIcon icon={faTasks} />
            <span>Problem Repository & Task Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Problem Tasks</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, test, and manage programming tasks and problem suites.
          </p>
        </div>

        <Link
          href="/teacher/tasks/new"
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-brand-600/30 shrink-0"
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Create Task</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <FontAwesomeIcon icon={faSearch} className="text-xs" />
          </div>
          <input
            type="text"
            placeholder="Search tasks by title or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-brand-500 placeholder-slate-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Course Filter */}
          <div className="relative">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="appearance-none bg-slate-900/80 border border-slate-700 text-white text-xs rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-500 transition-all cursor-pointer min-w-[160px]"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </div>
          </div>

          {/* Language Filter */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="appearance-none bg-slate-900/80 border border-slate-700 text-white text-xs rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-500 transition-all cursor-pointer min-w-[140px]"
            >
              <option value="all">All Languages</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none bg-slate-900/80 border border-slate-700 text-white text-xs rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-brand-500 transition-all cursor-pointer min-w-[130px]"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="glass-panel p-8 rounded-2xl border border-red-900/30 bg-red-900/10 text-center space-y-3">
            <FontAwesomeIcon icon={faTimesCircle} className="text-3xl text-red-400" />
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <FontAwesomeIcon icon={faClipboardList} className="text-4xl text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No tasks match your filters</p>
            <p className="text-xs">Adjust your filters or create a new task.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTasks.map((task) => (
              <Link 
                href={`/teacher/tasks/${task.id}`} 
                key={task.id}
                className="group glass-panel p-5 rounded-2xl border border-slate-800 hover:border-brand-500/50 transition-all flex flex-col justify-between h-full bg-gradient-to-br from-slate-900/50 to-slate-800/20 hover:from-slate-800/80 hover:to-slate-700/30 relative overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-brand-500/20 transition-all"></div>
                
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center space-x-1.5 ${getLanguageColor(task.language)}`}>
                        <FontAwesomeIcon icon={faCode} />
                        <span>{task.language}</span>
                      </span>
                    </div>
                    {task.isPublished ? (
                      <span className="text-emerald-400 flex items-center space-x-1 text-xs font-medium" title="Published">
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center space-x-1 text-xs font-medium" title="Draft">
                        <FontAwesomeIcon icon={faTimesCircle} />
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1 mb-1">
                    {task.title}
                  </h3>
                  
                  <div className="text-xs font-mono text-brand-400/80 mb-3">
                    {task.course?.code} - {task.course?.title}
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/60 mt-auto">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center space-x-2 text-slate-300">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-500" />
                      <span className="truncate" title={new Date(task.deadline).toLocaleString()}>
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300 justify-end">
                      <FontAwesomeIcon icon={faUserGraduate} className="text-slate-500" />
                      <span>{task._count?.submissions || 0} Submissions</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400">Max Points: <span className="text-brand-400 font-bold">{task.maxPoints} pts</span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
