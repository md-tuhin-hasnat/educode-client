'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPlus,
  faCode,
  faVial,
  faShieldAlt,
  faEye,
  faEyeSlash,
  faTasks,
  faCheckCircle,
  faTrash,
  faWandMagicSparkles,
  faSpinner,
  faBookOpen,
  faFileImport,
  faFileExport,
  faFlask,
  faFloppyDisk,
  faScaleBalanced,
  faClock,
  faMicrochip,
  faFilter,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';
import TeacherTaskEngineeringIDE, { TestCaseItem, TestCaseCategory } from '@/components/TeacherTaskEngineeringIDE';
import { WordMarkdownEditor } from '@/components/stream/WordMarkdownEditor';
import {
  CheckerConfig,
  DEFAULT_CHECKER_CONFIG,
  serializeTaskWorkbenchMetadata,
  parseTaskWorkbenchMetadata,
  stripTaskWorkbenchMetadata,
} from '@/utils/testCaseChecker';

export default function TeacherTaskNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);

  // Form states
  const [courseId, setCourseId] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'c' | 'cpp' | 'java' | 'python'>('cpp');
  const [maxPoints, setMaxPoints] = useState(100);
  const [timeLimitMs, setTimeLimitMs] = useState<number>(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [allowAutocomplete, setAllowAutocomplete] = useState(true);
  const [allowMultiFile, setAllowMultiFile] = useState(false);

  // Multi-Role IDE states
  const [solutionCode, setSolutionCode] = useState('');
  const [generatorCode, setGeneratorCode] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [checkerConfig, setCheckerConfig] = useState<CheckerConfig>(DEFAULT_CHECKER_CONFIG);

  // Test cases state
  const [testCases, setTestCases] = useState<TestCaseItem[]>([
    {
      id: 1,
      inputData: '5',
      expectedOutput: '31.415927',
      points: 25,
      isHidden: false,
      testType: 'SAMPLE',
      order: 0,
    },
    {
      id: 2,
      inputData: '10',
      expectedOutput: '62.831853',
      points: 25,
      isHidden: true,
      testType: 'PRETEST',
      order: 1,
    },
  ]);
  const [testFilter, setTestFilter] = useState<'ALL' | 'SAMPLE' | 'PRETEST' | 'SYSTEM'>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load teacher courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await api.get('/courses');
        const list = res.data?.items || res.data || [];
        if (Array.isArray(list)) {
          setCourses(list);
          const qCourse = searchParams.get('courseId');
          if (qCourse && list.some((c: any) => c.id === qCourse)) {
            setCourseId(qCourse);
          } else if (list.length > 0) {
            setCourseId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load courses', err);
      }
    }
    loadCourses();
  }, [searchParams]);

  // Query assessment pre-selection
  useEffect(() => {
    const qAssessment = searchParams.get('assessmentId');
    if (qAssessment) {
      setAssessmentId(qAssessment);
    }
  }, [searchParams]);

  // Refresh assessments whenever selected courseId changes
  useEffect(() => {
    if (courseId) {
      api.get(`/assessments/course/${courseId}`)
        .then((res) => {
          const list = res.data?.items || res.data || [];
          if (Array.isArray(list)) {
            setAssessments(list);
          }
        })
        .catch((err) => console.error('Failed to load assessments', err));
    } else {
      setAssessments([]);
    }
  }, [courseId]);

  const handleAddTestCase = (defaultCategory: TestCaseCategory = 'PRETEST') => {
    setTestCases([
      ...testCases,
      {
        id: Date.now(),
        inputData: '',
        expectedOutput: '',
        points: 25,
        isHidden: defaultCategory !== 'SAMPLE',
        testType: defaultCategory,
        order: testCases.length,
      },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCase = (index: number, field: keyof TestCaseItem, value: any) => {
    const updated = [...testCases];
    if (field === 'testType') {
      const cat = value as TestCaseCategory;
      updated[index] = {
        ...updated[index],
        testType: cat,
        isHidden: cat !== 'SAMPLE',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTestCases(updated);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const pkg = JSON.parse(event.target?.result as string);
        if (pkg.title) setTitle(pkg.title);
        if (pkg.description) setDescription(stripTaskWorkbenchMetadata(pkg.description));
        if (pkg.language) setLanguage(pkg.language.toLowerCase());
        if (pkg.solutionCode) setSolutionCode(pkg.solutionCode);
        if (pkg.generatorCode) setGeneratorCode(pkg.generatorCode);
        if (pkg.templateCode) setTemplateCode(pkg.templateCode);
        if (pkg.checkerConfig) setCheckerConfig(pkg.checkerConfig);
        if (pkg.timeLimitMs) setTimeLimitMs(Number(pkg.timeLimitMs) || 1000);
        if (pkg.memoryLimitMb) setMemoryLimitMb(Number(pkg.memoryLimitMb) || 256);
        if (pkg.maxPoints) setMaxPoints(pkg.maxPoints);
        if (pkg.testCases && Array.isArray(pkg.testCases)) {
          setTestCases(
            pkg.testCases.map((tc: any, idx: number) => {
              const cat: TestCaseCategory = tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE');
              return {
                id: tc.id || idx + 1,
                inputData: tc.inputData || '',
                expectedOutput: tc.expectedOutput || '',
                points: tc.points || 25,
                isHidden: cat !== 'SAMPLE',
                testType: cat,
                order: idx,
              };
            })
          );
        }
        alert('Task package imported successfully!');
      } catch (err) {
        alert('Invalid JSON task package file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const pkg = {
      title,
      description,
      language,
      timeLimitMs,
      memoryLimitMb,
      solutionCode,
      generatorCode,
      templateCode,
      checkerConfig,
      maxPoints,
      allowAutocomplete,
      allowMultiFile,
      testCases: testCases.map((tc, idx) => ({
        inputData: tc.inputData,
        expectedOutput: tc.expectedOutput,
        points: tc.points,
        isHidden: tc.testType !== 'SAMPLE',
        testType: tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE'),
        order: idx,
      })),
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'task'}_package.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a task title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalDescription = serializeTaskWorkbenchMetadata(description.trim(), {
        solutionCode,
        generatorCode,
        templateCode,
        checkerConfig,
        timeLimitMs,
        memoryLimitMb,
      });

      const payload: any = {
        title: title.trim(),
        description: finalDescription || null,
        templateCode: templateCode || null,
        language,
        taskType: 'assignment',
        maxPoints: Number(maxPoints) || 100,
        timeLimitMs: Number(timeLimitMs) || 1000,
        memoryLimitMb: Number(memoryLimitMb) || 256,
        allowAutocomplete,
        allowMultiFile,
        testCases: testCases.map((tc, idx) => ({
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          points: Number(tc.points) || 10,
          isHidden: tc.testType ? tc.testType !== 'SAMPLE' : Boolean(tc.isHidden),
          testType: tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE'),
          order: idx,
        })),
      };

      if (courseId) {
        payload.courseId = courseId;
      }
      if (assessmentId) {
        payload.assessmentId = assessmentId;
      }

      const res = await api.post('/tasks', payload);
      router.push(`/teacher/tasks/${res.data.id}`);
    } catch (err: unknown) {
      console.error('Failed to create task:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create task.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto px-3 md:px-6 pb-16 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link href="/teacher/tasks" className="hover:text-white transition-colors flex items-center space-x-1.5 font-medium">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Tasks</span>
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-bold">Create New Task</span>
      </div>

      {/* Header Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1">
              <FontAwesomeIcon icon={faTasks} />
              <span>Task Creator & Engineering Suite</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1 font-mono">
              <FontAwesomeIcon icon={faScaleBalanced} />
              <span>{checkerConfig.type === 'FLOAT_TOLERANCE' ? `ε=${checkerConfig.floatTolerance}` : checkerConfig.type}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold uppercase tracking-wider font-mono">
              {language}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Create Problem Task
          </h1>
          <p className="text-xs text-slate-400">
            Write rich problem statements, reference solutions, testcase generators, floating-point precision checkers, and student starter code.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 border border-slate-700 transition-colors"
          >
            <FontAwesomeIcon icon={faFileImport} />
            <span>Import Package</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2.5 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 text-xs font-bold rounded-xl flex items-center space-x-2 border border-brand-500/30 transition-colors"
          >
            <FontAwesomeIcon icon={faFileExport} />
            <span>Export Package</span>
          </button>
        </div>
      </div>

      {/* Main Creation Form */}
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
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Problem Task Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Circle Perimeter Calculation & Precision"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>

            {/* Problem Statement Card (Rich Post Editor with Inline & Block LaTeX Equations) */}
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                  <FontAwesomeIcon icon={faBookOpen} className="text-brand-400" />
                  <span>Problem Statement & Instructions</span>
                </h3>
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <span className="font-serif italic text-emerald-400 font-bold">f(x)</span>
                  <span>LaTeX Equations & Rich Post Format</span>
                </span>
              </div>
              <WordMarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write full problem description, specifications, constraints, hints, code blocks, and math formulas like $r$ or $$p = 2\pi r$$..."
              />
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
                {/* Private Bank Notice */}
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
                    <FontAwesomeIcon icon={faShieldAlt} />
                    <span>Private Problem Bank</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Created tasks are private to you. You can publish them to students anytime through Course Streams, Lab Modules, Exams, or Assignments.
                  </p>
                </div>

                {/* Execution Limits (Time & Memory Limit) */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                    <FontAwesomeIcon icon={faClock} />
                    <span>Execution Limits</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Time Limit
                      </label>
                      <select
                        value={timeLimitMs}
                        onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold outline-none"
                      >
                        <option value={500}>0.5s (500ms)</option>
                        <option value={1000}>1.0s (1000ms)</option>
                        <option value={2000}>2.0s (2000ms)</option>
                        <option value={3000}>3.0s (3000ms)</option>
                        <option value={5000}>5.0s (5000ms)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Memory Limit
                      </label>
                      <select
                        value={memoryLimitMb}
                        onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-bold outline-none"
                      >
                        <option value={128}>128 MB</option>
                        <option value={256}>256 MB</option>
                        <option value={512}>512 MB</option>
                        <option value={1024}>1024 MB</option>
                      </select>
                    </div>
                  </div>
                </div>

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
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs md:text-sm font-bold shadow-xl shadow-brand-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <FontAwesomeIcon icon={isSubmitting ? faSpinner : faCheckCircle} className={isSubmitting ? 'animate-spin' : ''} />
                <span>{isSubmitting ? 'Saving Task...' : 'Save Task to Bank'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/teacher/tasks')}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Role Teacher Problem Engineering Suite IDE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <FontAwesomeIcon icon={faCode} className="text-emerald-400" />
              <span>Teacher Problem Engineering IDE</span>
            </h3>
            <span className="text-xs text-slate-400">
              Solution File • TestCase Generator • Codeforces Polygon Checker • Starter Template
            </span>
          </div>

          <TeacherTaskEngineeringIDE
            language={language}
            solutionCode={solutionCode}
            onSolutionCodeChange={setSolutionCode}
            generatorCode={generatorCode}
            onGeneratorCodeChange={setGeneratorCode}
            templateCode={templateCode}
            onTemplateCodeChange={setTemplateCode}
            checkerConfig={checkerConfig}
            onCheckerConfigChange={setCheckerConfig}
            timeLimitMs={timeLimitMs}
            onTimeLimitChange={setTimeLimitMs}
            memoryLimitMb={memoryLimitMb}
            onMemoryLimitChange={setMemoryLimitMb}
            testCases={testCases}
            onTestCasesChange={setTestCases}
          />
        </div>

        {/* Full-Width Evaluation Test Cases Suite Table & Manager */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <FontAwesomeIcon icon={faVial} className="text-emerald-400" />
                  <span>Evaluation Test Cases Suite</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {testCases.length} Cases ({testCases.reduce((acc, t) => acc + (Number(t.points) || 0), 0)} pts)
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  ⏱️ {timeLimitMs / 1000}s • 💾 {memoryLimitMb} MB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configure Samples (public in statement), Pretests (hidden input, runnable by students), and System Tests (final judge only).
              </p>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              {/* Category Filter Pills */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTestFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    testFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({testCases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTestFilter('SAMPLE')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    testFilter === 'SAMPLE' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  🟢 Samples ({testCases.filter((t) => (t.testType || (!t.isHidden ? 'SAMPLE' : 'PRETEST')) === 'SAMPLE').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTestFilter('PRETEST')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    testFilter === 'PRETEST' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  🟡 Pretests ({testCases.filter((t) => (t.testType || (t.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTestFilter('SYSTEM')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    testFilter === 'SYSTEM' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-purple-400 hover:text-purple-300'
                  }`}
                >
                  🟣 System ({testCases.filter((t) => t.testType === 'SYSTEM').length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddTestCase('PRETEST')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add Test Case</span>
              </button>
            </div>
          </div>

          {/* Test Case Cards */}
          {testCases.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
              <FontAwesomeIcon icon={faVial} className="text-3xl text-slate-600" />
              <p className="text-xs font-bold text-slate-300">No test cases added yet</p>
              <p className="text-[11px] text-slate-500">
                Click "Add Test Case" above or use the "TestCase Maker Script" in the IDE to generate cases automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {testCases
                .map((tc, realIndex) => ({ tc, realIndex }))
                .filter(({ tc }) => testFilter === 'ALL' || (tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE')) === testFilter)
                .map(({ tc, realIndex }) => {
                  const currentCat: TestCaseCategory = tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE');
                  return (
                    <div
                      key={tc.id || realIndex}
                      className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                            #{realIndex + 1}
                          </span>
                          <span className="text-xs font-bold text-white">Test Case #{realIndex + 1}</span>

                          {/* 3-Way Category Selector */}
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleUpdateTestCase(realIndex, 'testType', 'SAMPLE')}
                              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                currentCat === 'SAMPLE'
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              🟢 Sample (Public)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTestCase(realIndex, 'testType', 'PRETEST')}
                              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                currentCat === 'PRETEST'
                                  ? 'bg-amber-600 text-white'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              🟡 Pretest (Runnable)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTestCase(realIndex, 'testType', 'SYSTEM')}
                              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                currentCat === 'SYSTEM'
                                  ? 'bg-purple-600 text-white'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              🟣 System Test (Judge Only)
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {/* Points */}
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              value={tc.points}
                              onChange={(e) => handleUpdateTestCase(realIndex, 'points', Number(e.target.value))}
                              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-bold"
                            />
                            <span className="text-xs text-slate-500 font-semibold">pts</span>
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(realIndex)}
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
                            rows={3}
                            value={tc.inputData}
                            onChange={(e) => handleUpdateTestCase(realIndex, 'inputData', e.target.value)}
                            placeholder="Leave empty if no standard input is required..."
                            className="w-full bg-[#0e131f] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Expected Output (stdout) <span className="text-rose-400">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={tc.expectedOutput}
                            onChange={(e) => handleUpdateTestCase(realIndex, 'expectedOutput', e.target.value)}
                            placeholder="Exact expected standard output..."
                            className="w-full bg-[#0e131f] border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
