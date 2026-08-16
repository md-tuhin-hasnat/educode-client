import { CheckerConfig, CheckerType } from '@/utils/testCaseChecker';

export type TestCaseCategory = 'SAMPLE' | 'PRETEST' | 'SYSTEM';

export interface TestCaseItem {
  id?: number | string;
  inputData: string;
  expectedOutput: string;
  points: number;
  isHidden?: boolean;
  testType?: TestCaseCategory;
  order: number;
}

export type WorkspaceTab = 'solution' | 'generator' | 'checker' | 'template' | 'testsuite';

export type BottomConsoleTab = 'terminal' | 'testsuite' | 'batchgen' | 'checkertest';

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
  timeLimitMs?: number;
  onTimeLimitChange?: (val: number) => void;
  memoryLimitMb?: number;
  onMemoryLimitChange?: (val: number) => void;
  testCases: TestCaseItem[];
  onTestCasesChange: (cases: TestCaseItem[]) => void;
  className?: string;
}

export interface RunExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface TestSuiteResultItem {
  testCaseId: string | number;
  inputData: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  durationMs: number;
  testType?: TestCaseCategory;
  message?: string;
  stderr?: string;
}

export interface CheckerVerdictResult {
  passed: boolean;
  message: string;
  diffDetails?: string;
}
