import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TestCaseRunnerPanel from '../TestCaseRunnerPanel';
import { TestCaseInput, TestSuiteSummary } from '@/utils/testCaseRunner';

describe('TestCaseRunnerPanel Component', () => {
  const mockTestCases: TestCaseInput[] = [
    { id: '1', order: 1, inputData: '5\n1 2 3 4 5', expectedOutput: '5 4 3 2 1', points: 25 },
    { id: '2', order: 2, inputData: '3\n10 20 30', expectedOutput: '30 20 10', points: 25 },
    { id: '3', order: 3, inputData: '1\n99', expectedOutput: '99', points: 25, isHidden: true },
    { id: '4', order: 4, inputData: '4\n2 4 6 8', expectedOutput: '8 6 4 2', points: 25, isHidden: true },
  ];

  const mockSummary: TestSuiteSummary = {
    totalCount: 4,
    passedCount: 3,
    failedCount: 1,
    totalPoints: 100,
    earnedPoints: 75,
    totalTimeMs: 120,
    status: 'PARTIAL_PASSED',
    results: [
      {
        testCaseId: '1',
        order: 1,
        inputData: '5\n1 2 3 4 5',
        expectedOutput: '5 4 3 2 1',
        actualOutput: '5 4 3 2 1',
        status: 'PASSED',
        passed: true,
        timeMs: 25,
        points: 25,
        maxPoints: 25,
        logMessage: 'pass 1/4',
      },
      {
        testCaseId: '2',
        order: 2,
        inputData: '3\n10 20 30',
        expectedOutput: '30 20 10',
        actualOutput: '30 20 10',
        status: 'PASSED',
        passed: true,
        timeMs: 30,
        points: 25,
        maxPoints: 25,
        logMessage: 'pass 2/4',
      },
      {
        testCaseId: '3',
        order: 3,
        inputData: '1\n99',
        expectedOutput: '99',
        actualOutput: '99',
        status: 'PASSED',
        passed: true,
        timeMs: 28,
        points: 25,
        maxPoints: 25,
        isHidden: true,
        logMessage: 'pass 3/4',
      },
      {
        testCaseId: '4',
        order: 4,
        inputData: '4\n2 4 6 8',
        expectedOutput: '8 6 4 2',
        actualOutput: '2 4 6 8',
        status: 'WRONG_ANSWER',
        passed: false,
        timeMs: 37,
        points: 0,
        maxPoints: 25,
        isHidden: true,
        logMessage: 'wrong answer on test case 4',
      },
    ],
    logs: [
      '🚀 Starting evaluation on 4 test cases...',
      '✅ pass 1/4 (25ms)',
      '✅ pass 2/4 (30ms)',
      '✅ pass 3/4 (28ms)',
      '❌ wrong answer on test case 4',
      '🏁 Evaluation finished: 3/4 passed • 75/100 pts (120ms)',
    ],
  };

  it('renders test cases list and executes run all when clicked', () => {
    const handleRunAll = jest.fn();
    render(
      <TestCaseRunnerPanel
        testCases={mockTestCases}
        summary={null}
        isRunning={false}
        onRunAll={handleRunAll}
        timeLimitMs={2000}
        memoryLimitMb={512}
      />
    );

    expect(screen.getByText('Test Suite Evaluation')).toBeInTheDocument();
    expect(screen.getByText('2s')).toBeInTheDocument();
    expect(screen.getByText('512 MB')).toBeInTheDocument();
    const runBtn = screen.getByRole('button', { name: /run all/i });
    expect(runBtn).toBeInTheDocument();
    fireEvent.click(runBtn);
    expect(handleRunAll).toHaveBeenCalledTimes(1);
  });

  it('displays progressive test results correctly with pass and fail logs', () => {
    render(
      <TestCaseRunnerPanel
        testCases={mockTestCases}
        summary={mockSummary}
        isRunning={false}
        onRunAll={jest.fn()}
      />
    );

    expect(screen.getByText('3/4 Passed (75%)')).toBeInTheDocument();
    expect(screen.getByText('75/100 pts')).toBeInTheDocument();
    expect(screen.getByText('✅ pass 1/4 (25ms)')).toBeInTheDocument();
    expect(screen.getByText('✅ pass 2/4 (30ms)')).toBeInTheDocument();
    expect(screen.getByText('✅ pass 3/4 (28ms)')).toBeInTheDocument();
    expect(screen.getByText('❌ wrong answer on test case 4')).toBeInTheDocument();
  });

  it('allows running only pretests when onRunCategory is provided', () => {
    const handleRunCategory = jest.fn();
    const testCasesWithPretests: TestCaseInput[] = [
      { id: '1', order: 1, inputData: '1', expectedOutput: '1', points: 10, testType: 'SAMPLE' },
      { id: '2', order: 2, inputData: '2', expectedOutput: '2', points: 10, testType: 'PRETEST' },
    ];

    render(
      <TestCaseRunnerPanel
        testCases={testCasesWithPretests}
        summary={null}
        isRunning={false}
        onRunAll={jest.fn()}
        onRunCategory={handleRunCategory}
      />
    );

    const pretestBtn = screen.getByRole('button', { name: /run pretests/i });
    expect(pretestBtn).toBeInTheDocument();
    fireEvent.click(pretestBtn);
    expect(handleRunCategory).toHaveBeenCalledWith('PRETEST');
  });
});
