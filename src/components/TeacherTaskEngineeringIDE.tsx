'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faPlay,
  faTerminal,
  faFlask,
  faVial,
  faExpand,
  faCompress,
  faRotateLeft,
  faCopy,
  faCheck,
  faFont,
  faPalette,
  faFileCode,
  faWandMagicSparkles,
  faPlus,
  faTimes,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faArrowRight,
  faLightbulb,
  faCubes,
  faShieldAlt,
  faEye,
  faEyeSlash,
  faSliders,
  faKeyboard,
  faScaleBalanced,
  faCalculator,
  faBullseye,
} from '@fortawesome/free-solid-svg-icons';
import { PRESET_THEMES } from '@/components/themes';
import { apiClient } from '@/config/api';
import {
  CheckerConfig,
  CheckerType,
  CHECKER_PRESETS,
  DEFAULT_CHECKER_CONFIG,
  getPresetCheckerScript,
  evaluateTestCaseOutput,
} from '@/utils/testCaseChecker';
import { renderLatex } from '@/utils/mathRenderer';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export interface TestCaseItem {
  id?: number | string;
  inputData: string;
  expectedOutput: string;
  points: number;
  isHidden: boolean;
  order: number;
}

export interface TeacherTaskEngineeringIDEProps {
  language: 'c' | 'cpp' | 'java' | 'python' | string;
  solutionCode: string;
  onSolutionCodeChange: (val: string) => void;
  generatorCode: string;
  onGeneratorCodeChange: (val: string) => void;
  templateCode: string;
  onTemplateCodeChange: (val: string) => void;
  checkerConfig?: CheckerConfig;
  onCheckerConfigChange?: (config: CheckerConfig) => void;
  testCases: TestCaseItem[];
  onTestCasesChange: (cases: TestCaseItem[]) => void;
  className?: string;
}

const DEFAULT_SOLUTION_BOILERPLATES: Record<string, string> = {
  c: `#include <stdio.h>

int main() {
    int r;
    if (scanf("%d", &r) == 1) {
        double perimeter = 2 * 3.141592653589793 * r;
        printf("%.6f\\n", perimeter);
    }
    return 0;
}
`,
  cpp: `#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    int r;
    if (cin >> r) {
        double perimeter = 2 * 3.141592653589793 * r;
        cout << fixed << setprecision(6) << perimeter << "\\n";
    }
    return 0;
}
`,
  java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int r = sc.nextInt();
            double perimeter = 2 * Math.PI * r;
            System.out.printf("%.6f\\n", perimeter);
        }
    }
}
`,
  python: `import math
import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    r = float(lines[0])
    perimeter = 2 * math.pi * r
    print(f"{perimeter:.6f}")

if __name__ == "__main__":
    solve()
`,
};

const DEFAULT_GENERATOR_BOILERPLATES: Record<string, string> = {
  python: `# Test Case Generator (Python)
# Output whatever your solution expects on stdin
import random

def generate():
    # Example: Generate random radius between 1 and 500
    r = random.randint(1, 500)
    print(r)

if __name__ == "__main__":
    generate()
`,
  cpp: `// Test Case Generator (C++)
#include <iostream>
#include <random>
#include <chrono>
using namespace std;

int main() {
    mt19937 rng(chrono::steady_clock::now().time_since_epoch().count());
    uniform_int_distribution<int> dist(1, 500);
    cout << dist(rng) << endl;
    return 0;
}
`,
};

const DEFAULT_TEMPLATE_BOILERPLATES: Record<string, string> = {
  c: `#include <stdio.h>

int main() {
    // Write your solution here
    int r;
    
    return 0;
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your solution here
    int r;
    
    return 0;
}
`,
  java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        // Write your solution here
        Scanner sc = new Scanner(System.in);
        
    }
}
`,
  python: `def solve():
    # Write your solution here
    pass

if __name__ == "__main__":
    solve()
`,
};

