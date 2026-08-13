import { validateCodeSyntax, parseCompilerErrors } from './syntaxValidator';

describe('syntaxValidator', () => {
  describe('validateCodeSyntax', () => {
    it('returns empty markers for valid code', () => {
      const code = `
#include <iostream>
int main() {
    std::cout << "Hello World" << std::endl;
    return 0;
}
`;
      const markers = validateCodeSyntax(code, 'cpp', 'main.cpp');
      expect(markers).toHaveLength(0);
    });

    it('detects unclosed brackets and unmatched closing brackets', () => {
      const code = `int main() { int x = (5 + 3; `;
      const markers = validateCodeSyntax(code, 'cpp', 'main.cpp');
      expect(markers.some((m) => m.message.includes('Unclosed bracket'))).toBe(true);
    });

    it('detects missing semicolon in C/C++/Java', () => {
      const code = `
int main() {
    int a = 10
    return 0;
}
`;
      const markers = validateCodeSyntax(code, 'c', 'main.c');
      expect(markers.some((m) => m.message.includes("Missing semicolon ';'"))).toBe(true);
    });

    it('detects Java public class name and filename mismatch', () => {
      const code = `
public class WrongName {
    public static void main(String[] args) {}
}
`;
      const markers = validateCodeSyntax(code, 'java', 'CorrectName.java');
      expect(markers.some((m) => m.message.includes("should be declared in a file named 'WrongName.java'"))).toBe(true);
    });

    it('does not trigger Java filename mismatch if class name matches file name', () => {
      const code = `
public class CorrectName {
    public static void main(String[] args) {}
}
`;
      const markers = validateCodeSyntax(code, 'java', 'CorrectName.java');
      expect(markers.filter((m) => m.message.includes('should be declared in a file'))).toHaveLength(0);
    });
  });

  describe('parseCompilerErrors', () => {
    it('parses GCC/G++ error messages into Monaco markers', () => {
      const stderr = `solution.cpp:6:12: error: expected ';' before 'return'`;
      const markers = parseCompilerErrors(stderr);
      expect(markers).toHaveLength(1);
      expect(markers[0].startLineNumber).toBe(6);
      expect(markers[0].startColumn).toBe(12);
      expect(markers[0].message).toContain("expected ';' before 'return'");
    });

    it('parses Javac error messages into Monaco markers', () => {
      const stderr = `Solution.java:5: error: ';' expected\n        int a = 10`;
      const markers = parseCompilerErrors(stderr);
      expect(markers.some((m) => m.startLineNumber === 5 && m.message.includes("';' expected"))).toBe(true);
    });

    it('parses Python traceback errors into Monaco markers', () => {
      const stderr = `File "solution.py", line 4, in <module>\nSyntaxError: invalid syntax`;
      const markers = parseCompilerErrors(stderr);
      expect(markers).toHaveLength(1);
      expect(markers[0].startLineNumber).toBe(4);
      expect(markers[0].message).toContain('SyntaxError: invalid syntax');
    });
  });
});
