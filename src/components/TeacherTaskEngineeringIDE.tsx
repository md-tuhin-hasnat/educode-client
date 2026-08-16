'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTerminal,
  faFlask,
  faWandMagicSparkles,
  faScaleBalanced,
  faChevronDown,
  faChevronUp,
  faSpinner,
  faCheckCircle,
  faTimes,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { PRESET_THEMES } from '@/components/themes';
import { apiClient } from '@/config/api';
import {
  CheckerConfig,
  CheckerType,
  DEFAULT_CHECKER_CONFIG,
  getPresetCheckerScript,
  evaluateTestCaseOutput,
} from '@/utils/testCaseChecker';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

import {
  TestCaseItem,
  TestCaseCategory,
  WorkspaceTab,
  BottomConsoleTab,
  TeacherTaskEngineeringIDEProps,
  RunExecutionResult,
  TestSuiteResultItem,
  CheckerVerdictResult,
} from './task-engineering/types';
import { TaskEngineeringHeader } from './task-engineering/TaskEngineeringHeader';
import { SolutionEditorTab } from './task-engineering/SolutionEditorTab';
import { GeneratorEditorTab } from './task-engineering/GeneratorEditorTab';
import { CheckerEditorTab } from './task-engineering/CheckerEditorTab';
import { TemplateEditorTab } from './task-engineering/TemplateEditorTab';
import { TestSuiteMatrixTab } from './task-engineering/TestSuiteMatrixTab';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export type { TestCaseCategory, TestCaseItem, TeacherTaskEngineeringIDEProps };

import TASK_ENGINEERING_TEMPLATES_JSON from '@/data/taskEngineeringTemplates.json';

const DEFAULT_SOLUTION_BOILERPLATES: Record<string, string> = TASK_ENGINEERING_TEMPLATES_JSON.solutions;
const DEFAULT_GENERATOR_BOILERPLATES: Record<string, string> = TASK_ENGINEERING_TEMPLATES_JSON.generators;
const DEFAULT_TEMPLATE_BOILERPLATES: Record<string, string> = TASK_ENGINEERING_TEMPLATES_JSON.templates;

const FILE_NAMES: Record<string, Record<string, string>> = {
  c: { solution: 'solution.c', template: 'starter.c', generator: 'generator.py', checker: 'checker.py' },
  cpp: { solution: 'solution.cpp', template: 'starter.cpp', generator: 'generator.py', checker: 'checker.py' },
  java: { solution: 'Solution.java', template: 'Starter.java', generator: 'generator.py', checker: 'checker.py' },
  python: { solution: 'solution.py', template: 'starter.py', generator: 'generator.py', checker: 'checker.py' },
};

