import {
  evaluateTestCaseOutput,
  serializeTaskWorkbenchMetadata,
  parseTaskWorkbenchMetadata,
  stripTaskWorkbenchMetadata,
  DEFAULT_CHECKER_CONFIG,
} from '../testCaseChecker';
import { runAllTestCases, TestCaseInput } from '../testCaseRunner';

describe('TestCase Checker and Runner Engine', () => {
  describe('evaluateTestCaseOutput', () => {
    it('evaluates exact match checker correctly', async () => {
      const config = { type: 'EXACT' as const };
      expect((await evaluateTestCaseOutput('hello world', 'hello world', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('hello world\n', 'hello world', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('hello world', 'hello there', '', config)).passed).toBe(false);
    });

    it('evaluates float precision tolerance checker correctly', async () => {
      const config = {
        type: 'FLOAT_TOLERANCE' as const,
        floatTolerance: 0.000001,
      };

      // Exact match
      expect((await evaluateTestCaseOutput('3.14159265', '3.14159265', '', config)).passed).toBe(true);
      
      // Within tolerance 1e-6
      expect((await evaluateTestCaseOutput('3.1415927', '3.1415926', '', config)).passed).toBe(true);

      // Outside tolerance
      expect((await evaluateTestCaseOutput('3.1415000', '3.1415926', '', config)).passed).toBe(false);

      // Multiple floats in tokens
      expect((await evaluateTestCaseOutput('x = 1.0000001 y = 2.0000002', 'x = 1.0000000 y = 2.0000000', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('x = 1.0500000 y = 2.0000000', 'x = 1.0000000 y = 2.0000000', '', config)).passed).toBe(false);
    });

    it('evaluates case-insensitive checker correctly', async () => {
      const config = { type: 'CASE_INSENSITIVE' as const };
      expect((await evaluateTestCaseOutput('YES', 'yes', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('No', 'NO', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('Maybe', 'No', '', config)).passed).toBe(false);
    });

    it('evaluates unordered tokens checker correctly', async () => {
      const config = { type: 'UNORDERED_TOKENS' as const };
      expect((await evaluateTestCaseOutput('apple banana orange', 'orange apple banana', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('10 20 30', '30 10 20', '', config)).passed).toBe(true);
      expect((await evaluateTestCaseOutput('10 20', '10 20 30', '', config)).passed).toBe(false);
    });
  });

  describe('Workbench Metadata Serialization with Limits', () => {
    it('serializes and parses time limit and memory limit correctly', () => {
      const description = 'Calculate the area of a circle with high precision.';
      const meta = {
        solutionCode: 'int main() { return 0; }',
        generatorCode: 'print(10)',
        templateCode: '// starter code',
        checkerConfig: {
          type: 'FLOAT_TOLERANCE' as const,
          floatTolerance: 1e-7,
        },
        timeLimitMs: 2000,
        memoryLimitMb: 512,
      };

      const serialized = serializeTaskWorkbenchMetadata(description, meta);
      expect(serialized).toContain('<!--educode-task-meta:');
      expect(serialized).toContain('Calculate the area of a circle');

      const parsed = parseTaskWorkbenchMetadata(serialized);
      expect(parsed.solutionCode).toBe('int main() { return 0; }');
      expect(parsed.timeLimitMs).toBe(2000);
      expect(parsed.memoryLimitMb).toBe(512);
      expect(parsed.checkerConfig?.type).toBe('FLOAT_TOLERANCE');
      expect(parsed.checkerConfig?.floatTolerance).toBe(1e-7);

      const stripped = stripTaskWorkbenchMetadata(serialized);
      expect(stripped).toBe(description);
    });

    it('falls back to defaults when limits are missing', () => {
      const description = 'Problem description without metadata';
      const parsed = parseTaskWorkbenchMetadata(description);
      expect(parsed.timeLimitMs).toBe(1000);
      expect(parsed.memoryLimitMb).toBe(256);
      expect(parsed.checkerConfig).toEqual(DEFAULT_CHECKER_CONFIG);
    });
  });

  describe('runAllTestCases with category filtering', () => {
    const mockTestCases: TestCaseInput[] = [
      { id: '1', order: 1, inputData: '1', expectedOutput: '1', points: 10, testType: 'SAMPLE' },
      { id: '2', order: 2, inputData: '2', expectedOutput: '2', points: 20, testType: 'PRETEST' },
      { id: '3', order: 3, inputData: '3', expectedOutput: '3', points: 30, testType: 'SYSTEM' },
    ];

    it('filters test cases by category when requested', async () => {
      // Filter SAMPLE only
      const sampleSummary = await runAllTestCases(
        mockTestCases,
        'print(input())',
        'python',
        [],
        'solution.py',
        undefined,
        1000,
        DEFAULT_CHECKER_CONFIG,
        'SAMPLE'
      );
      expect(sampleSummary.totalCount).toBe(1);
      expect(sampleSummary.results[0].testCaseId).toBe('1');

      // Filter PRETEST only
      const pretestSummary = await runAllTestCases(
        mockTestCases,
        'print(input())',
        'python',
        [],
        'solution.py',
        undefined,
        1000,
        DEFAULT_CHECKER_CONFIG,
        'PRETEST'
      );
      expect(pretestSummary.totalCount).toBe(1);
      expect(pretestSummary.results[0].testCaseId).toBe('2');

      // Filter ALL
      const allSummary = await runAllTestCases(
        mockTestCases,
        'print(input())',
        'python',
        [],
        'solution.py',
        undefined,
        1000,
        DEFAULT_CHECKER_CONFIG,
        'ALL'
      );
      expect(allSummary.totalCount).toBe(3);
    });
  });
});