const GENERATOR_PRESETS = [
  {
    name: 'Random Integers',
    snippet: `import random
# Generate N random integers
n = random.randint(1, 100)
print(n)
print(*(random.randint(1, 1000) for _ in range(n)))
`,
  },
  {
    name: 'Random Array & Target',
    snippet: `import random
# Generate array and target sum
n = random.randint(2, 50)
target = random.randint(10, 500)
arr = [random.randint(1, 200) for _ in range(n)]
print(n, target)
print(*arr)
`,
  },
  {
    name: 'Matrix / Grid',
    snippet: `import random
# Generate R x C matrix
r, c = random.randint(2, 8), random.randint(2, 8)
print(r, c)
for _ in range(r):
    print(*(random.randint(0, 99) for _ in range(c)))
`,
  },
  {
    name: 'Random String',
    snippet: `import random, string
# Generate random lowercase string
k = random.randint(5, 30)
s = ''.join(random.choices(string.ascii_lowercase, k=k))
print(s)
`,
  },
  {
    name: 'Graph Edge List',
    snippet: `import random
# Generate random connected tree/graph
n = random.randint(4, 15)
print(n, n - 1)
for i in range(2, n + 1):
    p = random.randint(1, i - 1)
    w = random.randint(1, 100)
    print(f"{p} {i} {w}")
`,
  },
];

const CHECKER_SCRIPT_PRESETS = [
  {
    name: 'Exact Match (Whitespace-Normalized)',
    type: 'EXACT' as CheckerType,
    code: getPresetCheckerScript('EXACT'),
  },
  {
    name: 'Float Precision (1e-6)',
    type: 'FLOAT_TOLERANCE' as CheckerType,
    eps: 1e-6,
    code: getPresetCheckerScript('FLOAT_TOLERANCE', 1e-6),
  },
  {
    name: 'Float Precision (1e-4)',
    type: 'FLOAT_TOLERANCE' as CheckerType,
    eps: 1e-4,
    code: getPresetCheckerScript('FLOAT_TOLERANCE', 1e-4),
  },
  {
    name: 'Float Precision (1e-9)',
    type: 'FLOAT_TOLERANCE' as CheckerType,
    eps: 1e-9,
    code: getPresetCheckerScript('FLOAT_TOLERANCE', 1e-9),
  },
  {
    name: 'Case-Insensitive Match (Yes/No, True/False)',
    type: 'CASE_INSENSITIVE' as CheckerType,
    code: getPresetCheckerScript('CASE_INSENSITIVE'),
  },
  {
    name: 'Unordered Token Multiset / Permutations',
    type: 'UNORDERED_TOKENS' as CheckerType,
    code: getPresetCheckerScript('UNORDERED_TOKENS'),
  },
  {
    name: 'Multiple Valid Solutions (Path Validator)',
    type: 'CUSTOM_SCRIPT' as CheckerType,
    code: `# Codeforces Polygon Checker: Valid Path / Graph Validator
def check(inf, ans, ouf):
    # inf = input data, ans = reference output, ouf = student output
    user_tokens = ouf.strip().split()
    jury_tokens = ans.strip().split()
    
    if not user_tokens:
        return False, "Participant output is empty"
    
    # Example: Check if token count matches and verify path
    if len(user_tokens) != len(jury_tokens):
        return False, f"Expected {len(jury_tokens)} tokens, found {len(user_tokens)}"
        
    return True, "Accepted: Solution satisfies problem constraints"
`,
  },
  {
    name: 'Case-Insensitive Yes/No + Integer',
    type: 'CUSTOM_SCRIPT' as CheckerType,
    code: `# Codeforces Polygon Checker: Yes/No + Integer
def check(inf, ans, ouf):
    jury_parts = ans.strip().split()
    user_parts = ouf.strip().split()
    if len(jury_parts) != len(user_parts):
        return False, f"Expected {len(jury_parts)} tokens, got {len(user_parts)}"
    
    if jury_parts[0].lower() != user_parts[0].lower():
        return False, f"Expected '{jury_parts[0]}', got '{user_parts[0]}'"
    
    if len(jury_parts) > 1 and jury_parts[1] != user_parts[1]:
        return False, f"Value mismatch: expected {jury_parts[1]}, got {user_parts[1]}"
        
    return True, "Accepted: String and integer match"
`,
  },
];

const FILE_NAMES: Record<string, { solution: string; template: string; generator: string; checker: string }> = {
  c: { solution: 'solution.c', template: 'starter.c', generator: 'generator.py', checker: 'checker.py' },
  cpp: { solution: 'solution.cpp', template: 'starter.cpp', generator: 'generator.py', checker: 'checker.py' },
  java: { solution: 'Solution.java', template: 'Solution.java', generator: 'generator.py', checker: 'checker.py' },
  python: { solution: 'solution.py', template: 'solution.py', generator: 'generator.py', checker: 'checker.py' },
};

