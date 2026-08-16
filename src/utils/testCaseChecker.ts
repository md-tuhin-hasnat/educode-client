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

export function getPresetCheckerScript(
  type: CheckerType,
  floatTolerance: number = 1e-6
): string {
  if (type === 'FLOAT_TOLERANCE') {
    return `# Codeforces Polygon Checker: Float / Double Precision Tolerance
# Allows absolute or relative error <= ${floatTolerance}
def check(inf, ans, ouf):
    jury_tokens = ans.strip().split()
    user_tokens = ouf.strip().split()
    
    if len(user_tokens) != len(jury_tokens):
        return False, f"Token count mismatch: expected {len(jury_tokens)}, found {len(user_tokens)}"
    
    EPS = ${floatTolerance}  # Floating point precision tolerance limit (eps)
    for i, (j_tok, u_tok) in enumerate(zip(jury_tokens, user_tokens), start=1):
        try:
            j_val = float(j_tok)
            u_val = float(u_tok)
            abs_err = abs(u_val - j_val)
            rel_err = abs_err / max(1.0, abs(j_val))
            delta = min(abs_err, rel_err)
            if delta > EPS:
                return False, f"Token #{i} precision error: expected {j_tok}, found {u_tok} (delta {delta:.8f} > {EPS})"
        except ValueError:
            if j_tok != u_tok:
                return False, f"Token #{i} mismatch: expected '{j_tok}', found '{u_tok}'"
                
    return True, f"Accepted: All floating-point values within tolerance {EPS}"
`;
  }

  if (type === 'CASE_INSENSITIVE') {
    return `# Codeforces Polygon Checker: Case-Insensitive Match (Yes/No / True/False)
def check(inf, ans, ouf):
    jury_tokens = ans.strip().split()
    user_tokens = ouf.strip().split()
    
    if len(user_tokens) != len(jury_tokens):
        return False, f"Token count mismatch: expected {len(jury_tokens)}, found {len(user_tokens)}"
    
    for i, (j_tok, u_tok) in enumerate(zip(jury_tokens, user_tokens), start=1):
        if j_tok.lower() != u_tok.lower():
            return False, f"Token #{i} mismatch: expected '{j_tok}', found '{u_tok}'"
            
    return True, "Accepted: Case-insensitive output matches jury answer"
`;
  }

  if (type === 'UNORDERED_TOKENS') {
    return `# Codeforces Polygon Checker: Unordered Token Multiset / Permutations
from collections import Counter

def check(inf, ans, ouf):
    jury_tokens = ans.strip().split()
    user_tokens = ouf.strip().split()
    
    if len(user_tokens) != len(jury_tokens):
        return False, f"Token count mismatch: expected {len(jury_tokens)}, found {len(user_tokens)}"
    
    jury_counts = Counter(jury_tokens)
    user_counts = Counter(user_tokens)
    
    if jury_counts != user_counts:
        diff = jury_counts - user_counts
        missing_item = next(iter(diff.keys())) if diff else "unknown"
        return False, f"Multiset mismatch: missing token '{missing_item}'"
        
    return True, "Accepted: Unordered tokens match"
`;
  }

  if (type === 'CUSTOM_SCRIPT') {
    return `# Codeforces Polygon Style Custom Checker (Python)
# Input parameters:
#   inf: string representing testcase input (stdin)
#   ans: string representing jury/reference expected output
#   ouf: string representing participant/student output
#
# Return:
#   (True, "OK message") for Accepted (AC)
#   (False, "WA reason") for Wrong Answer (WA)

def check(inf, ans, ouf):
    user_lines = ouf.strip().splitlines()
    jury_lines = ans.strip().splitlines()
    
    if not user_lines:
        return False, "Participant output is empty"
        
    # Write custom verification logic below (e.g. graph path, coordinate bounds, multiple valid trees):
    return True, "Accepted: Custom judge validation passed"
`;
  }

  // EXACT
  return `# Codeforces Polygon Checker: Standard Exact Match (whitespace-normalized)
def check(inf, ans, ouf):
    jury_tokens = ans.strip().split()
    user_tokens = ouf.strip().split()
    
    if len(user_tokens) != len(jury_tokens):
        return False, f"Token count mismatch: expected {len(jury_tokens)}, found {len(user_tokens)}"
    
    for i, (j_tok, u_tok) in enumerate(zip(jury_tokens, user_tokens), start=1):
        if j_tok != u_tok:
            return False, f"Token #{i} mismatch: expected '{j_tok}', found '{u_tok}'"
            
    return True, "Accepted: Exact match"
`;
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
}> = [
  {
    id: 'EXACT',
    label: 'Exact Match (Whitespace Normalized)',
    description: 'Standard token & line whitespace-normalized comparison.',
    badge: 'Default',
  },
  {
    id: 'FLOAT_TOLERANCE',
    label: 'Float / Double Precision (|a - b| ≤ ε)',
    description: 'Tolerates rounding & floating-point precision error up to ε (e.g. 1e-6).',
    badge: 'Precision',
  },
  {
    id: 'CASE_INSENSITIVE',
    label: 'Case-Insensitive Match (Yes/No, True/False)',
    description: 'Matches output ignoring letter casing (e.g. "YES" == "yes" == "Yes").',
    badge: 'Case-Insensitive',
  },
  {
    id: 'UNORDERED_TOKENS',
    label: 'Unordered Token Multiset',
    description: 'Verifies all tokens exist regardless of print order (e.g. all divisors).',
    badge: 'Unordered',
  },
  {
    id: 'CUSTOM_SCRIPT',
    label: 'Custom Script Checker (Polygon / Testlib)',
    description: 'Custom Python or C++ judge script for problems with multiple valid answers.',
    badge: 'Custom Script',
  },
];

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
}

/**
 * Serializes all teacher workbench engineering codes (solution, generator, template, checker)
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
  });

  return `${cleanedDesc}\n\n<!--educode-task-meta:${metaJson}-->`.trim();
}

/**
 * Extracts all teacher workbench engineering codes (solution, generator, template, checker)
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

