'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faPlay,
  faRotateRight,
  faFlask,
  faVial,
  faPlus,
  faTimes,
  faScaleBalanced,
} from '@fortawesome/free-solid-svg-icons';
import { TestCaseInput, TestCaseResult, TestSuiteSummary } from '@/utils/testCaseRunner';
import { CheckerConfig } from '@/utils/testCaseChecker';

import { RunnerFilter, TestCaseRunnerPanelProps } from './test-runner/types';
import { TestCaseFilterBar } from './test-runner/TestCaseFilterBar';
import { TestCaseResultCard } from './test-runner/TestCaseResultCard';
import { AddCustomTestCaseModal } from './test-runner/AddCustomTestCaseModal';
import { LiveTestLogsView } from './test-runner/LiveTestLogsView';

export default function TestCaseRunnerPanel({
  testCases,
  summary,
  isRunning,
  onRunAll,
  onRunCategory,
  onClose,
  onAddCustomTestCase,
  checkerConfig,
  timeLimitMs = 1000,
  memoryLimitMb = 256,
}: TestCaseRunnerPanelProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState<RunnerFilter>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const sampleCount = testCases.filter(
    (t) => (t.testType || (!t.isHidden ? 'SAMPLE' : 'PRETEST')) === 'SAMPLE'
  ).length;
  const pretestCount = testCases.filter(
    (t) => (t.testType || (t.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST'
  ).length;

  const totalCount = testCases.length;
  const passedCount = summary?.passedCount ?? 0;
  const earnedPoints = summary?.earnedPoints ?? 0;
  const totalPoints =
    summary?.totalPoints ?? testCases.reduce((acc, t) => acc + (t.points ?? 10), 0);
  const passPercent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const filteredResults = summary?.results.filter((r) => {
    if (filter === 'PASSED') return r.passed;
    if (filter === 'FAILED') return !r.passed;
    if (filter === 'SAMPLE') return (r.testType || (!r.isHidden ? 'SAMPLE' : 'PRETEST')) === 'SAMPLE';
    if (filter === 'PRETEST') return (r.testType || (r.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#141414] text-slate-200 border-t border-slate-800 select-text overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-12 bg-slate-900/90 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="flex items-center space-x-3 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faFlask} className="text-brand-400" />
              <span>Test Suite Evaluation</span>
            </span>
          </div>

          {/* Time Limit & Memory Limit Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <FontAwesomeIcon icon={faClock} className="text-[10px]" />
            <span>{timeLimitMs / 1000}s</span>
            <span className="text-slate-500">•</span>
            <span>{memoryLimitMb} MB</span>
          </div>

          {summary && (
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  summary.passedCount === summary.totalCount
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : summary.passedCount > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {summary.passedCount}/{summary.totalCount} Passed ({passPercent}%)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                {earnedPoints}/{totalPoints} pts
              </span>
            </div>
          )}

          {checkerConfig && (
            <div className="hidden lg:flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-800/80 border-slate-700 text-slate-300">
              <FontAwesomeIcon icon={faScaleBalanced} className="text-brand-400 text-[10px]" />
              <span>
                {checkerConfig.type === 'FLOAT_TOLERANCE'
                  ? `Float (ε ≤ ${checkerConfig.floatTolerance ?? 1e-6})`
                  : checkerConfig.type === 'CASE_INSENSITIVE'
                  ? 'Case-Insensitive'
                  : checkerConfig.type === 'UNORDERED_TOKENS'
                  ? 'Tokens Multiset'
                  : checkerConfig.type === 'CUSTOM_SCRIPT'
                  ? 'Polygon Checker'
                  : 'Exact Match'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          {onAddCustomTestCase && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center space-x-1 transition-colors"
              title="Add Custom Test Case"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              <span>Add Test</span>
            </button>
          )}

          {onRunCategory && sampleCount > 0 && (
            <button
              onClick={() => onRunCategory('SAMPLE')}
              disabled={isRunning}
              className="px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center space-x-1 transition-all border border-emerald-500/40"
              title="Run sample test cases only"
            >
              <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
              <span>Run Samples ({sampleCount})</span>
            </button>
          )}

          {onRunCategory && pretestCount > 0 && (
            <button
              onClick={() => onRunCategory('PRETEST')}
              disabled={isRunning}
              className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center space-x-1 transition-all border border-amber-500/40"
              title="Run hidden pretests to verify solution before submission"
            >
              <FontAwesomeIcon icon={faVial} className="text-[9px]" />
              <span>Run Pretests ({pretestCount})</span>
            </button>
          )}

          <button
            onClick={onRunAll}
            disabled={isRunning || testCases.length === 0}
            className="px-3.5 py-1 rounded bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all"
          >
            <FontAwesomeIcon
              icon={isRunning ? faRotateRight : faPlay}
              className={`text-[10px] ${isRunning ? 'animate-spin' : ''}`}
            />
            <span>{isRunning ? 'Running...' : 'Run All'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Close Test Runner"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Real-time Live Log Box */}
        <LiveTestLogsView
          summary={summary}
          isRunning={isRunning}
          passPercent={passPercent}
        />

        {/* Right Side: Expandable Test Case Results List */}
        <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
          {/* Filter Bar */}
          <TestCaseFilterBar
            filter={filter}
            setFilter={setFilter}
            testCases={testCases}
            summary={summary}
          />

          {/* Test Case Cards List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {testCases.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FontAwesomeIcon icon={faVial} className="text-3xl mb-2 text-slate-600" />
                <p className="text-xs">No test cases found for this task.</p>
              </div>
            ) : summary?.results && summary.results.length > 0 ? (
              filteredResults?.map((res, idx) => (
                <TestCaseResultCard
                  key={res.testCaseId || idx}
                  result={res}
                  isExpanded={expandedId === res.testCaseId}
                  onToggleExpand={() => toggleExpand(res.testCaseId)}
                />
              ))
            ) : (
              /* Initial state before execution */
              testCases.map((tc, idx) => {
                const isPretest = (tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST';
                const isSystem = tc.testType === 'SYSTEM';
                return (
                  <div
                    key={tc.id || idx}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
                        {tc.order ?? idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">
                            {isPretest ? `Pretest #${tc.order ?? idx + 1}` : isSystem ? `System Test #${tc.order ?? idx + 1}` : `Sample #${tc.order ?? idx + 1}`}
                          </span>
                          {isPretest ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                              Pretest
                            </span>
                          ) : isSystem ? (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                              System Test
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                              Sample
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {isPretest ? 'Hidden pretest case' : tc.inputData ? `Input: ${tc.inputData.slice(0, 30)}...` : 'Standard input'}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                      {tc.points ?? 10} pts
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Test Case Modal */}
      <AddCustomTestCaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(tc) => onAddCustomTestCase?.(tc)}
        order={testCases.length + 1}
      />
    </div>
  );
}
