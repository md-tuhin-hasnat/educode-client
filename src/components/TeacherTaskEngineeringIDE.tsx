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
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);

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

  const handleGenerateOutputsFromSolution = async () => {
    if (!solutionCode.trim()) {
      alert('Please write or load your Reference Solution in solution.c/cpp/py/java before generating outputs.');
      return;
    }
    if (testCases.length === 0) {
      alert('No test cases found. Please add test cases or generate a batch first.');
      return;
    }

    setIsGeneratingOutputs(true);
    setBottomTab('terminal');
    setIsBottomOpen(true);

    try {
      const updated = [...testCases];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < updated.length; i++) {
        const tc = updated[i];
        const res = await apiClient.post('/stream/execute', {
          code: solutionCode,
          language: normLang,
          input: tc.inputData || '',
          timeoutMs: timeLimitMs || 1000,
        });

        if (res.data && res.data.exitCode === 0) {
          updated[i] = {
            ...tc,
            expectedOutput: (res.data.stdout || '').trim(),
          };
          successCount++;
        } else {
          failCount++;
          console.warn(`Solution run failed on Case #${i + 1}:`, res.data?.stderr);
        }
      }

      onTestCasesChange(updated);
      if (failCount === 0) {
        alert(`Successfully generated expected outputs for all ${successCount} test cases from Reference Solution!`);
      } else {
        alert(`Generated outputs for ${successCount} cases. ${failCount} case(s) failed during execution (check reference solution syntax or inputs).`);
      }
    } catch (err) {
      console.error('Failed to generate outputs from solution:', err);
      alert('Error generating outputs from reference solution.');
    } finally {
      setIsGeneratingOutputs(false);
    }
  };

  const handleGenerateSingleOutputFromSolution = async (index: number) => {
    if (!solutionCode.trim()) {
      alert('Please provide your Reference Solution first.');
      return;
    }
    const tc = testCases[index];
    if (!tc) return;

    try {
      const res = await apiClient.post('/stream/execute', {
        code: solutionCode,
        language: normLang,
        input: tc.inputData || '',
        timeoutMs: timeLimitMs || 1000,
      });

      if (res.data && res.data.exitCode === 0) {
        const updated = [...testCases];
        updated[index] = {
          ...tc,
          expectedOutput: (res.data.stdout || '').trim(),
        };
        onTestCasesChange(updated);
      } else {
        alert(`Failed to execute solution for Case #${index + 1}: ${res.data?.stderr || 'Non-zero exit code'}`);
      }
    } catch (err) {
      console.error('Failed to generate single output:', err);
      alert('Error executing solution for this test case.');
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
      className={`flex flex-col bg-[#0d1117] text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden transition-all ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none overflow-y-auto' : ''
      } ${className}`}
    >
      {/* 1. Unified Professional Header */}
      <TaskEngineeringHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fileNames={fileNames}
        testCases={testCases}
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

      {/* 2. Contextual Sub-Toolbar (Only shown for active tabs with options) */}
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
        />
      )}

      {activeTab === 'template' && (
        <TemplateEditorTab
          language={normLang}
          onResetBoilerplate={() => onTemplateCodeChange(DEFAULT_TEMPLATE_BOILERPLATES[normLang] || '')}
        />
      )}

      {activeTab === 'testsuite' && (
        <div className="p-3 bg-[#0d1117]">
          <TestSuiteMatrixTab
            testCases={testCases}
            onTestCasesChange={onTestCasesChange}
            suiteCategoryFilter={suiteCategoryFilter}
            setSuiteCategoryFilter={setSuiteCategoryFilter}
            testResults={testResults}
            isEvaluatingSuite={isEvaluatingSuite}
            onEvaluateTestSuite={handleEvaluateTestSuite}
            onOpenBatchDrawer={() => setActiveTab('generator')}
            onGenerateOutputsFromSolution={handleGenerateOutputsFromSolution}
            isGeneratingOutputs={isGeneratingOutputs}
            onGenerateSingleOutputFromSolution={handleGenerateSingleOutputFromSolution}
          />
        </div>
      )}

      {/* 3. Monaco Code Editor & Bottom Console Dock (for code tabs) */}
      {activeTab !== 'testsuite' && (
        <div className="flex flex-col bg-[#1e1e1e]">
          {/* Monaco Editor Container */}
          <div className="h-[430px] w-full">
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

          {/* Integrated Collapsible Bottom Developer Dock */}
          <div className="border-t border-slate-800 bg-slate-950">
            {/* Dock Header Bar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-slate-800 text-xs">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => {
                    setBottomTab('terminal');
                    setIsBottomOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    bottomTab === 'terminal' && isBottomOpen
                      ? 'bg-slate-800 text-emerald-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FontAwesomeIcon icon={faTerminal} className="text-[10px]" />
                  <span>Execution Output</span>
                  {runResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        runResult.exitCode === 0 ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBottomTab('testsuite');
                    setIsBottomOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    bottomTab === 'testsuite' && isBottomOpen
                      ? 'bg-slate-800 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FontAwesomeIcon icon={faFlask} className="text-[10px]" />
                  <span>Suite Results</span>
                  {testResults.length > 0 && (
                    <span className="text-[10px] font-mono opacity-80">
                      ({testResults.filter((r) => r.passed).length}/{testResults.length})
                    </span>
                  )}
                </button>

                {activeTab === 'generator' && (
                  <button
                    type="button"
                    onClick={() => {
                      setBottomTab('batchgen');
                      setIsBottomOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      bottomTab === 'batchgen' && isBottomOpen
                        ? 'bg-slate-800 text-amber-300 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
                    <span>Generator Logs</span>
                  </button>
                )}

                {activeTab === 'checker' && (
                  <button
                    type="button"
                    onClick={() => {
                      setBottomTab('checkertest');
                      setIsBottomOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      bottomTab === 'checkertest' && isBottomOpen
                        ? 'bg-slate-800 text-cyan-300 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FontAwesomeIcon icon={faScaleBalanced} className="text-[10px]" />
                    <span>Checker Tester</span>
                  </button>
                )}
              </div>

              {/* Expand / Collapse Control */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBottomOpen(!isBottomOpen)}
                  className="px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition-colors"
                  title={isBottomOpen ? 'Collapse Dock' : 'Expand Dock'}
                >
                  <FontAwesomeIcon icon={isBottomOpen ? faChevronDown : faChevronUp} className="text-[10px]" />
                  <span className="text-[11px]">{isBottomOpen ? 'Collapse' : 'Expand'}</span>
                </button>
              </div>
            </div>

            {/* Dock Content Body */}
            {isBottomOpen && (
              <div className="p-3 bg-slate-950/90">
                {/* 1. Terminal / Execution Output Tab */}
                {bottomTab === 'terminal' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">
                          Custom Input (stdin):
                        </label>
                        <button
                          type="button"
                          onClick={handleRunActiveCode}
                          disabled={isRunning}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-sans font-bold text-[10px] flex items-center space-x-1 transition-colors disabled:opacity-50"
                        >
                          <FontAwesomeIcon icon={faPlay} className="text-[8px]" />
                          <span>{isRunning ? 'Running...' : 'Run with Input'}</span>
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={customStdin}
                        onChange={(e) => setCustomStdin(e.target.value)}
                        placeholder="Provide standard input for execution..."
                        className="w-full min-h-[96px] bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-slate-700 resize-y font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">
                          Execution Output:
                        </label>
                        {runResult && (
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                            <span className={runResult.exitCode === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              Exit {runResult.exitCode}
                            </span>
                            <span>•</span>
                            <span>{runResult.durationMs}ms</span>
                          </div>
                        )}
                      </div>
                      <div className="h-[96px] bg-slate-900 border border-slate-800 rounded-xl p-2.5 overflow-y-auto text-xs font-mono">
                        {runResult ? (
                          <div>
                            {runResult.stdout && (
                              <pre className="text-emerald-300 whitespace-pre-wrap">{runResult.stdout}</pre>
                            )}
                            {runResult.stderr && (
                              <pre className="text-rose-400 whitespace-pre-wrap">{runResult.stderr}</pre>
                            )}
                            {!runResult.stdout && !runResult.stderr && (
                              <span className="text-slate-500 italic">(Process completed with no output)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">
                            Click "Run" or "Run with Input" to execute code.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Suite Results Tab */}
                {bottomTab === 'testsuite' && (
                  <div className="space-y-2">
                    {testResults.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">
                        No test suite results yet. Click <strong>Evaluate Suite</strong> above to run all cases.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                        {testResults.map((res, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              res.passed
                                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <FontAwesomeIcon
                                icon={res.passed ? faCheckCircle : faTimes}
                                className={res.passed ? 'text-emerald-400' : 'text-rose-400'}
                              />
                              <span className="font-bold">Case #{idx + 1}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                {res.testType}
                              </span>
                              <span className="text-slate-400 font-normal truncate max-w-xs">
                                in: "{res.inputData.slice(0, 20)}"
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px]">
                              <span>{res.durationMs}ms</span>
                              <span className="font-bold">{res.passed ? 'PASSED' : res.message || 'FAILED'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Batch Generator Logs Tab */}
                {bottomTab === 'batchgen' && (
                  <div className="space-y-1 max-h-44 overflow-y-auto font-mono text-xs">
                    {generatorLogs.length === 0 ? (
                      <div className="text-slate-500 italic py-2">No generator logs yet.</div>
                    ) : (
                      generatorLogs.map((log, idx) => (
                        <div key={idx} className="text-slate-300 text-[11px]">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. Checker Tester Tab */}
                {bottomTab === 'checkertest' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 font-sans block mb-1">
                          Test Input (stdin):
                        </label>
                        <input
                          type="text"
                          value={checkerSampleIn}
                          onChange={(e) => setCheckerSampleIn(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 font-sans block mb-1">
                          Jury Answer (expected):
                        </label>
                        <input
                          type="text"
                          value={checkerSampleJury}
                          onChange={(e) => setCheckerSampleJury(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 font-sans block mb-1">
                          Student Output (actual):
                        </label>
                        <input
                          type="text"
                          value={checkerSampleUser}
                          onChange={(e) => setCheckerSampleUser(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleTestCheckerInteractively}
                        disabled={isTestingChecker}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 disabled:opacity-50 font-sans"
                      >
                        <FontAwesomeIcon icon={faScaleBalanced} className="text-[10px]" />
                        <span>{isTestingChecker ? 'Evaluating...' : 'Evaluate Output Verdict'}</span>
                      </button>

                      {checkerTestVerdict && (
                        <div
                          className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center space-x-2 ${
                            checkerTestVerdict.passed
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={checkerTestVerdict.passed ? faCheckCircle : faTimes} />
                          <span>{checkerTestVerdict.passed ? 'ACCEPTED (AC)' : 'WRONG ANSWER (WA)'}</span>
                          <span className="font-normal opacity-75">({checkerTestVerdict.message})</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

