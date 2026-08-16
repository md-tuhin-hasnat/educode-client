import {
  normalizeOutput,
  runSingleTestCase,
  runAllTestCases,
  TestCaseInput,
} from './testCaseRunner';

describe('testCaseRunner utility', () => {
  describe('normalizeOutput', () => {
    it('trims trailing whitespaces per line and overall newlines', () => {
      const raw = '  hello world  \r\nline 2   \r\n\r\n';
      const normalized = normalizeOutput(raw);
      expect(normalized).toBe('hello world\nline 2');
    });

    it('handles empty or null string gracefully', () => {
      expect(normalizeOutput('')).toBe('');
      expect(normalizeOutput(null as any)).toBe('');
      expect(normalizeOutput(undefined as any)).toBe('');
    });
  });

  describe('runSingleTestCase & runAllTestCases', () => {
    const mockTestCases: TestCaseInput[] = [
      { id: '1', order: 1, inputData: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', points: 30 },
      { id: '2', order: 2, inputData: '3\n10 20 30', expectedOutput: '30 20 10', points: 30 },
      { id: '3', order: 3, inputData: '1\n99', expectedOutput: '99', points: 40, isHidden: true },
    ];

    beforeEach(() => {
      (window as any).educode = {
        executor: {
          runCode: jest.fn().mockImplementation(async ({ stdin }: { stdin: string }) => {
            if (stdin.includes('99')) {
              // Simulate wrong answer on testcase 3
              return { stdout: '100\n', stderr: '', exitCode: 0, timeMs: 35 };
            }
            if (stdin.includes('1 2 3 4 5')) {
              return { stdout: '5 4 3 2 1\n', stderr: '', exitCode: 0, timeMs: 40 };
            }
            return { stdout: '30 20 10\n', stderr: '', exitCode: 0, timeMs: 30 };
          }),
        },
      };
    });

    it('evaluates single testcase correctly with pass and fail logs', async () => {
      const passRes = await runSingleTestCase(
        mockTestCases[0],
        0,
        3,
        'code',
        'cpp'
      );
      expect(passRes.passed).toBe(true);
      expect(passRes.status).toBe('PASSED');
      expect(passRes.logMessage).toBe('passed 1/3 (SAMPLE)');
      expect(passRes.points).toBe(30);

      const failRes = await runSingleTestCase(
        mockTestCases[2],
        2,
        3,
        'code',
        'cpp'
      );
      expect(failRes.passed).toBe(false);
      expect(failRes.status).toBe('WRONG_ANSWER');
      expect(failRes.logMessage).toBe('wrong answer on pretest 3');
      expect(failRes.points).toBe(0);
    });

    it('runs all test cases sequentially and reports progressive summary', async () => {
      const progressLogs: string[] = [];
      const summary = await runAllTestCases(
        mockTestCases,
        'code',
        'cpp',
        [],
        undefined,
        (progress) => {
          progressLogs.push(progress.logMessage);
        }
      );

      expect(summary.totalCount).toBe(3);
      expect(summary.passedCount).toBe(2);
      expect(summary.failedCount).toBe(1);
      expect(summary.totalPoints).toBe(100);
      expect(summary.earnedPoints).toBe(60);
      expect(summary.status).toBe('PARTIAL_PASSED');

      expect(progressLogs).toEqual([
        'passed 1/3 (SAMPLE)',
        'passed 2/3 (SAMPLE)',
        'wrong answer on pretest 3',
      ]);
    });
  });
});
