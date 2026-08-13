export interface SyntaxMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: number; // 8 = Error in Monaco MarkerSeverity
}

/**
 * Perform client-side real-time syntax validation for C, C++, Python, and Java code.
 */
export function validateCodeSyntax(
  code: string,
  language: string,
  fileName: string = ''
): SyntaxMarker[] {
  const markers: SyntaxMarker[] = [];
  if (!code) return markers;

  const lines = code.split('\n');

  // 1. Bracket and Parentheses Matching (All Languages)
  const bracketStack: Array<{ char: string; line: number; col: number }> = [];
  const matchingBrackets: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const lineNumber = lineIdx + 1;
    let inString = false;
    let stringChar = '';

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const ch = line[colIdx];
      const prevCh = colIdx > 0 ? line[colIdx - 1] : '';

      // Block comments handling for C/C++/Java
      if ((language === 'c' || language === 'cpp' || language === 'java') && !inString) {
        if (!inBlockComment && ch === '/' && line[colIdx + 1] === '*') {
          inBlockComment = true;
          colIdx++;
          continue;
        }
        if (inBlockComment && ch === '*' && line[colIdx + 1] === '/') {
          inBlockComment = false;
          colIdx++;
          continue;
        }
      }
      if (inBlockComment) continue;

      // Line comments
      if (!inString) {
        if ((language === 'c' || language === 'cpp' || language === 'java') && ch === '/' && line[colIdx + 1] === '/') {
          break; // Rest of line is comment
        }
        if (language === 'python' && ch === '#') {
          break; // Rest of line is comment
        }
      }

      // String literal handling
      if ((ch === '"' || ch === "'") && prevCh !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = ch;
        } else if (stringChar === ch) {
          inString = false;
        }
      }

      if (inString) continue;

      // Bracket matching
      if (ch === '(' || ch === '{' || ch === '[') {
        bracketStack.push({ char: ch, line: lineNumber, col: colIdx + 1 });
      } else if (ch === ')' || ch === '}' || ch === ']') {
        const expectedOpening = matchingBrackets[ch];
        if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1].char !== expectedOpening) {
          markers.push({
            startLineNumber: lineNumber,
            startColumn: Math.max(1, colIdx + 1),
            endLineNumber: lineNumber,
            endColumn: Math.min(line.length + 1, colIdx + 2),
            message: `Unmatched closing bracket '${ch}'`,
            severity: 8,
          });
        } else {
          bracketStack.pop();
        }
      }
    }

    // Check for unclosed string on line (except python multi-line strings)
    if (inString && language !== 'python') {
      markers.push({
        startLineNumber: lineNumber,
        startColumn: Math.max(1, line.length - 1),
        endLineNumber: lineNumber,
        endColumn: line.length + 1,
        message: `Unclosed string literal (${stringChar})`,
        severity: 8,
      });
    }

    // 2. Missing Semicolon Check (Java, C, C++)
    if ((language === 'c' || language === 'cpp' || language === 'java') && !inBlockComment) {
      const trimmed = line.replace(/\/\/.*/, '').replace(/\/\*.*?\*\//g, '').trim();

      if (
        trimmed.length > 0 &&
        !trimmed.endsWith(';') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.endsWith(':') &&
        !trimmed.endsWith('\\') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.endsWith('*/') &&
        !/^public\s+(class|interface|enum)\b/.test(trimmed) &&
        !/^(if|else|for|while|switch|case|default|try|catch|finally)\b/.test(trimmed) &&
        !/^(package|import)\s+/.test(trimmed)
      ) {
        // Only flag if next non-empty line isn't starting with bracket or continuing
        const nextLine = lines.slice(lineIdx + 1).find((l) => l.trim().length > 0);
        if (!nextLine || (!nextLine.trim().startsWith('{') && !nextLine.trim().startsWith('.'))) {
          markers.push({
            startLineNumber: lineNumber,
            startColumn: Math.max(1, line.length),
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
            message: "Missing semicolon ';'",
            severity: 8,
          });
        }
      }
    }

    // 3. Java Class & File Name Matching Check
    if (language === 'java' && fileName.endsWith('.java')) {
      const cleanLine = line.replace(/\/\/.*/, '').trim();
      const publicClassMatch = cleanLine.match(/\bpublic\s+class\s+([A-Za-z0-9_]+)/);
      if (publicClassMatch) {
        const declaredClassName = publicClassMatch[1];
        const expectedClassName = fileName.replace(/^.*[/\\]/, '').replace(/\.java$/, '');
        if (declaredClassName !== expectedClassName) {
          markers.push({
            startLineNumber: lineNumber,
            startColumn: Math.max(1, line.indexOf(declaredClassName) + 1),
            endLineNumber: lineNumber,
            endColumn: line.indexOf(declaredClassName) + declaredClassName.length + 1,
            message: `Class '${declaredClassName}' is public, should be declared in a file named '${declaredClassName}.java'`,
            severity: 8,
          });
        }
      }
    }
  }

  // Any remaining unclosed brackets in stack
  for (const unclosed of bracketStack) {
    markers.push({
      startLineNumber: unclosed.line,
      startColumn: unclosed.col,
      endLineNumber: unclosed.line,
      endColumn: unclosed.col + 1,
      message: `Unclosed bracket '${unclosed.char}'`,
      severity: 8,
    });
  }

  return markers;
}

