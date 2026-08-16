import { TestCaseInput, TestCaseResult, TestSuiteSummary } from '@/utils/testCaseRunner';
import { CheckerConfig } from '@/utils/testCaseChecker';

export type RunnerFilter = 'ALL' | 'SAMPLE' | 'PRETEST' | 'PASSED' | 'FAILED';

export interface TestCaseRunnerPanelProps {
  testCases: TestCaseInput[];
  summary: TestSuiteSummary | null;
  isRunning: boolean;
  onRunAll: () => void;
  onRunCategory?: (category: 'ALL' | 'SAMPLE' | 'PRETEST') => void;
  onClose?: () => void;
  onAddCustomTestCase?: (tc: TestCaseInput) => void;
  checkerConfig?: CheckerConfig;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}
