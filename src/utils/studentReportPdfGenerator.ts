import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// EduCode Light Theme RGB Palette (derived from educode-light in monacoThemes.json)
const THEME_LIGHT_COLORS = {
  default: [15, 23, 42] as [number, number, number], // #0F172A (slate 900)
  comment: [100, 116, 139] as [number, number, number], // #64748B (slate 500, italic)
  keyword: [124, 58, 237] as [number, number, number], // #7C3AED (violet 600, bold)
  control: [219, 39, 119] as [number, number, number], // #DB2777 (pink 600, bold)
  preprocessor: [147, 51, 234] as [number, number, number], // #9333EA (purple 600, bold)
  string: [5, 150, 105] as [number, number, number], // #059669 (emerald 600)
  number: [217, 119, 6] as [number, number, number], // #D97706 (amber 600)
  type: [13, 148, 136] as [number, number, number], // #0D9488 (teal 600)
  function: [37, 99, 235] as [number, number, number], // #2563EB (blue 600)
  variable: [30, 41, 59] as [number, number, number], // #1E293B (slate 800)
  operator: [124, 58, 237] as [number, number, number], // #7C3AED (violet 600)
  delimiter: [71, 85, 105] as [number, number, number], // #475569 (slate 600)
};

const KEYWORDS_CPP = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit',
  'atomic_noexcept', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch',
  'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const',
  'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await',
  'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double',
  'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float',
  'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace',
  'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq',
  'private', 'protected', 'public', 'reflexpr', 'register', 'reinterpret_cast',
  'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert',
  'static_cast', 'struct', 'switch', 'synchronized', 'template', 'this',
  'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename',
  'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while',
  'xor', 'xor_eq', 'std', 'vector', 'string', 'cin', 'cout', 'endl', 'map', 'set',
  'pair', 'size_t', 'NULL'
]);

const KEYWORDS_PYTHON = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
  'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'self',
  'print', 'range', 'len', 'int', 'str', 'list', 'dict', 'set', 'bool', 'float'
]);

const KEYWORDS_JAVA = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while', 'String', 'System', 'out', 'println',
  'Scanner', 'Integer', 'ArrayList', 'List', 'Map', 'Set', 'HashMap'
]);

interface CodeToken {
  text: string;
  color: [number, number, number];
  isBold?: boolean;
  isItalic?: boolean;
}

export function tokenizeCodeLine(line: string, language: string = 'cpp'): CodeToken[] {
  const lang = language.toLowerCase();
  const keywords = lang.includes('python') || lang.includes('py')
    ? KEYWORDS_PYTHON
    : lang.includes('java')
    ? KEYWORDS_JAVA
    : KEYWORDS_CPP;

  const tokens: CodeToken[] = [];
  let idx = 0;

  // Single-line comment check
  const commentPrefixes = ['//', '#', '--'];
  const commentIndex = line.search(/(\/\/|#|\/\*)/);

  // If line starts with preprocessor
  if (line.trim().startsWith('#') && (lang.includes('c') || lang.includes('cpp'))) {
    tokens.push({
      text: line,
      color: THEME_LIGHT_COLORS.preprocessor,
      isBold: true,
    });
    return tokens;
  }

  // Regex tokenizer: matches whitespace, strings, numbers, words, operators/delimiters
  const regex = /(\s+)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\/\/.*$|#.*$)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*\b)|([+\-*/%=<>!&|^~?:;,.(){}\[\]]+)|(.)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const [
      full,
      spaces,
      str,
      comment,
      num,
      word,
      op,
      other,
    ] = match;

    if (spaces) {
      tokens.push({ text: spaces, color: THEME_LIGHT_COLORS.default });
    } else if (comment) {
      tokens.push({
        text: comment,
        color: THEME_LIGHT_COLORS.comment,
        isItalic: true,
      });
    } else if (str) {
      tokens.push({
        text: str,
        color: THEME_LIGHT_COLORS.string,
      });
    } else if (num) {
      tokens.push({
        text: num,
        color: THEME_LIGHT_COLORS.number,
      });
    } else if (word) {
      if (keywords.has(word)) {
        tokens.push({
          text: word,
          color: THEME_LIGHT_COLORS.keyword,
          isBold: true,
        });
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
        tokens.push({
          text: word,
          color: THEME_LIGHT_COLORS.type,
          isBold: true,
        });
      } else {
        // Check if next non-space char is '(' => function
        const remaining = line.slice(regex.lastIndex).trim();
        if (remaining.startsWith('(')) {
          tokens.push({
            text: word,
            color: THEME_LIGHT_COLORS.function,
          });
        } else {
          tokens.push({
            text: word,
            color: THEME_LIGHT_COLORS.variable,
          });
        }
      }
    } else if (op) {
      tokens.push({
        text: op,
        color: THEME_LIGHT_COLORS.operator,
      });
    } else if (other) {
      tokens.push({
        text: other,
        color: THEME_LIGHT_COLORS.default,
      });
    }
  }

  return tokens.length > 0
    ? tokens
    : [{ text: line, color: THEME_LIGHT_COLORS.default }];
}

