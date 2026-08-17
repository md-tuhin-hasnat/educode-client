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
  faTasks,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faBookOpen,
  faFileImport,
  faFileExport,
  faScaleBalanced,
  faClock,
  faMicrochip,
  faFilter,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';
import TeacherTaskEngineeringIDE, { TestCaseItem, TestCaseCategory } from '@/components/TeacherTaskEngineeringIDE';
import { WordMarkdownEditor } from '@/components/stream/WordMarkdownEditor';
import {
  CheckerConfig,
  DEFAULT_CHECKER_CONFIG,
  serializeTaskWorkbenchMetadata,
  parseTaskWorkbenchMetadata,
  stripTaskWorkbenchMetadata,
} from '@/utils/testCaseChecker';

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
  const [taskType, setTaskType] = useState<'assignment' | 'lab' | 'exam'>('assignment');
  const [language, setLanguage] = useState<'c' | 'cpp' | 'java' | 'python'>('cpp');
  const [maxPoints, setMaxPoints] = useState(100);
  const [timeLimitMs, setTimeLimitMs] = useState<number>(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState<number>(256);
  const [allowAutocomplete, setAllowAutocomplete] = useState(true);
  const [allowMultiFile, setAllowMultiFile] = useState(false);
  const [testCases, setTestCases] = useState<TestCaseItem[]>([]);

  // Multi-Role IDE states
  const [solutionCode, setSolutionCode] = useState('');
  const [generatorCode, setGeneratorCode] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [checkerConfig, setCheckerConfig] = useState<CheckerConfig>(DEFAULT_CHECKER_CONFIG);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

        // Parse workbench metadata (solutionCode, generatorCode, templateCode, checkerConfig, limits)
        const workbenchMeta = parseTaskWorkbenchMetadata(task.description);
        setCheckerConfig(workbenchMeta.checkerConfig || DEFAULT_CHECKER_CONFIG);
        setSolutionCode(workbenchMeta.solutionCode || '');
        setGeneratorCode(workbenchMeta.generatorCode || '');
        setTemplateCode(task.templateCode || workbenchMeta.templateCode || '');
        setDescription(stripTaskWorkbenchMetadata(task.description));
        setTimeLimitMs(task.timeLimitMs || workbenchMeta.timeLimitMs || 1000);
        setMemoryLimitMb(task.memoryLimitMb || workbenchMeta.memoryLimitMb || 256);

        setTaskType((task.taskType?.toLowerCase() as any) || 'assignment');
        setLanguage((task.language?.toLowerCase() as any) || 'cpp');
        setMaxPoints(task.maxPoints || 100);

        setAllowAutocomplete(task.allowAutocomplete ?? true);
        setAllowMultiFile(task.allowMultiFile ?? false);
        
        if (Array.isArray(task.testCases)) {
          setTestCases(
            task.testCases.map((tc: any, idx: number) => {
              const cat: TestCaseCategory =
                tc.testType ||
                (workbenchMeta.testTypes?.[tc.id] as TestCaseCategory) ||
                (workbenchMeta.testTypes?.[idx] as TestCaseCategory) ||
                (tc.isHidden ? 'PRETEST' : 'SAMPLE');
              return {
                id: tc.id,
                inputData: tc.inputData || '',
                expectedOutput: tc.expectedOutput || '',
                points: tc.points || 10,
                isHidden: cat !== 'SAMPLE',
                testType: cat,
                order: tc.order ?? idx,
              };
            })
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
                points: tc.points || 10,
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

    setIsSaving(true);
    try {
      const testTypesMap: Record<number, string> = {};
      testCases.forEach((tc, idx) => {
        const cat = tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE');
        testTypesMap[idx] = cat;
        if (tc.id) testTypesMap[Number(tc.id)] = cat;
      });

      const finalDescription = serializeTaskWorkbenchMetadata(description.trim(), {
        solutionCode,
        generatorCode,
        templateCode,
        checkerConfig,
        timeLimitMs,
        memoryLimitMb,
        testTypes: testTypesMap,
      });

      const payload: any = {
        title: title.trim(),
        description: finalDescription || null,
        templateCode: templateCode || null,
        taskType,
        language,
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
      payload.assessmentId = assessmentId ? assessmentId : null;

      await api.patch(`/tasks/${id}`, payload);
      alert('Task updated successfully!');
      router.push(`/teacher/tasks/${id}`);
    } catch (err: unknown) {
      console.error('Failed to update task:', err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update task.';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-brand-500" />
        <p className="text-sm text-slate-400">Loading task engineering environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <FontAwesomeIcon icon={faTimesCircle} className="text-4xl text-rose-500" />
        <p className="text-base text-slate-200 font-bold">{error}</p>
        <Link href="/teacher/tasks" className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-xs">
          Return to Task Bank
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-3 md:px-6 pb-16 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <Link href="/teacher/tasks" className="hover:text-white transition-colors flex items-center space-x-1.5 font-medium">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Tasks</span>
        </Link>
        <span className="text-slate-600">/</span>
        <Link href={`/teacher/tasks/${id}`} className="hover:text-white transition-colors">
          Task #{id}
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-200 font-bold">Edit Task</span>
      </div>

      {/* Header Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1">
              <FontAwesomeIcon icon={faTasks} />
              <span>Editing Task #{id}</span>
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
            {title || 'Edit Problem Task'}
          </h1>
          <p className="text-xs text-slate-400">
            Modify instructions, tune reference solutions, configure Polygon precision checkers, generate test cases, and update student template skeletons.
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
            <span>Import</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2.5 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 text-xs font-bold rounded-xl flex items-center space-x-2 border border-brand-500/30 transition-colors"
          >
            <FontAwesomeIcon icon={faFileExport} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Edit Form */}
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
                disabled={isSaving}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs md:text-sm font-bold shadow-xl shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <FontAwesomeIcon icon={isSaving ? faSpinner : faSave} className={isSaving ? 'animate-spin' : ''} />
                <span>{isSaving ? 'Saving Changes...' : 'Save & Update Task'}</span>
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
      </form>
    </div>
  );
}
