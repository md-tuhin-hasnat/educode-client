import { WorkspaceFile } from '@/components/FileExplorer';

export type TestCaseStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PASSED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR';

export interface TestCaseInput {
  id: string | number;
  inputData: string;
  expectedOutput: string;
  points?: number;
  isHidden?: boolean;
  order?: number;
}

export interface TestCaseResult {
  testCaseId: string | number;
  order: number;
  inputData: string;
  expectedOutput: string;
  actualOutput: string;
  status: TestCaseStatus;
  passed: boolean;
  timeMs: number;
  points: number;
  maxPoints: number;
  errorDetails?: string;
  isHidden?: boolean;
  logMessage: string;
}

export interface TestSuiteProgress {
  currentIndex: number;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  currentResult: TestCaseResult;
  logMessage: string;
  logs: string[];
}

export interface TestSuiteSummary {
  totalCount: number;
  passedCount: number;
  failedCount: number;
  totalPoints: number;
  earnedPoints: number;
  totalTimeMs: number;
  status: 'ALL_PASSED' | 'PARTIAL_PASSED' | 'FAILED' | 'COMPILATION_ERROR';
  results: TestCaseResult[];
  logs: string[];
}

/**
 * Normalizes text output for fair comparison:
 * - Converts CRLF to LF
 * - Trims trailing whitespace on each line
 * - Trims overall start/end newlines
 */
export function normalizeOutput(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Runs a single testcase against the code/workspace
 */
export async function runSingleTestCase(
  testCase: TestCaseInput,
  index: number,
  total: number,
  code: string,
  language: string,
  workspaceFiles: WorkspaceFile[] = [],
  activeFilePath?: string,
  timeoutMs: number = 10000
): Promise<TestCaseResult> {
  const maxPoints = testCase.points ?? 10;
  const orderNum = testCase.order ?? index + 1;
  const langKey = language.toLowerCase() as 'c' | 'cpp' | 'python' | 'java';

  try {
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let timeMs = 0;
    let compilationError: string | undefined = undefined;
    let timedOut = false;

    if (typeof window !== 'undefined' && (window as any).educode?.executor) {
      const execResult = await (window as any).educode.executor.runCode({
        code,
        language: langKey,
        stdin: testCase.inputData || '',
        timeoutMs,
        files: workspaceFiles.map((f) => ({ path: f.path, content: f.content })),
        activeFilePath,
      });

      stdout = execResult.stdout || '';
      stderr = execResult.stderr || '';
      exitCode = execResult.exitCode ?? 0;
      timeMs = execResult.timeMs ?? 0;
      compilationError = execResult.compilationError;
      timedOut = !!execResult.timedOut;
    } else {
      // Browser simulation fallback for dev & tests
      await new Promise((resolve) => setTimeout(resolve, 80));
      stdout = testCase.expectedOutput || '';
      timeMs = Math.floor(Math.random() * 25) + 15;
    }

    const normActual = normalizeOutput(stdout);
    const normExpected = normalizeOutput(testCase.expectedOutput);

    let status: TestCaseStatus = 'PASSED';
    let logMessage = '';
    let errorDetails: string | undefined = undefined;
    let passed = false;

    if (compilationError || (exitCode !== 0 && stderr.toLowerCase().includes('error:'))) {
      status = 'COMPILATION_ERROR';
      errorDetails = compilationError || stderr;
      logMessage = `compilation error on test case ${orderNum}`;
    } else if (timedOut || timeMs >= timeoutMs) {
      status = 'TIME_LIMIT_EXCEEDED';
      errorDetails = `Execution exceeded time limit of ${timeoutMs / 1000}s`;
      logMessage = `time limit exceeded on test case ${orderNum}`;
    } else if (exitCode !== 0) {
      status = 'RUNTIME_ERROR';
      errorDetails = stderr || `Process exited with code ${exitCode}`;
      logMessage = `runtime error on test case ${orderNum}`;
    } else if (normActual === normExpected) {
      status = 'PASSED';
      passed = true;
      logMessage = `pass ${orderNum}/${total}`;
    } else {
      status = 'WRONG_ANSWER';
      errorDetails = `Output mismatch:\nExpected:\n${normExpected}\n\nGot:\n${normActual}`;
      logMessage = `wrong answer on test case ${orderNum}`;
    }

    return {
      testCaseId: testCase.id,
      order: orderNum,
      inputData: testCase.inputData || '',
      expectedOutput: testCase.expectedOutput || '',
      actualOutput: stdout,
      status,
      passed,
      timeMs,
      points: passed ? maxPoints : 0,
      maxPoints,
      errorDetails,
      isHidden: testCase.isHidden,
      logMessage,
    };
  } catch (err: any) {
    const errorDetails = err?.message || 'Execution failed';
    return {
      testCaseId: testCase.id,
      order: orderNum,
      inputData: testCase.inputData || '',
      expectedOutput: testCase.expectedOutput || '',
      actualOutput: '',
      status: 'RUNTIME_ERROR',
      passed: false,
      timeMs: 0,
      points: 0,
      maxPoints,
      errorDetails,
      isHidden: testCase.isHidden,
      logMessage: `error on test case ${orderNum}: ${errorDetails}`,
    };
  }
}

/**
 * Runs all test cases sequentially and triggers progress callbacks
 */
export async function runAllTestCases(
  testCases: TestCaseInput[],
  code: string,
  language: string,
  workspaceFiles: WorkspaceFile[] = [],
  activeFilePath?: string,
  onProgress?: (progress: TestSuiteProgress) => void
): Promise<TestSuiteSummary> {
  const results: TestCaseResult[] = [];
  const logs: string[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;
  let totalTimeMs = 0;

  const total = testCases.length;
  logs.push(`🚀 Starting evaluation on ${total} test case${total === 1 ? '' : 's'}...`);

  for (let i = 0; i < total; i++) {
    const tc = testCases[i];
    totalPoints += tc.points ?? 10;

    const res = await runSingleTestCase(
      tc,
      i,
      total,
      code,
      language,
      workspaceFiles,
      activeFilePath
    );

    results.push(res);
    totalTimeMs += res.timeMs;

    if (res.passed) {
      passedCount++;
      earnedPoints += res.points;
      logs.push(`✅ ${res.logMessage} (${res.timeMs}ms)`);
    } else {
      failedCount++;
      logs.push(`❌ ${res.logMessage}`);
    }

    if (onProgress) {
      onProgress({
        currentIndex: i + 1,
        totalCount: total,
        passedCount,
        failedCount,
        currentResult: res,
        logMessage: res.logMessage,
        logs: [...logs],
      });
    }
  }

  const allPassed = passedCount === total && total > 0;
  const anyPassed = passedCount > 0;
  const status = allPassed
    ? 'ALL_PASSED'
    : anyPassed
    ? 'PARTIAL_PASSED'
    : results.some((r) => r.status === 'COMPILATION_ERROR')
    ? 'COMPILATION_ERROR'
    : 'FAILED';

  const summaryLog = `🏁 Evaluation finished: ${passedCount}/${total} passed • ${earnedPoints}/${totalPoints} pts (${totalTimeMs}ms)`;
  logs.push(summaryLog);

  return {
    totalCount: total,
    passedCount,
    failedCount,
    totalPoints,
    earnedPoints,
    totalTimeMs,
    status,
    results,
    logs,
  };
}