/**
 * Parse compilation stderr output into Monaco Editor markers.
 */
export function parseCompilerErrors(
  stderrText: string
): SyntaxMarker[] {
  const markers: SyntaxMarker[] = [];
  if (!stderrText) return markers;

  const lines = stderrText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. GCC/G++/Javac format: filename:line:col: error: message OR filename:line: error: message
    // e.g., solution.cpp:6:12: error: expected ';' before 'return'
    // e.g., Solution.java:5: error: ';' expected
    const gccJavacMatch = trimmed.match(/^(?:.*?[\/\\])?([^:\n]+):(\d+)(?::(\d+))?:\s*(?:fatal error|error|warning)?:\s*(.+)$/i);
    if (gccJavacMatch) {
      const errLine = parseInt(gccJavacMatch[2], 10);
      const errCol = gccJavacMatch[3] ? parseInt(gccJavacMatch[3], 10) : 1;
      const errMsg = gccJavacMatch[4].trim();

      markers.push({
        startLineNumber: errLine,
        startColumn: errCol,
        endLineNumber: errLine,
        endColumn: errCol + 10,
        message: errMsg,
        severity: 8,
      });
      continue;
    }

    // 2. Python traceback format: File "filename", line X, in ...
    const pythonMatch = trimmed.match(/File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+.+)?/i);
    if (pythonMatch) {
      const errLine = parseInt(pythonMatch[2], 10);
      markers.push({
        startLineNumber: errLine,
        startColumn: 1,
        endLineNumber: errLine,
        endColumn: 80,
        message: `Runtime/Syntax Error on line ${errLine}`,
        severity: 8,
      });
      continue;
    }

    // 3. Python specific error line: SyntaxError: invalid syntax / NameError: ...
    const pythonErrDetail = trimmed.match(/^([A-Za-z]+Error|Exception):\s*(.+)$/);
    if (pythonErrDetail && markers.length > 0) {
      // Attach detail to last python marker if created
      const lastMarker = markers[markers.length - 1];
      lastMarker.message = `${pythonErrDetail[1]}: ${pythonErrDetail[2]}`;
    }
  }

  return markers;
}

/**
 * Detect if a code string contains constructs that require standard input (stdin).
 */
export function doesCodeRequireStdin(codeStr: string): boolean {
  if (!codeStr) return false;
  const stdinPattern = /\b(cin\b|scanf\b|getline\b|getchar\b|fgetc\b|getc\b|fscanf\s*\(\s*stdin|std::cin\b|input\s*\(|sys\.stdin\b|Scanner\b|System\.in\b|BufferedReader\b|process\.stdin\b|readline\b|prompt\s*\(|fmt\.Scan|os\.Stdin|stdin\s*\(\s*\)|Console\.ReadLine|Console\.Read\b|fgets\s*\(\s*STDIN)/i;
  return stdinPattern.test(codeStr);
}

