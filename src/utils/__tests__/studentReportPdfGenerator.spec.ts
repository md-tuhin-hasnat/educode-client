import { generateStudentReportPdf, StudentReportData } from '../studentReportPdfGenerator';

// Mock jsPDF and jspdf-autotable
jest.mock('jspdf', () => {
  const saveMock = jest.fn();
  const textMock = jest.fn();
  const rectMock = jest.fn();
  const roundedRectMock = jest.fn();
  const setFontMock = jest.fn();
  const setFontSizeMock = jest.fn();
  const setTextColorMock = jest.fn();
  const setFillColorMock = jest.fn();
  const setDrawColorMock = jest.fn();
  const lineMock = jest.fn();
  const addPageMock = jest.fn();
  const setPageMock = jest.fn();
  const splitTextToSizeMock = jest.fn((text: string) => [text]);
  const getTextWidthMock = jest.fn((text: string) => text.length * 1.8);
  const getNumberOfPagesMock = jest.fn(() => 2);

  return jest.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
    save: saveMock,
    text: textMock,
    getTextWidth: getTextWidthMock,
    rect: rectMock,
    roundedRect: roundedRectMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    setFillColor: setFillColorMock,
    setDrawColor: setDrawColorMock,
    line: lineMock,
    addPage: addPageMock,
    setPage: setPageMock,
    splitTextToSize: splitTextToSizeMock,
    getNumberOfPages: getNumberOfPagesMock,
    lastAutoTable: { finalY: 100 },
  }));
});

jest.mock('jspdf-autotable', () => {
  return jest.fn((doc: any) => {
    doc.lastAutoTable = { finalY: 120 };
  });
});

describe('studentReportPdfGenerator', () => {
  it('should generate PDF report without throwing errors', async () => {
    const mockData: StudentReportData = {
      student: {
        id: 'student-1',
        fullName: 'John Doe',
        email: 'stu@university.edu',
        studentId: 'STU-2026-001',
        section: 'Section A',
      },
      assessment: {
        id: 'assessment-1',
        title: 'Lab 02 - Pointer Arithmetic & Dynamic Memory',
        type: 'LAB',
        courseCode: 'CSE-101',
        courseTitle: 'Structured Programming',
        maxTotalScore: 100,
      },
      instructorName: 'Dr. Alan Turing',
      totalScore: 50,
      maxTotalScore: 100,
      completedTasksCount: 1,
      totalTasksCount: 2,
      taskSubmissions: [
        {
          taskId: 'task-1',
          taskTitle: 'Problem A - Array Inversion with Pointers',
          maxPoints: 50,
          score: 50,
          status: 'submitted',
          language: 'cpp',
          codeSnapshot: '#include <iostream>\nusing namespace std;\nint main() { return 0; }',
          submittedAt: '2026-08-18T10:00:00Z',
          attemptCount: 1,
          integrityLogs: [
            {
              id: 1,
              eventType: 'SESSION_START',
              occurredAt: '2026-08-18T10:00:00Z',
              details: 'IDE Secure Exam Session Initialized',
              severity: 'INFO',
            },
          ],
        },
      ],
    };

    await expect(generateStudentReportPdf(mockData)).resolves.not.toThrow();
  });

  it('should tokenize C++ code lines with keywords, strings, and comments', () => {
    const { tokenizeCodeLine } = require('../studentReportPdfGenerator');
    const tokens = tokenizeCodeLine('int main() { cout << "Hello World"; return 0; } // end', 'cpp');
    expect(tokens.length).toBeGreaterThan(0);
    const hasKeyword = tokens.some((t: any) => t.text === 'return' || t.text === 'int');
    expect(hasKeyword).toBe(true);
    const hasString = tokens.some((t: any) => t.text.includes('Hello World'));
    expect(hasString).toBe(true);
  });

  it('should tokenize Python code lines with keywords and comments', () => {
    const { tokenizeCodeLine } = require('../studentReportPdfGenerator');
    const tokens = tokenizeCodeLine('def solve(arr): # compute sum\n    return sum(arr)', 'python');
    expect(tokens.length).toBeGreaterThan(0);
    const hasDef = tokens.some((t: any) => t.text === 'def');
    expect(hasDef).toBe(true);
  });
});