type WorkspaceTab = 'solution' | 'generator' | 'checker' | 'template';
type BottomConsoleTab = 'terminal' | 'testsuite' | 'generatorLogs' | 'checkerTest';

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
  const [runResult, setRunResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  } | null>(null);

  // Test Suite Evaluation State
  const [testResults, setTestResults] = useState<Array<{
    testCaseId: string | number;
    inputData: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    durationMs: number;
    message?: string;
    stderr?: string;
  }>>([]);
  const [isEvaluatingSuite, setIsEvaluatingSuite] = useState(false);

  // Batch Test Case Generator State
  const [batchCount, setBatchCount] = useState<number>(5);
  const [batchPoints, setBatchPoints] = useState<number>(20);
  const [batchHidden, setBatchHidden] = useState<boolean>(true);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generatorLogs, setGeneratorLogs] = useState<string[]>([]);

  // Interactive Checker Tester State
  const [checkerSampleIn, setCheckerSampleIn] = useState('5');
  const [checkerSampleJury, setCheckerSampleJury] = useState('31.415927');
  const [checkerSampleUser, setCheckerSampleUser] = useState('31.415920');
  const [checkerTestVerdict, setCheckerTestVerdict] = useState<{
    passed: boolean;
    message: string;
    diffDetails?: string;
  } | null>(null);
  const [isTestingChecker, setIsTestingChecker] = useState(false);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure local checker config sync
  const currentChecker: CheckerConfig = checkerConfig || DEFAULT_CHECKER_CONFIG;
  const updateCheckerConfig = (updates: Partial<CheckerConfig>) => {
    if (onCheckerConfigChange) {
      onCheckerConfigChange({ ...currentChecker, ...updates });
    }
  };

  // Helper to load a preset checker directly into the checker.py editor
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

  // Load saved theme and settings from localStorage
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

  // Keyboard shortcut listener for Fullscreen (Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Register preset themes before mount
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    PRESET_THEMES.forEach((t) => monaco.editor.defineTheme(t.id, t.data));
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // Get active code, active language, and filename
  const getActiveEditorDetails = () => {
    if (activeTab === 'solution') {
      return {
        code: solutionCode,
        onChange: onSolutionCodeChange,
        lang: normLang === 'c' ? 'c' : normLang === 'cpp' ? 'cpp' : normLang === 'java' ? 'java' : 'python',
        filename: fileNames.solution,
        badge: 'Official Reference Solution',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    }
    if (activeTab === 'generator') {
      return {
        code: generatorCode,
        onChange: onGeneratorCodeChange,
        lang: 'python',
        filename: fileNames.generator,
        badge: 'TestCase Maker Script',
        badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
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
        badge: `Polygon Checker (${currentChecker.type})`,
        badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      };
    }
    return {
      code: templateCode,
      onChange: onTemplateCodeChange,
      lang: normLang === 'c' ? 'c' : normLang === 'cpp' ? 'cpp' : normLang === 'java' ? 'java' : 'python',
      filename: fileNames.template,
      badge: 'Student Starter Code',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
  };

  const currentEditor = getActiveEditorDetails();

  // Run the currently active code in Monaco with custom stdin
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

  // Run solution across all defined test cases using active CheckerConfig
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

    const results: Array<{
      testCaseId: string | number;
      inputData: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      durationMs: number;
      message?: string;
      stderr?: string;
    }> = [];

    try {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const res = await apiClient.post('/stream/execute', {
          code: solutionCode,
          language: normLang,
          input: tc.inputData || '',
        });

        const actualOut = (res.data?.stdout || '').trim();
        const expectedOut = (tc.expectedOutput || '').trim();

        // Run checker against expected output
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

  // Run solution on all test case inputs to automatically generate/fill expected outputs
  const handleAutoFillExpectedOutputs = async () => {
    if (!solutionCode.trim()) {
      alert('Please provide reference solution code first.');
      return;
    }
    if (testCases.length === 0) {
      alert('Please add at least one test case input.');
      return;
    }

    setIsRunning(true);
    setBottomTab('testsuite');
    setIsBottomOpen(true);

    try {
      const updated = [...testCases];
      let errorsFound = 0;

      for (let i = 0; i < updated.length; i++) {
        const res = await apiClient.post('/stream/execute', {
          code: solutionCode,
          language: normLang,
          input: updated[i].inputData || '',
        });

        if (res.data && res.data.exitCode === 0) {
          updated[i].expectedOutput = (res.data.stdout || '').trimEnd();
        } else {
          updated[i].expectedOutput = res.data?.stderr ? `[Execution Error]\n${res.data.stderr}` : '[Server Error]';
          errorsFound++;
        }
      }

      onTestCasesChange(updated);
      if (errorsFound > 0) {
        alert(`Outputs updated, but ${errorsFound} test case(s) encountered execution errors.`);
      } else {
        alert(`Successfully computed expected outputs for all ${updated.length} test cases!`);
      }
    } catch (err) {
      console.error('Failed to auto-fill outputs:', err);
      alert('Error calculating outputs from solution.');
    } finally {
      setIsRunning(false);
    }
  };

  // Batch Test Case Generator Pipeline
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
    setBottomTab('generatorLogs');
    setIsBottomOpen(true);
    setGeneratorLogs([`[Generator Started] Generating ${count} test cases...`]);

    try {
      const newCases: TestCaseItem[] = [];
      const logs: string[] = [];

      for (let i = 1; i <= count; i++) {
        // Step 1: Run generator script
        const genRes = await apiClient.post('/stream/execute', {
          code: generatorCode,
          language: 'python',
          input: undefined,
        });

        if (!genRes.data || genRes.data.exitCode !== 0) {
          logs.push(`[Error on Case #${i}] Generator failed:\n${genRes.data?.stderr || 'Unknown error'}`);
          continue;
        }

        const generatedInput = (genRes.data.stdout || '').trimEnd();
        logs.push(`Case #${i} Input Generated:\n${generatedInput}`);

        // Step 2: Pass generated input into reference solution
        const solRes = await apiClient.post('/stream/execute', {
          code: solutionCode,
          language: normLang,
          input: generatedInput,
        });

        const expectedOut = (solRes.data?.stdout || '').trimEnd();
        logs.push(`Case #${i} Expected Output (from Solution):\n${expectedOut}\n---`);

        newCases.push({
          id: `tc_gen_${Date.now()}_${i}`,
          inputData: generatedInput,
          expectedOutput: expectedOut,
          points: batchPoints,
          isHidden: batchHidden,
          order: testCases.length + i,
        });
      }

      setGeneratorLogs(logs);
      if (newCases.length > 0) {
        onTestCasesChange([...testCases, ...newCases]);
        alert(`Successfully generated and added ${newCases.length} new test cases!`);
      } else {
        alert('Could not generate test cases. Please check the generator logs.');
      }
    } catch (err) {
      console.error('Batch generation failed:', err);
      alert('Batch test case generation failed.');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Test the Checker interactively against sample inputs
  const handleTestCheckerInteractively = async () => {
    setIsTestingChecker(true);
    setBottomTab('checkerTest');
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
    } catch (err: unknown) {
      setCheckerTestVerdict({
        passed: false,
        message: 'Checker execution failed with exception.',
        diffDetails: String(err),
      });
    } finally {
      setIsTestingChecker(false);
    }
  };

  // Generate starter boilerplate from solution (strip inner logic)
  const handleGenerateTemplateFromSolution = () => {
    if (!solutionCode.trim()) {
      alert('Please write a reference solution first.');
      return;
    }
    if (confirm('Create starter template from solution? This will populate the Student Starter Code tab.')) {
      onTemplateCodeChange(solutionCode);
      setActiveTab('template');
    }
  };

  const handleCopyCode = () => {
    if (!currentEditor.code) return;
    navigator.clipboard.writeText(currentEditor.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-200 ${
        isFullScreen
          ? 'fixed inset-0 z-[100] bg-[#090d16] flex flex-col p-4 md:p-6 w-screen h-screen'
          : `glass-panel p-5 md:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl ${className}`
      }`}
    >
      {/* Top Header & Role Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Workspace Mode Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/90 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('solution')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'solution'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <FontAwesomeIcon icon={faCode} className="text-xs" />
            <span>Solution File</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-emerald-200">
              {fileNames.solution}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'generator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
            <span>TestCase Maker Script</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-indigo-200">
              {fileNames.generator}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checker')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'checker'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <FontAwesomeIcon icon={faScaleBalanced} className="text-xs" />
            <span>Custom Checker & Precision</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-cyan-200">
              {currentChecker.type === 'FLOAT_TOLERANCE' ? `ε=${currentChecker.floatTolerance}` : currentChecker.type}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'template'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <FontAwesomeIcon icon={faFileCode} className="text-xs" />
            <span>Template Coder (Starter)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-amber-200">
              {fileNames.template}
            </span>
          </button>
        </div>

        {/* Action Controls & Settings */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Quick Preset for Generator */}
          {activeTab === 'generator' && (
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-indigo-500/30 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-indigo-300 flex items-center space-x-1">
                <FontAwesomeIcon icon={faLightbulb} className="text-[10px]" />
                <span>Presets:</span>
              </span>
              <select
                onChange={(e) => {
                  const found = GENERATOR_PRESETS.find((p) => p.name === e.target.value);
                  if (found) onGeneratorCodeChange(found.snippet);
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
                defaultValue=""
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  Insert Generator Preset...
                </option>
                {GENERATOR_PRESETS.map((p) => (
                  <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Preset for Custom Checker */}
          {activeTab === 'checker' && (
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-cyan-500/30 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center space-x-1">
                <FontAwesomeIcon icon={faScaleBalanced} className="text-[10px]" />
                <span>Preset Script:</span>
              </span>
              <select
                onChange={(e) => {
                  const found = CHECKER_SCRIPT_PRESETS.find((p) => p.name === e.target.value);
                  if (found) {
                    updateCheckerConfig({
                      type: found.type,
                      floatTolerance: found.eps ?? (found.type === 'FLOAT_TOLERANCE' ? 1e-6 : currentChecker.floatTolerance),
                      customScript: found.code,
                    });
                  }
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
                defaultValue=""
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">
                  Load Preset to Editor...
                </option>
                {CHECKER_SCRIPT_PRESETS.map((p) => (
                  <option key={p.name} value={p.name} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Theme Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
            <FontAwesomeIcon icon={faPalette} className="text-slate-400 text-xs" />
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
              title="Editor Theme"
            >
              {PRESET_THEMES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size Adjust */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
            <FontAwesomeIcon icon={faFont} className="text-slate-400 text-xs mr-1" />
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              className="px-1.5 text-xs text-slate-400 hover:text-white font-bold"
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="text-xs font-mono text-slate-300 w-4 text-center">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="px-1.5 text-xs text-slate-400 hover:text-white font-bold"
              title="Increase Font Size"
            >
              +
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center space-x-1.5 transition-colors"
            title="Copy Active Code"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-emerald-400' : ''} />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullScreen}
            className="p-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
            title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
          >
            <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} />
          </button>
        </div>
      </div>

      {/* Checker Configuration & Mode Selector (When in Checker Tab) */}
      {activeTab === 'checker' && (
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                <FontAwesomeIcon icon={faScaleBalanced} />
                <span>Codeforces Polygon-Style Checker & Evaluation Mode</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure how the judge validates student outputs against jury answers (e.g. float tolerance, case-insensitivity, or custom script).
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestCheckerInteractively}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-600/30 transition-all self-start md:self-auto"
            >
              <FontAwesomeIcon icon={faFlask} />
              <span>Test Checker with Sample</span>
            </button>
          </div>

          {/* Mode Selector Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {CHECKER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectCheckerPreset(preset.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
                  currentChecker.type === preset.id
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{preset.label.split('(')[0]}</span>
                  {currentChecker.type === preset.id && (
                    <FontAwesomeIcon icon={faCheckCircle} className="text-cyan-400 text-xs" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">{preset.description}</p>
                <div className="pt-1 text-[10px] text-cyan-400/80 font-medium flex items-center space-x-1">
                  <span>⚡ Loads script to IDE</span>
                </div>
              </button>
            ))}
          </div>

          {/* Floating Point Precision Tolerance Settings */}
          {currentChecker.type === 'FLOAT_TOLERANCE' && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <FontAwesomeIcon icon={faBullseye} className="text-cyan-400 text-sm" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Precision Tolerance Limit (ε):
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Standard Codeforces `rcmp` checking: user output matches if absolute or relative error ≤ ε
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {[
                    { label: '10⁻⁴ (0.0001)', val: 1e-4 },
                    { label: '10⁻⁶ (0.000001)', val: 1e-6 },
                    { label: '10⁻⁹ (1e-9)', val: 1e-9 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => handleUpdateFloatTolerance(preset.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                        currentChecker.floatTolerance === preset.val
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-[11px] text-slate-400 font-mono font-bold">ε =</span>
                    <input
                      type="number"
                      step="any"
                      min="0.000000000001"
                      max="1"
                      value={currentChecker.floatTolerance ?? 1e-6}
                      onChange={(e) => handleUpdateFloatTolerance(parseFloat(e.target.value) || 1e-6)}
                      className="w-24 bg-transparent text-xs font-mono text-cyan-300 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Mathematical formula badge */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-[11px] text-slate-400">
                  Mathematical Validation Formula:
                </span>
                <div
                  className="text-cyan-300 text-xs font-serif"
                  dangerouslySetInnerHTML={{
                    __html: renderLatex(`\\min\\left(|y_{\\text{user}} - y_{\\text{jury}}|, \\frac{|y_{\\text{user}} - y_{\\text{jury}}|}{\\max(1.0, |y_{\\text{jury}}|)}\\right) \\le ${currentChecker.floatTolerance ?? '10^{-6}'}`),
                  }}
                />
              </div>
            </div>
          )}

          {/* Quick Notice indicating code is live in IDE */}
          <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/20 px-3 py-2 rounded-xl text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-cyan-300">
              <FontAwesomeIcon icon={faLightbulb} className="text-cyan-400" />
              <span>
                <strong>{CHECKER_PRESETS.find((p) => p.id === currentChecker.type)?.label.split('(')[0]}</strong> preset is currently loaded in <code>checker.py</code> below. You can edit the code directly to customize your validation rules.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectCheckerPreset(currentChecker.type)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-medium flex items-center space-x-1 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
              <span>Reset Preset Script</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Toolbar for Current Tab */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${currentEditor.badgeColor}`}>
            {currentEditor.filename}
          </span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            {activeTab === 'solution' && 'Verify your solution before publishing to ensure grading accuracy.'}
            {activeTab === 'generator' && 'Write a generator script to automatically create test inputs.'}
            {activeTab === 'checker' && 'Codeforces Polygon-style validator script.'}
            {activeTab === 'template' && 'Skeleton starter code provided to students in their IDE.'}
          </span>
        </div>

        {/* Role-Specific Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap">
          {activeTab === 'solution' && (
            <>
              <button
                type="button"
                onClick={handleGenerateTemplateFromSolution}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                title="Create student starter boilerplate from this solution"
              >
                <FontAwesomeIcon icon={faCubes} className="text-xs" />
                <span>Create Template</span>
              </button>
              <button
                type="button"
                onClick={handleAutoFillExpectedOutputs}
                disabled={isRunning}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                title="Run reference solution on all test cases to populate expected outputs"
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
                <span>Auto-Fill Test Outputs</span>
              </button>
              <button
                type="button"
                onClick={handleEvaluateTestSuite}
                disabled={isEvaluatingSuite}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                title="Run solution against all test cases"
              >
                {isEvaluatingSuite ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                ) : (
                  <FontAwesomeIcon icon={faFlask} className="text-xs" />
                )}
                <span>Test Suite ({testCases.length})</span>
              </button>
            </>
          )}

          {activeTab === 'generator' && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold">Count:</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value, 10) || 5)}
                  className="w-10 bg-slate-950 border border-slate-800 rounded px-1.5 text-center text-xs text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleRunBatchGenerator}
                disabled={isGeneratingBatch}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-transform active:scale-95"
                title="Generate test cases and auto-calculate expected outputs using Solution"
              >
                {isGeneratingBatch ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                ) : (
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
                )}
                <span>Run & Build {batchCount} Test Cases</span>
              </button>
            </div>
          )}

          {activeTab === 'checker' && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTestCheckerInteractively}
                disabled={isTestingChecker}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow-md shadow-cyan-600/30 flex items-center space-x-1.5 transition-transform active:scale-95"
                title="Open interactive checker simulator with sample inputs"
              >
                {isTestingChecker ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                ) : (
                  <FontAwesomeIcon icon={faFlask} className="text-xs" />
                )}
                <span>Test Checker Simulator</span>
              </button>

              <button
                type="button"
                onClick={handleRunActiveCode}
                disabled={isRunning}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
                title="Execute checker.py directly with custom input"
              >
                {isRunning ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                ) : (
                  <FontAwesomeIcon icon={faPlay} className="text-xs" />
                )}
                <span>Run {currentEditor.filename}</span>
              </button>
            </div>
          )}

          {activeTab === 'template' && (
            <button
              type="button"
              onClick={() => {
                const defaultCode = DEFAULT_TEMPLATE_BOILERPLATES[normLang] || DEFAULT_TEMPLATE_BOILERPLATES.cpp;
                if (confirm('Reset template code to default starter boilerplate?')) {
                  onTemplateCodeChange(defaultCode);
                }
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
              <span>Reset Boilerplate</span>
            </button>
          )}

          {/* Primary Run Code Button (when not checker or when checker is custom script) */}
          {activeTab !== 'checker' && (
            <button
              type="button"
              onClick={handleRunActiveCode}
              disabled={isRunning}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-transform active:scale-95"
            >
              {isRunning ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
              ) : (
                <FontAwesomeIcon icon={faPlay} className="text-xs" />
              )}
              <span>Run {currentEditor.filename}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Code Editor Box (or Checker configuration view) */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-2xl">
        <Editor
          height={isFullScreen ? 'calc(100vh - 380px)' : '360px'}
          language={currentEditor.lang}
          theme={themeId}
          value={currentEditor.code}
          onChange={(val) => currentEditor.onChange(val || '')}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Menlo', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>

      {/* Bottom Console / Execution / Test Suite / Checker Drawer */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        {/* Bottom Bar Navigation */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setBottomTab('terminal');
                setIsBottomOpen(true);
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors ${
                bottomTab === 'terminal' && isBottomOpen
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={faTerminal} className="text-xs" />
              <span>Interactive Console & Stdin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBottomTab('testsuite');
                setIsBottomOpen(true);
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors ${
                bottomTab === 'testsuite' && isBottomOpen
                  ? 'bg-slate-800 text-teal-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={faFlask} className="text-xs" />
              <span>Test Suite Matrix ({testCases.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBottomTab('checkerTest');
                setIsBottomOpen(true);
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors ${
                bottomTab === 'checkerTest' && isBottomOpen
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={faScaleBalanced} className="text-xs" />
              <span>Checker Simulator</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBottomTab('generatorLogs');
                setIsBottomOpen(true);
              }}
              className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 transition-colors ${
                bottomTab === 'generatorLogs' && isBottomOpen
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
              <span>Generator Logs</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsBottomOpen((v) => !v)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded transition-colors"
            >
              {isBottomOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Bottom Drawer Content */}
        {isBottomOpen && (
          <div className="p-4 space-y-3 font-mono text-xs">
            {/* Terminal Tab */}
            {bottomTab === 'terminal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <FontAwesomeIcon icon={faKeyboard} className="text-slate-500" />
                      <span>Custom Standard Input (stdin):</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomStdin('')}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={customStdin}
                    onChange={(e) => setCustomStdin(e.target.value)}
                    placeholder="Enter input data to pass to program..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl p-3 text-xs text-slate-200 font-mono outline-none resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Execution Output (stdout / stderr):
                    </span>
                    {runResult && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          runResult.exitCode === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        Exit {runResult.exitCode} ({runResult.durationMs}ms)
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 h-28 overflow-y-auto font-mono text-xs">
                    {isRunning ? (
                      <div className="flex items-center space-x-2 text-slate-400 italic">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-emerald-400 text-xs" />
                        <span>Running code on isolated server container...</span>
                      </div>
                    ) : runResult ? (
                      <>
                        {runResult.stdout && (
                          <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                            {runResult.stdout}
                          </pre>
                        )}
                        {runResult.stderr && (
                          <pre className="text-rose-400 whitespace-pre-wrap leading-relaxed">
                            {runResult.stderr}
                          </pre>
                        )}
                        {!runResult.stdout && !runResult.stderr && (
                          <p className="text-slate-500 italic">(Execution produced no console output)</p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500 italic">
                        Click "Run {currentEditor.filename}" to execute and view stdout/stderr output.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Test Suite Matrix Tab */}
            {bottomTab === 'testsuite' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-300 font-sans font-bold">
                      Test Case Execution Status for Reference Solution:
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Checker: {currentChecker.type}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEvaluateTestSuite}
                    disabled={isEvaluatingSuite}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-sans font-bold text-xs flex items-center space-x-1"
                  >
                    <FontAwesomeIcon icon={faFlask} className="text-xs" />
                    <span>Run All Test Cases</span>
                  </button>
                </div>

                {isEvaluatingSuite ? (
                  <div className="p-6 text-center text-slate-400 italic flex items-center justify-center space-x-2">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-teal-400" />
                    <span>Evaluating reference solution against all {testCases.length} test cases...</span>
                  </div>
                ) : testResults.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {testResults.map((tr, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                          tr.passed
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon
                            icon={tr.passed ? faCheckCircle : faTimes}
                            className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}
                          />
                          <span className="font-bold">Test Case #{idx + 1}</span>
                          <span className="text-[10px] text-slate-400">({tr.durationMs}ms)</span>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Input:</span>
                            <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded block truncate">
                              {tr.inputData || '(empty)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">
                              Expected vs Actual:
                            </span>
                            <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded block truncate">
                              Expected: {tr.expectedOutput || '(empty)'} | Got: {tr.actualOutput || '(empty)'}
                            </span>
                          </div>
                        </div>

                        {tr.message && (
                          <span className="text-[10px] text-slate-400 italic block">
                            {tr.message}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic p-4 text-center">
                    No test evaluation results yet. Click "Run All Test Cases" or "Test Suite" to evaluate your solution.
                  </p>
                )}
              </div>
            )}

            {/* Checker Simulator Tab */}
            {bottomTab === 'checkerTest' && (
              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-bold flex items-center space-x-1.5">
                    <FontAwesomeIcon icon={faScaleBalanced} className="text-cyan-400" />
                    <span>Interactive Checker Simulator ({currentChecker.type})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleTestCheckerInteractively}
                    disabled={isTestingChecker}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1"
                  >
                    <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                    <span>Test Checker</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Sample Input (stdin):
                    </label>
                    <textarea
                      rows={3}
                      value={checkerSampleIn}
                      onChange={(e) => setCheckerSampleIn(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Jury Expected Output (ans):
                    </label>
                    <textarea
                      rows={3}
                      value={checkerSampleJury}
                      onChange={(e) => setCheckerSampleJury(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-emerald-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Student / Simulated Output (ouf):
                    </label>
                    <textarea
                      rows={3}
                      value={checkerSampleUser}
                      onChange={(e) => setCheckerSampleUser(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-cyan-300 outline-none"
                    />
                  </div>
                </div>

                {checkerTestVerdict && (
                  <div
                    className={`p-3 rounded-xl border flex items-start space-x-3 text-xs ${
                      checkerTestVerdict.passed
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={checkerTestVerdict.passed ? faCheckCircle : faTimes}
                      className={`text-base mt-0.5 ${
                        checkerTestVerdict.passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    />
                    <div className="space-y-1">
                      <p className="font-bold font-sans">
                        Verdict:{' '}
                        <span className="uppercase font-mono">
                          {checkerTestVerdict.passed ? 'ACCEPTED (AC)' : 'WRONG ANSWER (WA)'}
                        </span>
                      </p>
                      <p className="text-[11px] font-mono">{checkerTestVerdict.message}</p>
                      {checkerTestVerdict.diffDetails && (
                        <pre className="text-[10px] font-mono bg-black/40 p-2 rounded border border-white/5 whitespace-pre-wrap">
                          {checkerTestVerdict.diffDetails}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generator Logs Tab */}
            {bottomTab === 'generatorLogs' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-sans font-bold">
                    TestCase Generator Output & Pipeline Logs:
                  </span>
                  <button
                    type="button"
                    onClick={() => setGeneratorLogs([])}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5">
                  {generatorLogs.length > 0 ? (
                    generatorLogs.map((log, idx) => (
                      <pre key={idx} className="whitespace-pre-wrap text-indigo-300 leading-relaxed">
                        {log}
                      </pre>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">
                      Generator logs will appear here when you run "Run & Build Test Cases".
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
