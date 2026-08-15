'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faTrash,
  faPlus,
  faCode,
  faVial,
  faShieldAlt,
  faEye,
  faEyeSlash,
  faClock,
  faCalendarAlt,
  faTasks,
  faCheckCircle,
  faTimesCircle,
  faMagic,
  faSpinner,
  faBookOpen,
} from '@fortawesome/free-solid-svg-icons';
import api, { apiClient } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TestCaseItem {
  id?: number;
  inputData: string;
  expectedOutput: string;
  points: number;
  isHidden: boolean;
  order: number;
}

export default function TeacherTaskEditPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [assessmentId, setAssessmentId] = useState<string>('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [taskType, setTaskType] = useState<'assignment' | 'lab' | 'exam'>('assignment');
  const [language, setLanguage] = useState<'c' | 'cpp' | 'java' | 'python'>('cpp');
  const [maxPoints, setMaxPoints] = useState(100);
  const [deadline, setDeadline] = useState('');
  const [allowAutocomplete, setAllowAutocomplete] = useState(true);
  const [allowMultiFile, setAllowMultiFile] = useState(false);
  const [isExam, setIsExam] = useState(false);
  const [examDurationMin, setExamDurationMin] = useState<number | ''>(60);
  const [isPublished, setIsPublished] = useState(false);
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);

  // Reference solution generator
  const [referenceSolution, setReferenceSolution] = useState('');
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
  const [showRefGenerator, setShowRefGenerator] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        // Load task
        const taskRes = await api.get(`/tasks/${id}`);
        const task = taskRes.data;

        const effectiveCourseId = task.courseId || task.course?.id || '';
        setCourseId(effectiveCourseId);
        setAssessmentId(task.assessmentId || task.assessment?.id || '');
        setTitle(task.title || '');
        setDescription(task.description || '');
        setTemplateCode(task.templateCode || '');
        setTaskType((task.taskType?.toLowerCase() as any) || 'assignment');
        setLanguage((task.language?.toLowerCase() as any) || 'cpp');
        setMaxPoints(task.maxPoints || 100);
        
        // Format date for datetime-local input
        if (task.deadline) {
          const d = new Date(task.deadline);
          const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setDeadline(formatted);
        }

        setAllowAutocomplete(task.allowAutocomplete ?? true);
        setAllowMultiFile(task.allowMultiFile ?? false);
        setIsExam(task.isExam ?? false);
        setExamDurationMin(task.examDurationMin ?? 60);
        setIsPublished(task.isPublished ?? true);
        
        if (Array.isArray(task.testCases)) {
          setTestCases(
            task.testCases.map((tc: any, idx: number) => ({
              id: tc.id,
              inputData: tc.inputData || '',
              expectedOutput: tc.expectedOutput || '',
              points: tc.points || 10,
              isHidden: Boolean(tc.isHidden),
              order: tc.order ?? idx,
            }))
          );
        }

        // Load teacher courses
        try {
          const courseRes = await api.get('/courses');
          const list = courseRes.data?.items || courseRes.data || [];
          if (Array.isArray(list)) setCourses(list);
        } catch {
          // ignore
        }

        // Load assessments for course
        if (effectiveCourseId) {
          try {
            const assRes = await api.get(`/assessments/course/${effectiveCourseId}`);
            const assList = assRes.data?.items || assRes.data || [];
            if (Array.isArray(assList)) setAssessments(assList);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Failed to load task for editing:', err);
        setError('Could not load task details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // When courseId changes manually, refresh assessments list
  useEffect(() => {
    if (courseId) {
      api.get(`/assessments/course/${courseId}`)
        .then(res => {
          const assList = res.data?.items || res.data || [];
          if (Array.isArray(assList)) setAssessments(assList);
        })
        .catch(() => {});
    }
  }, [courseId]);

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      {
        inputData: '',
        expectedOutput: '',
        points: 10,
        isHidden: testCases.length > 0,
        order: testCases.length,
      },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, field: keyof TestCaseItem, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  // Run reference solution against all test inputs
  const handleAutoGenerateOutputs = async () => {
    if (!referenceSolution.trim()) {
      alert('Please provide a working reference solution code.');
      return;
    }
    if (testCases.length === 0) {
      alert('Please add at least one test case.');
      return;
    }

    setIsGeneratingOutputs(true);
    try {
      const updated = [...testCases];
      let errorsFound = 0;

      for (let i = 0; i < updated.length; i++) {
        const tc = updated[i];
        const res = await apiClient.post('/stream/execute', {
          code: referenceSolution,
          language,
          input: tc.inputData || '',
        });

        if (res.data && res.data.exitCode === 0) {
          updated[i].expectedOutput = (res.data.stdout || '').trimEnd();
        } else {
          updated[i].expectedOutput = res.data?.stderr ? `[Execution Error]\n${res.data.stderr}` : '[Server Error]';
          errorsFound++;
        }
      }

      setTestCases(updated);
      if (errorsFound > 0) {
        alert(`Outputs generated, but ${errorsFound} test case(s) produced runtime errors.`);
      } else {
        alert('Successfully generated standard outputs for all test cases!');
      }
    } catch (err) {
      console.error('Failed to generate outputs:', err);
      alert('An error occurred during output generation');
    } finally {
      setIsGeneratingOutputs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a task title.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        taskType,
        language,
        maxPoints: Number(maxPoints) || 100,
        deadline: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString(),
        allowAutocomplete,
        allowMultiFile,
        isExam,
        examDurationMin: isExam && examDurationMin ? Number(examDurationMin) : null,
        isPublished,
        testCases: testCases.map((tc, idx) => ({
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          points: Number(tc.points) || 10,
          isHidden: Boolean(tc.isHidden),
          order: idx,
        })),
      };

      if (courseId) {
        payload.courseId = courseId;
      }
      payload.assessmentId = assessmentId ? assessmentId : null;

      await api.patch(`/tasks/${id}`, payload);
      router.push(`/teacher/tasks/${id}`);
    } catch (err: unknown) {
      console.error('Failed to update task:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save changes.';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/tasks/${id}`);
      router.push('/teacher/tasks');
    } catch (err: unknown) {
      console.error('Failed to delete task:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete task.';
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-brand-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading task details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
        <Link href="/teacher/tasks" className="text-xs text-brand-400 font-semibold hover:underline">
          Return to Task Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link href="/teacher/tasks" className="hover:text-white transition-colors flex items-center space-x-1.5 font-medium">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Tasks</span>
        </Link>
        <span className="text-slate-600">/</span>
        <Link href={`/teacher/tasks/${id}`} className="hover:text-brand-300 transition-colors font-medium truncate max-w-xs">
          {title || 'Task Details'}
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-bold">Edit Task</span>
      </div>

      {/* Header Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold uppercase tracking-wider">
              {taskType}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold uppercase tracking-wider">
              {language}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Edit Task: <span className="text-brand-400">{title}</span>
          </h1>
          <p className="text-xs text-slate-400">
            Update problem instructions, template starter code, grading parameters, and test cases.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDeleteTask}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center space-x-2 transition-all"
          >
            <FontAwesomeIcon icon={faTrash} />
            <span>Delete Task</span>
          </button>
          <Link
            href={`/teacher/tasks/${id}`}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
          >
            View Task Workspace
          </Link>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Card */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 space-y-5 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                <FontAwesomeIcon icon={faTasks} className="text-brand-400" />
                <span>General Information</span>
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Course
                    </label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="">Select Course</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title || c.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Parent Lab / Assignment / Exam
                    </label>
                    <select
                      value={assessmentId}
                      onChange={(e) => setAssessmentId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="">None (Standalone Problem Task)</option>
                      {assessments.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          [{a.type}] {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Task Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lab 02 - Pointer Arithmetic & Dynamic Memory"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Task Type
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="lab">Lab Exercise</option>
                      <option value="exam">Exam Problem</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Programming Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="c">C (GCC 13)</option>
                      <option value="cpp">C++ (G++ 13 / C++20)</option>
                      <option value="java">Java (OpenJDK 21)</option>
                      <option value="python">Python (3.11)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Maximum Points
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxPoints}
                      onChange={(e) => setMaxPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Problem Statement Card */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <FontAwesomeIcon icon={faBookOpen} className="text-brand-400" />
                <span>Problem Statement & Instructions</span>
              </h3>
              <textarea
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write full problem description, input/output specifications, constraints, and hints..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-2xl p-4 text-xs md:text-sm text-slate-200 font-sans outline-none leading-relaxed"
              />
            </div>

            {/* Starter / Template Code */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                  <FontAwesomeIcon icon={faCode} className="text-emerald-400" />
                  <span>Starter / Template Code for Students</span>
                </h3>
                <span className="text-[11px] text-slate-400 uppercase font-mono">
                  {language} syntax
                </span>
              </div>
              <div className="h-64 rounded-2xl overflow-hidden border border-slate-800 bg-[#1e1e1e]">
                <Editor
                  height="100%"
                  language={language === 'c' ? 'c' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'python'}
                  theme="vs-dark"
                  value={templateCode}
                  onChange={(val) => setTemplateCode(val || '')}
                  options={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Column (1/3 width) */}
          <div className="space-y-6">
            {/* Rules & Security Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
                <FontAwesomeIcon icon={faShieldAlt} className="text-brand-400" />
                <span>Security & Workspace Rules</span>
              </h3>

              <div className="space-y-4">
                {/* Published Toggle */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Publish to Students</p>
                    <p className="text-[10px] text-slate-500">Make this task visible to enrolled students</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                {/* Exam Mode Toggle */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Exam Assessment Mode</p>
                    <p className="text-[10px] text-slate-500">Enforces timed lockdown & fullscreen</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isExam}
                    onChange={(e) => setIsExam(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </label>

                {isExam && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Exam Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={examDurationMin}
                      onChange={(e) => setExamDurationMin(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                )}

                {/* Autocomplete Toggle */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Monaco Autocomplete</p>
                    <p className="text-[10px] text-slate-500">Allow IntelliSense auto-suggestions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowAutocomplete}
                    onChange={(e) => setAllowAutocomplete(e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                  />
                </label>

                {/* Multi-file Project */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Multi-File Project</p>
                    <p className="text-[10px] text-slate-500">Allow custom packages & extra files</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowMultiFile}
                    onChange={(e) => setAllowMultiFile(e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Save Actions Box */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl sticky top-6">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs md:text-sm font-bold shadow-xl shadow-brand-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <FontAwesomeIcon icon={isSaving ? faSpinner : faSave} className={isSaving ? 'animate-spin' : ''} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Task Changes'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/teacher/tasks/${id}`)}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Full-Width Evaluation Test Cases Manager */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <FontAwesomeIcon icon={faVial} className="text-emerald-400" />
                  <span>Evaluation Test Cases Suite</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {testCases.length} Cases ({testCases.reduce((acc, t) => acc + (Number(t.points) || 0), 0)} pts)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Define inputs and expected outputs to evaluate student submissions automatically.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowRefGenerator(!showRefGenerator)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
              >
                <FontAwesomeIcon icon={faMagic} className="text-teal-400" />
                <span>Auto-Generate from Solution</span>
              </button>

              <button
                type="button"
                onClick={handleAddTestCase}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add Test Case</span>
              </button>
            </div>
          </div>

          {/* Reference Solution Auto-Generator Box */}
          {showRefGenerator && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center space-x-2">
                  <FontAwesomeIcon icon={faMagic} />
                  <span>Auto-Compute Standard Outputs via Reference Code</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRefGenerator(false)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Paste your working {language.toUpperCase()} reference solution below. It will execute in a secure sandbox against all standard inputs to populate expected outputs automatically.
              </p>

              <textarea
                rows={5}
                value={referenceSolution}
                onChange={(e) => setReferenceSolution(e.target.value)}
                placeholder={`// Paste your complete ${language.toUpperCase()} reference solution here...`}
                className="w-full bg-[#0e131f] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none"
              />

              <button
                type="button"
                disabled={isGeneratingOutputs || !referenceSolution.trim()}
                onClick={handleAutoGenerateOutputs}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow flex items-center space-x-2 transition-all"
              >
                <FontAwesomeIcon icon={isGeneratingOutputs ? faSpinner : faMagic} className={isGeneratingOutputs ? 'animate-spin' : ''} />
                <span>{isGeneratingOutputs ? 'Running Solution...' : 'Compute All Expected Outputs'}</span>
              </button>
            </div>
          )}

          {/* Test Case Cards */}
          {testCases.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
              <FontAwesomeIcon icon={faVial} className="text-3xl text-slate-600" />
              <p className="text-xs font-bold text-slate-300">No test cases added yet</p>
              <p className="text-[11px] text-slate-500">Click "Add Test Case" above to create an evaluation case.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {testCases.map((tc, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-white">Test Case #{index + 1}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Hidden Toggle */}
                      <button
                        type="button"
                        onClick={() => handleUpdateTestCase(index, 'isHidden', !tc.isHidden)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
                          tc.isHidden
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <FontAwesomeIcon icon={tc.isHidden ? faEyeSlash : faEye} className="text-[10px]" />
                        <span>{tc.isHidden ? 'Hidden Test' : 'Visible Sample'}</span>
                      </button>

                      {/* Points */}
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          value={tc.points}
                          onChange={(e) => handleUpdateTestCase(index, 'points', Number(e.target.value))}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-bold"
                        />
                        <span className="text-xs text-slate-500 font-semibold">pts</span>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveTestCase(index)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors text-xs"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Standard Input (stdin)
                      </label>
                      <textarea
                        rows={4}
                        value={tc.inputData}
                        onChange={(e) => handleUpdateTestCase(index, 'inputData', e.target.value)}
                        placeholder="Leave empty if no standard input is required..."
                        className="w-full bg-[#0e131f] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Expected Output (stdout) <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={tc.expectedOutput}
                        onChange={(e) => handleUpdateTestCase(index, 'expectedOutput', e.target.value)}
                        placeholder="Exact expected standard output..."
                        className="w-full bg-[#0e131f] border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