export default function TeacherTaskEngineeringIDE({
  language,
  solutionCode,
  onSolutionCodeChange,
  generatorCode,
  onGeneratorCodeChange,
  templateCode,
  onTemplateCodeChange,
  checkerConfig = DEFAULT_CHECKER_CONFIG,
  onCheckerConfigChange,
  timeLimitMs = 1000,
  onTimeLimitChange,
  memoryLimitMb = 256,
  onMemoryLimitChange,
  testCases,
  onTestCasesChange,
  className = '',
}: TeacherTaskEngineeringIDEProps) {
  const normLang = (language || 'cpp').toLowerCase();
  const fileNames = FILE_NAMES[normLang] || {
    solution: `solution.${normLang}`,
    template: `starter.${normLang}`,
    generator: 'generator.py',
    checker: 'checker.py',
  };

  // Active IDE Tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('solution');

  // Fullscreen & settings
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [themeId, setThemeId] = useState<string>('educode-dark');
  const [fontSize, setFontSize] = useState<number>(13);
  const [copied, setCopied] = useState(false);

  // Bottom Console state
  const [isBottomOpen, setIsBottomOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomConsoleTab>('terminal');
  const [customStdin, setCustomStdin] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunExecutionResult | null>(null);

  // Test Suite Evaluation State
  const [testResults, setTestResults] = useState<TestSuiteResultItem[]>([]);
  const [isEvaluatingSuite, setIsEvaluatingSuite] = useState(false);
  const [suiteCategoryFilter, setSuiteCategoryFilter] = useState<'ALL' | 'SAMPLE' | 'PRETEST' | 'SYSTEM'>('ALL');

  // Batch Test Case Generator State
  const [batchCount, setBatchCount] = useState<number>(5);
  const [batchPoints, setBatchPoints] = useState<number>(20);
  const [batchCategory, setBatchCategory] = useState<TestCaseCategory>('PRETEST');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generatorLogs, setGeneratorLogs] = useState<string[]>([]);

  // Interactive Checker Tester State
  const [checkerSampleIn, setCheckerSampleIn] = useState('5');
  const [checkerSampleJury, setCheckerSampleJury] = useState('31.415927');
  const [checkerSampleUser, setCheckerSampleUser] = useState('31.415920');
  const [checkerTestVerdict, setCheckerTestVerdict] = useState<CheckerVerdictResult | null>(null);
  const [isTestingChecker, setIsTestingChecker] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentChecker: CheckerConfig = checkerConfig || DEFAULT_CHECKER_CONFIG;
  const updateCheckerConfig = (updates: Partial<CheckerConfig>) => {
    if (onCheckerConfigChange) {
      onCheckerConfigChange({ ...currentChecker, ...updates });
    }
  };

  const handleSelectCheckerPreset = (presetId: CheckerType, customEps?: number) => {
    const eps = customEps ?? (presetId === 'FLOAT_TOLERANCE' ? (currentChecker.floatTolerance ?? 1e-6) : 1e-6);
    const newScript = getPresetCheckerScript(presetId, eps);
    updateCheckerConfig({
      type: presetId,
      floatTolerance: eps,
      customScript: newScript,
    });
  };

  const handleUpdateFloatTolerance = (eps: number) => {
    const newScript = getPresetCheckerScript('FLOAT_TOLERANCE', eps);
    updateCheckerConfig({
      type: 'FLOAT_TOLERANCE',
      floatTolerance: eps,
      customScript: newScript,
    });
  };

  // Initialize boilerplates safely on mount or language switch
  const prevLangRef = useRef(normLang);

  useEffect(() => {
    const prevLang = prevLangRef.current;
    if (prevLang !== normLang) {
      prevLangRef.current = normLang;
      if (!solutionCode.trim() || solutionCode === DEFAULT_SOLUTION_BOILERPLATES[prevLang]) {
        onSolutionCodeChange(DEFAULT_SOLUTION_BOILERPLATES[normLang] || DEFAULT_SOLUTION_BOILERPLATES.cpp);
      }
      if (!templateCode.trim() || templateCode === DEFAULT_TEMPLATE_BOILERPLATES[prevLang]) {
        onTemplateCodeChange(DEFAULT_TEMPLATE_BOILERPLATES[normLang] || DEFAULT_TEMPLATE_BOILERPLATES.cpp);
      }
    } else {
      if (!solutionCode.trim()) {
        onSolutionCodeChange(DEFAULT_SOLUTION_BOILERPLATES[normLang] || DEFAULT_SOLUTION_BOILERPLATES.cpp);
      }
      if (!generatorCode.trim()) {
        onGeneratorCodeChange(DEFAULT_GENERATOR_BOILERPLATES.python);
      }
      if (!templateCode.trim()) {
        onTemplateCodeChange(DEFAULT_TEMPLATE_BOILERPLATES[normLang] || DEFAULT_TEMPLATE_BOILERPLATES.cpp);
      }
    }
  }, [normLang]);

  // Load saved theme and settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem('educode_ide_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.themeId) setThemeId(parsed.themeId);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard shortcut listener for Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    PRESET_THEMES.forEach((t) => monaco.editor.defineTheme(t.id, t.data));
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const getActiveEditorDetails = () => {
    if (activeTab === 'solution') {
      return {
        code: solutionCode,
        onChange: onSolutionCodeChange,
        lang: normLang === 'c' ? 'c' : normLang === 'cpp' ? 'cpp' : normLang === 'java' ? 'java' : 'python',
        filename: fileNames.solution,
      };
    }
    if (activeTab === 'generator') {
      return {
        code: generatorCode,
        onChange: onGeneratorCodeChange,
        lang: 'python',
        filename: fileNames.generator,
      };
    }
    if (activeTab === 'checker') {
      const activeCheckerScript =
        currentChecker.customScript ||
        getPresetCheckerScript(currentChecker.type, currentChecker.floatTolerance);

      return {
        code: activeCheckerScript,
        onChange: (val: string) => updateCheckerConfig({ customScript: val }),
        lang: 'python',
        filename: fileNames.checker,
      };
    }
    return {
      code: templateCode,
      onChange: onTemplateCodeChange,
      lang: normLang === 'c' ? 'c' : normLang === 'cpp' ? 'cpp' : normLang === 'java' ? 'java' : 'python',
      filename: fileNames.template,
    };
  };

  const currentEditor = getActiveEditorDetails();

  const handleRunActiveCode = async () => {
    setIsRunning(true);
    setBottomTab('terminal');
    setIsBottomOpen(true);
    setRunResult(null);

    try {
      const execLang = activeTab === 'generator' || activeTab === 'checker' ? 'python' : normLang;
      const res = await apiClient.post('/stream/execute', {
        code: currentEditor.code,
        language: execLang,
        input: customStdin || undefined,
      });

      setRunResult(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Execution request failed';

      setRunResult({
        stdout: '',
        stderr: `[Execution Error]\n${msg}`,
        exitCode: 1,
        durationMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleEvaluateTestSuite = async () => {
    if (!solutionCode.trim()) {
      alert('Please provide your solution code first.');
      return;
    }
    if (testCases.length === 0) {
      alert('No test cases found. Please add or generate test cases first.');
      return;
    }

    setIsEvaluatingSuite(true);
    setBottomTab('testsuite');
    setIsBottomOpen(true);

    const results: TestSuiteResultItem[] = [];

    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const category: TestCaseCategory =
          tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE');
        const res = await apiClient.post('/stream/execute', {
          code: solutionCode,
          language: normLang,
          input: tc.inputData || '',
          timeoutMs: timeLimitMs,
        });

        const actualOut = (res.data?.stdout || '').trim();
        const expectedOut = (tc.expectedOutput || '').trim();

        let passed = false;
        let message = '';
        if (res.data?.exitCode === 0) {
          const verdict = await evaluateTestCaseOutput(
            actualOut,
            expectedOut,
            tc.inputData || '',
            currentChecker
          );
          passed = verdict.passed;
          message = verdict.message;
        } else {
          message = `Runtime Exit ${res.data?.exitCode}`;
        }

        results.push({
          testCaseId: tc.id || i + 1,
          inputData: tc.inputData,
          expectedOutput: tc.expectedOutput,
          actualOutput: actualOut,
          passed,
          durationMs: res.data?.durationMs || 0,
          testType: category,
          message,
          stderr: res.data?.stderr,
        });
      }

      setTestResults(results);
    } catch (err) {
      console.error('Failed to run test suite:', err);
      alert('Error evaluating test suite.');
    } finally {
      setIsEvaluatingSuite(false);
    }
  };

  const handleRunBatchGenerator = async () => {
    if (!generatorCode.trim()) {
      alert('Please provide a test case generator script.');
      return;
    }
    if (!solutionCode.trim()) {
      alert('Please provide your reference solution so we can calculate expected outputs.');
      return;
    }

    const count = Math.min(Math.max(1, batchCount), 20);
    setIsGeneratingBatch(true);
    setBottomTab('batchgen');
    setIsBottomOpen(true);
    setGeneratorLogs([`[Generator Started] Generating ${count} ${batchCategory.toLowerCase()} cases...`]);

    try {
      const newCases: TestCaseItem[] = [];
      const logs: string[] = [];

      for (let i = 1; i <= count; i++) {
        const genRes = await apiClient.post('/stream/execute', {
          code: generatorCode,
          language: 'python',
          input: undefined,
          timeoutMs: 5000,
        });

        if (!genRes.data || genRes.data.exitCode !== 0) {
          logs.push(`❌ Case #${i} Generator failed: ${genRes.data?.stderr || 'Unknown error'}`);
          continue;
        }

        const generatedInput = (genRes.data.stdout || '').trim();

        const solRes = await apiClient.post('/stream/execute', {
          code: solutionCode,
          language: normLang,
          input: generatedInput,
          timeoutMs: timeLimitMs,
        });

        const expectedOutput = (solRes.data?.stdout || '').trim();

        newCases.push({
          id: Date.now() + i,
          inputData: generatedInput,
          expectedOutput: expectedOutput,
          points: batchPoints,
          isHidden: batchCategory !== 'SAMPLE',
          testType: batchCategory,
          order: testCases.length + i,
        });

        logs.push(`✅ Case #${i} created: in="${generatedInput.slice(0, 30)}" -> out="${expectedOutput.slice(0, 30)}"`);
      }

      onTestCasesChange([...testCases, ...newCases]);
      setGeneratorLogs((prev) => [...prev, ...logs, `🏁 Batch generation completed: ${newCases.length} cases added.`]);
    } catch (err) {
      console.error('Batch generation error:', err);
      setGeneratorLogs((prev) => [...prev, `❌ Error during batch generation: ${err}`]);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleTestCheckerInteractively = async () => {
    setIsTestingChecker(true);
    setBottomTab('checkertest');
    setIsBottomOpen(true);
    setCheckerTestVerdict(null);

    try {
      const verdict = await evaluateTestCaseOutput(
        checkerSampleUser,
        checkerSampleJury,
        checkerSampleIn,
        currentChecker
      );
      setCheckerTestVerdict(verdict);
    } catch (err) {
      console.error('Checker testing error:', err);
      setCheckerTestVerdict({
        passed: false,
        message: `Evaluation Error: ${err}`,
      });
    } finally {
      setIsTestingChecker(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentEditor.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateTemplateFromSolution = () => {
    const stripped = solutionCode
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      .replace(/\{[\s\S]*\}/, '{\n    // Write your solution here\n}');
    onTemplateCodeChange(stripped || DEFAULT_TEMPLATE_BOILERPLATES[normLang] || '');
    setActiveTab('template');
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col space-y-3 bg-[#0d1117] text-slate-100 p-4 rounded-3xl border border-slate-800 shadow-2xl transition-all ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none overflow-y-auto' : ''
      } ${className}`}
    >
      {/* Header Toolbar */}
      <TaskEngineeringHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fileNames={fileNames}
        testCases={testCases}
        timeLimitMs={timeLimitMs}
        onTimeLimitChange={onTimeLimitChange}
        memoryLimitMb={memoryLimitMb}
        onMemoryLimitChange={onMemoryLimitChange}
        themeId={themeId}
        setThemeId={setThemeId}
        fontSize={fontSize}
        setFontSize={setFontSize}
        copied={copied}
        onCopyCode={handleCopyCode}
        isFullScreen={isFullScreen}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        onRunActiveTab={handleRunActiveCode}
        onEvaluateSuite={handleEvaluateTestSuite}
        onResetActiveBoilerplate={() => {
          if (activeTab === 'solution') onSolutionCodeChange(DEFAULT_SOLUTION_BOILERPLATES[normLang] || '');
          if (activeTab === 'generator') onGeneratorCodeChange(DEFAULT_GENERATOR_BOILERPLATES.python);
          if (activeTab === 'checker') handleSelectCheckerPreset(currentChecker.type);
          if (activeTab === 'template') onTemplateCodeChange(DEFAULT_TEMPLATE_BOILERPLATES[normLang] || '');
        }}
        isRunning={isRunning}
        isEvaluatingSuite={isEvaluatingSuite}
        isGeneratingBatch={isGeneratingBatch}
      />

      {/* Tab Specific Configuration Banner */}
      {activeTab === 'checker' && (
        <CheckerEditorTab
          currentChecker={currentChecker}
          onSelectCheckerPreset={handleSelectCheckerPreset}
          onUpdateFloatTolerance={handleUpdateFloatTolerance}
          onTestCheckerInteractively={handleTestCheckerInteractively}
          onLoadScriptPreset={(script) => updateCheckerConfig({ customScript: script })}
        />
      )}

      {activeTab === 'generator' && (
        <GeneratorEditorTab
          batchCount={batchCount}
          setBatchCount={setBatchCount}
          batchPoints={batchPoints}
          setBatchPoints={setBatchPoints}
          batchCategory={batchCategory}
          setBatchCategory={setBatchCategory}
          isGeneratingBatch={isGeneratingBatch}
          onGenerateBatch={handleRunBatchGenerator}
          onRunSingleGenerator={handleRunActiveCode}
          isRunning={isRunning}
        />
      )}

      {activeTab === 'solution' && (
        <SolutionEditorTab
          language={normLang}
          onGenerateTemplateFromSolution={handleGenerateTemplateFromSolution}
          customStdin={customStdin}
          setCustomStdin={setCustomStdin}
          isRunning={isRunning}
          onRunSolution={handleRunActiveCode}
          runResult={runResult}
        />
      )}

      {activeTab === 'template' && (
        <TemplateEditorTab
          language={normLang}
          onResetBoilerplate={() => onTemplateCodeChange(DEFAULT_TEMPLATE_BOILERPLATES[normLang] || '')}
        />
      )}

      {activeTab === 'testsuite' && (
        <TestSuiteMatrixTab
          testCases={testCases}
          onTestCasesChange={onTestCasesChange}
          suiteCategoryFilter={suiteCategoryFilter}
          setSuiteCategoryFilter={setSuiteCategoryFilter}
          testResults={testResults}
          isEvaluatingSuite={isEvaluatingSuite}
          onEvaluateTestSuite={handleEvaluateTestSuite}
          onOpenBatchDrawer={() => setActiveTab('generator')}
        />
      )}

      {/* Monaco Code Editor (Shown for code tabs: solution, generator, checker, template) */}
      {activeTab !== 'testsuite' && (
        <div className="rounded-2xl border border-slate-800/90 overflow-hidden shadow-inner bg-[#1e1e1e]">
          <div className="h-8 bg-slate-900/90 px-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>{currentEditor.filename}</span>
            <span className="text-[10px] text-slate-500 uppercase">{currentEditor.lang}</span>
          </div>
          <div className="h-[420px] w-full">
            <Editor
              height="100%"
              language={currentEditor.lang}
              value={currentEditor.code}
              theme={themeId}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              onChange={(val) => currentEditor.onChange(val || '')}
              options={{
                fontSize: fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                tabSize: 4,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