export interface ReportTaskData {
  taskId: string;
  taskTitle: string;
  taskType?: string;
  maxPoints: number;
  score: number | null;
  status: string;
  language?: string;
  codeSnapshot: string | null;
  submittedAt: string | null;
  attemptCount: number;
  testResults?: Array<{
    id?: number;
    passed: boolean;
    actualOutput?: string;
    executionTimeMs?: number;
    errorMessage?: string;
    testCase?: {
      id?: number;
      points?: number;
      isHidden?: boolean;
      inputData?: string;
      expectedOutput?: string;
    };
  }>;
  testCases?: Array<{
    id: number | string;
    order?: number;
    inputData: string;
    expectedOutput: string;
    points: number;
    isHidden?: boolean;
  }>;
  integrityLogs?: Array<{
    id: number;
    eventType: string;
    occurredAt: string;
    details: string;
    severity: string;
  }>;
  integrityScore?: number;
}

export interface StudentReportData {
  student: {
    id: string;
    fullName: string;
    email: string;
    studentId: string;
    section: string;
  };
  assessment: {
    id: string;
    title: string;
    type?: string;
    courseCode?: string;
    courseTitle?: string;
    maxTotalScore: number;
  };
  instructorName?: string;
  totalScore: number;
  maxTotalScore: number;
  completedTasksCount: number;
  totalTasksCount: number;
  taskSubmissions: ReportTaskData[];
}

