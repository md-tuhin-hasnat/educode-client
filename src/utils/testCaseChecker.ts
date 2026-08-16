/**
 * Codeforces Polygon-Style Checker & Validator Engine for EduCode
 * Supports:
 * 1. EXACT: Strict / whitespace-normalized string comparison
 * 2. FLOAT_TOLERANCE: Floating point / double precision check |actual - expected| <= eps OR relative error <= eps
 * 3. CASE_INSENSITIVE: Case-insensitive token comparison (e.g. YES/yes, TRUE/true)
 * 4. UNORDERED_TOKENS: Order-independent token multiset comparison
 * 5. CUSTOM_SCRIPT: Codeforces Polygon / Testlib style Python/C++ checker script
 */

import { apiClient } from '@/config/api';

export type CheckerType =
  | 'EXACT'
  | 'FLOAT_TOLERANCE'
  | 'CASE_INSENSITIVE'
  | 'UNORDERED_TOKENS'
  | 'CUSTOM_SCRIPT';

export interface CheckerConfig {
  type: CheckerType;
  floatTolerance?: number; // e.g. 0.000001 (1e-6)
  customScript?: string;
  customLanguage?: 'python' | 'cpp';
}

import CHECKER_PRESETS_DATA from '@/data/checkerPresets.json';
import CHECKER_SCRIPTS_DATA from '@/data/checkerScripts.json';

export function getPresetCheckerScript(
  type: CheckerType,
  floatTolerance: number = 1e-6
): string {
  const scriptTemplate =
    CHECKER_SCRIPTS_DATA[type as keyof typeof CHECKER_SCRIPTS_DATA] ||
    CHECKER_SCRIPTS_DATA.EXACT;

  if (type === 'FLOAT_TOLERANCE') {
    return scriptTemplate.split('__EPS__').join(String(floatTolerance));
  }

  return scriptTemplate;
}

export const DEFAULT_CHECKER_CONFIG: CheckerConfig = {
  type: 'EXACT',
  floatTolerance: 1e-6,
  customLanguage: 'python',
  customScript: getPresetCheckerScript('EXACT', 1e-6),
};

export const CHECKER_PRESETS: Array<{
  id: CheckerType;
  label: string;
  description: string;
  badge: string;
}> = CHECKER_PRESETS_DATA as Array<{
  id: CheckerType;
  label: string;
  description: string;
  badge: string;
}>;

export interface CheckerVerdict {
  passed: boolean;
  message: string;
  diffDetails?: string;
  maxDelta?: number;
}

/**
 * Splits text into non-whitespace tokens
 */
export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/**
 * Evaluates a single testcase output against expected output using the specified CheckerConfig.
 */
