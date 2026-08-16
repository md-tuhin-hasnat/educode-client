import {
  evaluateTestCaseOutput,
  serializeTaskWorkbenchMetadata,
  parseTaskWorkbenchMetadata,
  stripTaskWorkbenchMetadata,
  serializeCheckerMetadata,
  parseCheckerMetadata,
  stripCheckerMetadata,
  getPresetCheckerScript,
  CheckerConfig,
} from './testCaseChecker';

describe('testCaseChecker engine', () => {
  describe('EXACT mode', () => {
    it('passes for exact whitespace-normalized match', async () => {
      const verdict = await evaluateTestCaseOutput('hello world\n', '  hello   world  ', '', {
        type: 'EXACT',
      });
      expect(verdict.passed).toBe(true);
    });

    it('fails when token counts or values differ', async () => {
      const verdict = await evaluateTestCaseOutput('hello world 123', 'hello world 124', '', {
        type: 'EXACT',
      });
      expect(verdict.passed).toBe(false);
      expect(verdict.message).toContain('Mismatch on token #3');
    });
  });

  describe('FLOAT_TOLERANCE mode (Codeforces rcmp/fcmp)', () => {
    it('passes when floating numbers differ within absolute error <= 1e-6', async () => {
      const verdict = await evaluateTestCaseOutput('31.4159265', '31.4159269', '', {
        type: 'FLOAT_TOLERANCE',
        floatTolerance: 1e-6,
      });
      expect(verdict.passed).toBe(true);
      expect(verdict.message).toContain('Accepted');
    });

    it('fails when floating numbers exceed tolerance limit', async () => {
      const verdict = await evaluateTestCaseOutput('31.42', '31.415926', '', {
        type: 'FLOAT_TOLERANCE',
        floatTolerance: 1e-6,
      });
      expect(verdict.passed).toBe(false);
      expect(verdict.message).toContain('precision error');
    });

    it('handles multiple floating tokens on multiple lines', async () => {
      const userOut = '1.0000001 2.0000002\n3.0000003';
      const juryOut = '1.0 2.0\n3.0';
      const verdict = await evaluateTestCaseOutput(userOut, juryOut, '', {
        type: 'FLOAT_TOLERANCE',
        floatTolerance: 1e-6,
      });
      expect(verdict.passed).toBe(true);
    });

    it('respects custom tolerance limit like 1e-4', async () => {
      const userOut = '3.14159';
      const juryOut = '3.14150';
      const verdict = await evaluateTestCaseOutput(userOut, juryOut, '', {
        type: 'FLOAT_TOLERANCE',
        floatTolerance: 1e-4,
      });
      expect(verdict.passed).toBe(true);
    });
  });

  describe('CASE_INSENSITIVE mode (Codeforces yesno)', () => {
    it('matches regardless of upper/lower case', async () => {
      const verdict = await evaluateTestCaseOutput('YES', 'yes', '', {
        type: 'CASE_INSENSITIVE',
      });
      expect(verdict.passed).toBe(true);
    });

    it('matches mixed cases across multiple tokens', async () => {
      const verdict = await evaluateTestCaseOutput('True 42 Valid', 'TRUE 42 valid', '', {
        type: 'CASE_INSENSITIVE',
      });
      expect(verdict.passed).toBe(true);
    });

    it('fails on distinct words', async () => {
      const verdict = await evaluateTestCaseOutput('YES', 'NO', '', {
        type: 'CASE_INSENSITIVE',
      });
      expect(verdict.passed).toBe(false);
    });
  });

  describe('UNORDERED_TOKENS mode', () => {
    it('matches permutations of tokens', async () => {
      const verdict = await evaluateTestCaseOutput('4 1 3 2', '1 2 3 4', '', {
        type: 'UNORDERED_TOKENS',
      });
      expect(verdict.passed).toBe(true);
    });

    it('fails if token frequencies differ', async () => {
      const verdict = await evaluateTestCaseOutput('1 2 2 3', '1 2 3 3', '', {
        type: 'UNORDERED_TOKENS',
      });
      expect(verdict.passed).toBe(false);
    });
  });

  describe('getPresetCheckerScript', () => {
    it('generates python code for all preset types', () => {
      const exactScript = getPresetCheckerScript('EXACT');
      expect(exactScript).toContain('def check(inf, ans, ouf):');
      expect(exactScript).toContain('Exact match');

      const floatScript = getPresetCheckerScript('FLOAT_TOLERANCE', 1e-6);
      expect(floatScript).toContain('def check(inf, ans, ouf):');
      expect(floatScript).toContain('EPS = 0.000001');

      const caseScript = getPresetCheckerScript('CASE_INSENSITIVE');
      expect(caseScript).toContain('def check(inf, ans, ouf):');
      expect(caseScript).toContain('j_tok.lower() != u_tok.lower()');

      const multisetScript = getPresetCheckerScript('UNORDERED_TOKENS');
      expect(multisetScript).toContain('from collections import Counter');
      expect(multisetScript).toContain('Counter(jury_tokens)');

      const customScript = getPresetCheckerScript('CUSTOM_SCRIPT');
      expect(customScript).toContain('def check(inf, ans, ouf):');
    });
  });

  describe('Metadata serialization & deserialization', () => {
    it('correctly serializes and parses full workbench metadata from description', () => {
      const meta = {
        solutionCode: 'int main() { return 0; }',
        generatorCode: 'import random\nprint(42)',
        templateCode: '// starter code',
        checkerConfig: {
          type: 'FLOAT_TOLERANCE' as const,
          floatTolerance: 0.000001,
        },
      };
      const desc = '# Problem Title\nCalculate perimeter of circle.';
      const serialized = serializeTaskWorkbenchMetadata(desc, meta);

      expect(serialized).toContain('<!--educode-task-meta:');

      const parsed = parseTaskWorkbenchMetadata(serialized);
      expect(parsed.solutionCode).toBe(meta.solutionCode);
      expect(parsed.generatorCode).toBe(meta.generatorCode);
      expect(parsed.templateCode).toBe(meta.templateCode);
      expect(parsed.checkerConfig?.type).toBe('FLOAT_TOLERANCE');
      expect(parsed.checkerConfig?.floatTolerance).toBe(0.000001);

      const cleaned = stripTaskWorkbenchMetadata(serialized);
      expect(cleaned).toBe(desc);
      expect(cleaned).not.toContain('<!--educode-task-meta:');
    });
  });
});