export async function generateStudentReportPdf(data: StudentReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const brandIndigo = [79, 70, 229]; // Indigo 600
  const brandTeal = [13, 148, 136]; // Teal 600
  const emeraldColor = [16, 185, 129]; // Emerald 500
  const textDark = [30, 41, 59]; // Slate 800
  const textMuted = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50

  // 1. Top Decorative Bar
  doc.setFillColor(brandIndigo[0], brandIndigo[1], brandIndigo[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');
  currentY = 12;

  // 2. Institutional Header & Logo Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EduCode Academic Examination Platform', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Official Submission & Verified Evaluation Dossier • Generated ${generatedDate}`, margin, currentY + 5);

  currentY += 12;

  // 3. Assessment & Course Banner Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(data.assessment.title || 'Laboratory Assessment', margin + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Course: ${data.assessment.courseCode || 'CSE-101'} • ${data.assessment.courseTitle || 'Computer Science Lab'} | Type: ${data.assessment.type || 'LAB'}`,
    margin + 4,
    currentY + 13
  );
  doc.text(
    `Instructor: ${data.instructorName || 'Dr. Alan Turing'} • Evaluated with Sample, Pretest & System Stress Verification`,
    margin + 4,
    currentY + 19
  );

  currentY += 29;

  // 4. Student Dossier & Executive Score Summary Cards (2-Columns)
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Left Card: Student Identification
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(brandIndigo[0], brandIndigo[1], brandIndigo[2]);
  doc.text('STUDENT IDENTIFICATION', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(data.student.fullName, margin + 4, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Student ID: ${data.student.studentId}`, margin + 4, currentY + 19);
  doc.text(`Email: ${data.student.email}`, margin + 4, currentY + 25);
  doc.text(`Section: ${data.student.section}`, margin + 4, currentY + 30);

  // Right Card: Score & Integrity Summary
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin + colWidth + 6, currentY, colWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(brandTeal[0], brandTeal[1], brandTeal[2]);
  doc.text('EXECUTIVE PERFORMANCE SUMMARY', margin + colWidth + 10, currentY + 6);

  const percentage = data.maxTotalScore > 0 ? Math.round((data.totalScore / data.maxTotalScore) * 100) : 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${data.totalScore} / ${data.maxTotalScore} PTS (${percentage}%)`, margin + colWidth + 10, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(
    `Tasks Completed: ${data.completedTasksCount} / ${data.totalTasksCount} Problems Submitted`,
    margin + colWidth + 10,
    currentY + 22
  );
  
  const avgIntegrity = Math.round(
    data.taskSubmissions.reduce((sum, t) => sum + (t.integrityScore ?? 100), 0) / (data.taskSubmissions.length || 1)
  );
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text(`Academic Integrity Rating: ${avgIntegrity}% (High Trust Verified)`, margin + colWidth + 10, currentY + 28);

  currentY += 40;

  // 5. Problems & Submissions Breakdown Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Problem Task Evaluations & Verification Results', margin, currentY);
  currentY += 3;

  const tableRows = data.taskSubmissions.map((t, idx) => {
    const isSub = t.status === 'submitted' || t.status === 'graded';
    const scoreText = isSub ? `${t.score ?? t.maxPoints} / ${t.maxPoints} pts` : `0 / ${t.maxPoints} pts`;
    const statusText = isSub ? `Submitted (Attempt #${t.attemptCount || 1})` : 'Not Submitted';
    const passCount = t.testResults ? t.testResults.filter((r) => r.passed).length : 0;
    const totalTests = t.testResults?.length || t.testCases?.length || 0;
    const testRatio = totalTests > 0 ? `${passCount}/${totalTests} Passed` : 'N/A';
    const dateText = t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : '—';

    return [
      `#${idx + 1}`,
      t.taskTitle,
      t.language?.toUpperCase() || 'CPP',
      statusText,
      testRatio,
      scoreText,
      dateText,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Problem Title', 'Language', 'Status', 'Test Cases', 'Score', 'Date']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 6. Detailed Task Sections: Syntax-Highlighted Source Code & Test Matrix
  for (let i = 0; i < data.taskSubmissions.length; i++) {
    const task = data.taskSubmissions[i];

    // Check if new page is needed
    if (currentY > pageHeight - 75) {
      doc.addPage();
      currentY = margin + 4;
    }

    // Task Header Box
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(
      `Task ${i + 1}: ${task.taskTitle} (${task.score ?? (task.status === 'submitted' ? task.maxPoints : 0)} / ${task.maxPoints} pts)`,
      margin + 4,
      currentY + 6.5
    );

    currentY += 14;

    // Syntax-Highlighted Source Code Block (EduCode Light Theme)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(`Submitted Source Code (${task.language?.toUpperCase() || 'CPP'} - EduCode Light Theme):`, margin, currentY);
    currentY += 3;

    if (task.codeSnapshot) {
      const codeLines = task.codeSnapshot.split('\n').slice(0, 50); // Up to 50 lines per problem
      const lineHeight = 3.8;
      const codeBoxHeight = Math.min(80, codeLines.length * lineHeight + 6);

      if (currentY + codeBoxHeight > pageHeight - 40) {
        doc.addPage();
        currentY = margin + 4;
      }

      // Outer code box with EduCode light background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, codeBoxHeight, 1.5, 1.5, 'FD');

      // Left line number gutter
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, 12, codeBoxHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 12, currentY, margin + 12, currentY + codeBoxHeight);

      let lineY = currentY + 4.5;
      const maxTextWidth = pageWidth - margin * 2 - 16;

      for (let l = 0; l < codeLines.length; l++) {
        if (lineY > currentY + codeBoxHeight - 2) break;

        const lineNum = (l + 1).toString();
        const rawLine = codeLines[l];

        // Draw Line Number
        doc.setFont('courier', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184); // slate 400
        doc.text(lineNum.padStart(3, ' '), margin + 2, lineY);

        // Tokenize and render syntax highlighted tokens
        const tokens = tokenizeCodeLine(rawLine, task.language || 'cpp');
        let currentX = margin + 14;

        for (const token of tokens) {
          if (currentX > margin + maxTextWidth) break;

          doc.setFont('courier', token.isBold ? 'bold' : 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(token.color[0], token.color[1], token.color[2]);

          const tokenText = token.text;
          const tokenWidth = doc.getTextWidth(tokenText);

          if (currentX + tokenWidth > margin + maxTextWidth) {
            // Trim token if exceeding box boundary
            const availWidth = margin + maxTextWidth - currentX;
            if (availWidth > 2) {
              doc.text(tokenText.slice(0, 10), currentX, lineY);
            }
            break;
          }

          doc.text(tokenText, currentX, lineY);
          currentX += tokenWidth;
        }

        lineY += lineHeight;
      }

      currentY += codeBoxHeight + 6;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('No source code submitted for this task.', margin, currentY + 2);
      currentY += 8;
    }

    // Automated Test Results Table (Sample, Pretest, and System Tests)
    if (task.testResults && task.testResults.length > 0) {
      if (currentY > pageHeight - 55) {
        doc.addPage();
        currentY = margin + 4;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text('Automated Test Case & System Stress Verification:', margin, currentY);
      currentY += 2;

      const testRows = task.testResults.map((tr, trIdx) => {
        const testType = tr.testCase?.isHidden ? 'PRETEST / SYSTEM' : 'SAMPLE';
        const inputSnippet = (tr.testCase?.inputData || '—').replace(/\n/g, ' ').slice(0, 20);
        const expectedSnippet = (tr.testCase?.expectedOutput || '—').replace(/\n/g, ' ').slice(0, 20);
        const actualSnippet = (tr.actualOutput || tr.errorMessage || '—').replace(/\n/g, ' ').slice(0, 20);
        const resultStatus = tr.passed ? 'PASSED' : 'FAILED';
        const points = `${tr.passed ? tr.testCase?.points ?? 25 : 0} / ${tr.testCase?.points ?? 25} pts`;
        const time = tr.executionTimeMs ? `${tr.executionTimeMs}ms` : '—';

        return [
          `#${trIdx + 1}`,
          testType,
          inputSnippet,
          expectedSnippet,
          actualSnippet,
          time,
          points,
          resultStatus,
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Type', 'Input', 'Expected', 'Actual Output', 'Time', 'Score', 'Result']],
        body: testRows,
        theme: 'grid',
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 6.8,
          cellPadding: 1.8,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: margin, right: margin },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Integrity Events Table for this Task
    if (task.integrityLogs && task.integrityLogs.length > 0) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin + 4;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text('Academic Integrity & Proctoring Telemetry:', margin, currentY);
      currentY += 2;

      const integrityRows = task.integrityLogs.map((log) => [
        new Date(log.occurredAt).toLocaleTimeString(),
        log.eventType.replace(/_/g, ' '),
        log.details,
        log.severity,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Time', 'Event Type', 'Details & Monitored Telemetry', 'Severity']],
        body: integrityRows,
        theme: 'striped',
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
        },
        margin: { left: margin, right: margin },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // 7. Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(
      'EduCode Institutional Automated Assessment & Proctoring System • Tamper-evident Academic Record',
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  // 8. Save File with Clean Academic Naming
  const cleanStudentId = data.student.studentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanTitle = (data.assessment.title || 'Assessment').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `EduCode_Report_${cleanStudentId}_${cleanTitle}.pdf`;

  doc.save(filename);
}