export async function evaluateTestCaseOutput(
  actualOutput: string,
  expectedOutput: string,
  inputData: string = '',
  config: CheckerConfig = DEFAULT_CHECKER_CONFIG
): Promise<CheckerVerdict> {
  const normActual = (actualOutput || '').trim();
  const normExpected = (expectedOutput || '').trim();

  // 1. EXACT MATCH
  if (config.type === 'EXACT') {
    const actualTokens = tokenize(normActual);
    const expectedTokens = tokenize(normExpected);

    if (actualTokens.length !== expectedTokens.length) {
      return {
        passed: false,
        message: `Token count mismatch: expected ${expectedTokens.length} token(s), but got ${actualTokens.length}.`,
        diffDetails: `Expected:\n${normExpected}\n\nGot:\n${normActual}`,
      };
    }

    for (let i = 0; i < expectedTokens.length; i++) {
      if (actualTokens[i] !== expectedTokens[i]) {
        return {
          passed: false,
          message: `Mismatch on token #${i + 1}: expected "${expectedTokens[i]}", found "${actualTokens[i]}".`,
          diffDetails: `Expected: "${expectedTokens[i]}"\nFound: "${actualTokens[i]}"`,
        };
      }
    }

    return {
      passed: true,
      message: 'Accepted (Exact match)',
    };
  }

  // 2. FLOAT / DOUBLE PRECISION TOLERANCE (Codeforces rcmp / fcmp)
  if (config.type === 'FLOAT_TOLERANCE') {
    const eps = config.floatTolerance ?? 1e-6;
    const actualTokens = tokenize(normActual);
    const expectedTokens = tokenize(normExpected);

    if (actualTokens.length !== expectedTokens.length) {
      return {
        passed: false,
        message: `Token count mismatch: expected ${expectedTokens.length} values, found ${actualTokens.length}.`,
        diffDetails: `Expected:\n${normExpected}\n\nGot:\n${normActual}`,
      };
    }

    let maxDelta = 0;
    for (let i = 0; i < expectedTokens.length; i++) {
      const eToken = expectedTokens[i];
      const aToken = actualTokens[i];

      const eNum = Number(eToken);
      const aNum = Number(aToken);

      // If both parse as numbers, perform precision tolerance check
      if (!isNaN(eNum) && !isNaN(aNum)) {
        const absDelta = Math.abs(aNum - eNum);
        const relDelta = Math.abs(eNum) > 0 ? absDelta / Math.abs(eNum) : absDelta;
        const effectiveDelta = Math.min(absDelta, relDelta);

        maxDelta = Math.max(maxDelta, effectiveDelta);

        if (effectiveDelta > eps) {
          return {
            passed: false,
            message: `Number #${i + 1} precision error: expected ${eToken}, found ${aToken} (delta ${effectiveDelta.toExponential(4)} > ε ${eps.toExponential(4)}).`,
            diffDetails: `Expected: ${eToken}\nFound: ${aToken}\nAbsolute Delta: ${absDelta}\nRelative Delta: ${relDelta}\nTolerance (ε): ${eps}`,
            maxDelta,
          };
        }
      } else {
        // Non-numeric string token: must match exactly
        if (aToken !== eToken) {
          return {
            passed: false,
            message: `Token #${i + 1} mismatch: expected "${eToken}", found "${aToken}".`,
            diffDetails: `Expected: "${eToken}"\nFound: "${aToken}"`,
          };
        }
      }
    }

    return {
      passed: true,
      message: `Accepted (Max delta ${maxDelta.toExponential(3)} ≤ ε ${eps.toExponential(3)})`,
      maxDelta,
    };
  }

  // 3. CASE-INSENSITIVE MATCH (Codeforces yesno)
  if (config.type === 'CASE_INSENSITIVE') {
    const actualTokens = tokenize(normActual.toLowerCase());
    const expectedTokens = tokenize(normExpected.toLowerCase());

    if (actualTokens.length !== expectedTokens.length) {
      return {
        passed: false,
        message: `Token count mismatch (case-insensitive): expected ${expectedTokens.length} token(s), found ${actualTokens.length}.`,
        diffDetails: `Expected:\n${normExpected}\n\nGot:\n${normActual}`,
      };
    }

    for (let i = 0; i < expectedTokens.length; i++) {
      if (actualTokens[i] !== expectedTokens[i]) {
        return {
          passed: false,
          message: `Mismatch on token #${i + 1}: expected "${expectedTokens[i]}" (case-insensitive), found "${actualTokens[i]}".`,
          diffDetails: `Expected: "${expectedTokens[i]}"\nFound: "${actualTokens[i]}"`,
        };
      }
    }

    return {
      passed: true,
      message: 'Accepted (Case-insensitive match)',
    };
  }

  // 4. UNORDERED TOKENS (Multiset comparison)
  if (config.type === 'UNORDERED_TOKENS') {
    const actualTokens = tokenize(normActual);
    const expectedTokens = tokenize(normExpected);

    if (actualTokens.length !== expectedTokens.length) {
      return {
        passed: false,
        message: `Token count mismatch: expected ${expectedTokens.length} elements, found ${actualTokens.length}.`,
        diffDetails: `Expected elements:\n${expectedTokens.join(' ')}\n\nFound elements:\n${actualTokens.join(' ')}`,
      };
    }

    const countMap: Record<string, number> = {};
    for (const t of expectedTokens) {
      countMap[t] = (countMap[t] || 0) + 1;
    }

    for (const t of actualTokens) {
      if (!countMap[t]) {
        return {
          passed: false,
          message: `Unexpected token "${t}" not found in expected element set.`,
          diffDetails: `Extra or missing elements between user output and expected set.`,
        };
      }
      countMap[t]--;
    }

    return {
      passed: true,
      message: 'Accepted (Unordered multiset match)',
    };
  }

  // 5. CUSTOM PYTHON / C++ SCRIPT CHECKER (Codeforces Polygon)
  if (config.type === 'CUSTOM_SCRIPT') {
    const script = config.customScript || DEFAULT_CHECKER_CONFIG.customScript;

    // Wrap python script with runner wrapper that passes json inputs
    const wrappedPythonScript = `
import sys
import json

${script}

def _main():
    payload = json.loads(sys.stdin.read())
    inf = payload.get("inf", "")
    ans = payload.get("ans", "")
    ouf = payload.get("ouf", "")
    
    if "check" in globals():
        res = check(inf, ans, ouf)
        if isinstance(res, tuple):
            passed, msg = res[0], str(res[1])
        else:
            passed, msg = bool(res), "Accepted" if res else "Wrong Answer"
        print(json.dumps({"passed": passed, "message": msg}))
    else:
        # Fallback if no check function
        passed = (ans.strip() == ouf.strip())
        print(json.dumps({"passed": passed, "message": "Exact match fallback"}))

if __name__ == "__main__":
    _main()
`;

    try {
      const res = await apiClient.post('/stream/execute', {
        code: wrappedPythonScript,
        language: 'python',
        input: JSON.stringify({
          inf: inputData,
          ans: expectedOutput,
          ouf: actualOutput,
        }),
      });

      if (res.data?.exitCode === 0 && res.data?.stdout) {
        try {
          const parsed = JSON.parse(res.data.stdout.trim());
          return {
            passed: Boolean(parsed.passed),
            message: parsed.message || (parsed.passed ? 'Accepted (Custom Checker)' : 'Wrong Answer (Custom Checker)'),
          };
        } catch {
          const stdout = res.data.stdout.trim();
          const passed = stdout.toUpperCase().includes('OK') || stdout.toUpperCase().includes('ACCEPTED');
          return {
            passed,
            message: stdout,
          };
        }
      } else {
        return {
          passed: false,
          message: `Custom Checker Error: ${res.data?.stderr || 'Checker failed to execute'}`,
        };
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Checker execution failed';
      return {
        passed: false,
        message: `Checker Execution Exception: ${msg}`,
      };
    }
  }

  return {
    passed: normActual === normExpected,
    message: normActual === normExpected ? 'Accepted' : 'Wrong Answer',
  };
}

export interface TaskWorkbenchMetadata {
  solutionCode?: string;
  generatorCode?: string;
  templateCode?: string;
  checkerConfig?: CheckerConfig;
  timeLimitMs?: number;    // Execution time limit in ms (default: 1000ms / 1.0s)
  memoryLimitMb?: number;  // Memory limit in MB (default: 256MB)
}

/**
 * Serializes all teacher workbench engineering codes and limits (solution, generator, template, checker, limits)
 * into task description metadata comment.
 */
export function serializeTaskWorkbenchMetadata(
  description: string,
  meta: TaskWorkbenchMetadata
): string {
  const cleanedDesc = description
    .replace(/<!--educode-task-meta:[\s\S]*?-->/g, '')
    .replace(/<!--educode-checker:[\s\S]*?-->/g, '')
    .trim();

  const metaJson = JSON.stringify({
    solutionCode: meta.solutionCode || '',
    generatorCode: meta.generatorCode || '',
    templateCode: meta.templateCode || '',
    checkerConfig: meta.checkerConfig || DEFAULT_CHECKER_CONFIG,
    timeLimitMs: meta.timeLimitMs ?? 1000,
    memoryLimitMb: meta.memoryLimitMb ?? 256,
  });

  return `${cleanedDesc}\n\n<!--educode-task-meta:${metaJson}-->`.trim();
}

/**
 * Extracts all teacher workbench engineering codes and limits
 * from task description metadata comment.
 */
export function parseTaskWorkbenchMetadata(
  description: string | null | undefined
): TaskWorkbenchMetadata {
  if (!description) {
    return {
      solutionCode: '',
      generatorCode: '',
      templateCode: '',
      checkerConfig: { ...DEFAULT_CHECKER_CONFIG },
      timeLimitMs: 1000,
      memoryLimitMb: 256,
    };
  }

  // 1. Try unified task-meta tag
  const taskMetaMatch = description.match(/<!--educode-task-meta:([\s\S]*?)-->/);
  if (taskMetaMatch) {
    try {
      const parsed = JSON.parse(taskMetaMatch[1].trim());
      return {
        solutionCode: parsed.solutionCode || '',
        generatorCode: parsed.generatorCode || '',
        templateCode: parsed.templateCode || '',
        checkerConfig: parsed.checkerConfig || { ...DEFAULT_CHECKER_CONFIG },
        timeLimitMs: typeof parsed.timeLimitMs === 'number' ? parsed.timeLimitMs : 1000,
        memoryLimitMb: typeof parsed.memoryLimitMb === 'number' ? parsed.memoryLimitMb : 256,
      };
    } catch {
      // ignore
    }
  }

  // 2. Fallback to legacy checker-meta tag
  const checkerMetaMatch = description.match(/<!--educode-checker:([\s\S]*?)-->/);
  if (checkerMetaMatch) {
    try {
      const parsed = JSON.parse(checkerMetaMatch[1].trim());
      return {
        solutionCode: '',
        generatorCode: '',
        templateCode: '',
        checkerConfig: {
          type: parsed.type || 'EXACT',
          floatTolerance: parsed.floatTolerance ?? 1e-6,
          customScript: parsed.customScript || DEFAULT_CHECKER_CONFIG.customScript,
          customLanguage: parsed.customLanguage || 'python',
        },
        timeLimitMs: 1000,
        memoryLimitMb: 256,
      };
    } catch {
      // ignore
    }
  }

  return {
    solutionCode: '',
    generatorCode: '',
    templateCode: '',
    checkerConfig: { ...DEFAULT_CHECKER_CONFIG },
    timeLimitMs: 1000,
    memoryLimitMb: 256,
  };
}

/**
 * Returns clean user-facing description by stripping all internal metadata comments
 */
export function stripTaskWorkbenchMetadata(description: string | null | undefined): string {
  if (!description) return '';
  return description
    .replace(/<!--educode-task-meta:[\s\S]*?-->/g, '')
    .replace(/<!--educode-checker:[\s\S]*?-->/g, '')
    .trim();
}

/**
 * Backwards compatibility aliases
 */
export function serializeCheckerMetadata(description: string, config: CheckerConfig): string {
  return serializeTaskWorkbenchMetadata(description, { checkerConfig: config });
}

export function parseCheckerMetadata(description: string | null | undefined): CheckerConfig {
  const meta = parseTaskWorkbenchMetadata(description);
  return meta.checkerConfig || { ...DEFAULT_CHECKER_CONFIG };
}

export function stripCheckerMetadata(description: string | null | undefined): string {
  return stripTaskWorkbenchMetadata(description);
}

