'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faClock,
  faPlay,
  faRotateRight,
  faChevronDown,
  faChevronRight,
  faFlask,
  faVial,
  faTerminal,
  faEyeSlash,
  faPlus,
  faTimes,
  faCheck,
  faCopy,
} from '@fortawesome/free-solid-svg-icons';
import {
  TestCaseInput,
  TestCaseResult,
  TestSuiteSummary,
} from '@/utils/testCaseRunner';

interface TestCaseRunnerPanelProps {
  testCases: TestCaseInput[];
  summary: TestSuiteSummary | null;
  isRunning: boolean;
  onRunAll: () => void;
  onClose?: () => void;
  onAddCustomTestCase?: (tc: TestCaseInput) => void;
}

export default function TestCaseRunnerPanel({
  testCases,
  summary,
  isRunning,
  onRunAll,
  onClose,
  onAddCustomTestCase,
}: TestCaseRunnerPanelProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  const [customPoints, setCustomPoints] = useState('10');
  const [copiedLog, setCopiedLog] = useState(false);

  const toggleExpand = (id: string | number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredResults = summary?.results.filter((r) => {
    if (filter === 'PASSED') return r.passed;
    if (filter === 'FAILED') return !r.passed;
    return true;
  });

  const handleCopyLogs = () => {
    if (!summary?.logs?.length) return;
    navigator.clipboard.writeText(summary.logs.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddCustomTestCase) return;
    const newTc: TestCaseInput = {
      id: `custom_${Date.now()}`,
      inputData: customInput,
      expectedOutput: customExpected,
      points: parseInt(customPoints, 10) || 10,
      isHidden: false,
      order: testCases.length + 1,
    };
    onAddCustomTestCase(newTc);
    setCustomInput('');
    setCustomExpected('');
    setIsAddModalOpen(false);
  };

  const totalCount = testCases.length;
  const passedCount = summary?.passedCount ?? 0;
  const earnedPoints = summary?.earnedPoints ?? 0;
  const totalPoints =
    summary?.totalPoints ?? testCases.reduce((acc, t) => acc + (t.points ?? 10), 0);
  const passPercent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#141414] text-slate-200 border-t border-slate-800 select-text overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-11 bg-slate-900/90 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faFlask} className="text-brand-400" />
              <span>Test Suite Evaluation</span>
            </span>
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
        </div>

        <div className="flex items-center space-x-2">
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

          <button
            onClick={onRunAll}
            disabled={isRunning || testCases.length === 0}
            className="px-3.5 py-1 rounded bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-brand-600/30 flex items-center space-x-1.5 transition-all"
          >
            <FontAwesomeIcon
              icon={isRunning ? faRotateRight : faPlay}
              className={`text-[10px] ${isRunning ? 'animate-spin' : ''}`}
            />
            <span>{isRunning ? 'Running Tests...' : 'Run All Test Cases'}</span>
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
        <div className="w-full md:w-80 border-r border-slate-800 bg-[#0f0f0f] flex flex-col shrink-0">
          <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faTerminal} className="text-slate-500" />
              <span>Live Test Logs</span>
            </span>
            {summary?.logs && summary.logs.length > 0 && (
              <button
                onClick={handleCopyLogs}
                className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
                title="Copy all test output logs"
              >
                <FontAwesomeIcon icon={copiedLog ? faCheck : faCopy} />
                <span>{copiedLog ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5">
            {summary?.logs && summary.logs.length > 0 ? (
              summary.logs.map((log, idx) => {
                const isPass = log.includes('✅') || log.toLowerCase().startsWith('pass');
                const isFail = log.includes('❌') || log.toLowerCase().includes('wrong answer') || log.toLowerCase().includes('error');
                const isSummary = log.includes('🏁');

                return (
                  <div
                    key={idx}
                    className={`py-0.5 px-1.5 rounded transition-colors ${
                      isPass
                        ? 'text-emerald-400 bg-emerald-950/20'
                        : isFail
                        ? 'text-rose-400 bg-rose-950/20 font-bold'
                        : isSummary
                        ? 'text-brand-300 font-bold bg-brand-950/30 border border-brand-800/40 mt-2'
                        : 'text-slate-400'
                    }`}
                  >
                    {log}
                  </div>
                );
              })
            ) : isRunning ? (
              <div className="flex items-center space-x-2 text-amber-400 animate-pulse">
                <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-xs" />
                <span>Executing test cases sequentially...</span>
              </div>
            ) : (
              <div className="text-slate-600 italic text-[11px] py-4 text-center">
                Click &quot;Run All Test Cases&quot; to begin evaluation.
              </div>
            )}
          </div>

          {/* Quick Progress Bar */}
          {summary && (
            <div className="p-2.5 bg-slate-900/80 border-t border-slate-800">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Progress</span>
                <span className="font-bold text-white">{passPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    passPercent === 100
                      ? 'bg-emerald-500'
                      : passPercent > 0
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${passPercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Expandable Test Case Results List */}
        <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
          {/* Filter Bar */}
          <div className="p-2 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-1 text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filter === 'ALL'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({summary?.results?.length ?? testCases.length})
              </button>
              <button
                onClick={() => setFilter('PASSED')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filter === 'PASSED'
                    ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/50'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                Passed ({summary?.passedCount ?? 0})
              </button>
              <button
                onClick={() => setFilter('FAILED')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filter === 'FAILED'
                    ? 'bg-rose-950/60 text-rose-300 font-bold border border-rose-800/50'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                Failed ({summary?.failedCount ?? 0})
              </button>
            </div>
          </div>

          {/* Test Case Cards List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {testCases.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FontAwesomeIcon icon={faVial} className="text-3xl mb-2 text-slate-600" />
                <p className="text-xs">No test cases found for this task.</p>
              </div>
            ) : summary?.results && summary.results.length > 0 ? (
              filteredResults?.map((res, idx) => {
                const isExpanded = expandedId === res.testCaseId;
                const isPass = res.passed;

                return (
                  <div
                    key={res.testCaseId || idx}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isPass
                        ? 'border-emerald-900/40 bg-emerald-950/10'
                        : 'border-rose-900/40 bg-rose-950/10'
                    }`}
                  >
                    {/* Card Summary Header */}
                    <div
                      onClick={() => toggleExpand(res.testCaseId)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FontAwesomeIcon
                          icon={isExpanded ? faChevronDown : faChevronRight}
                          className="text-xs text-slate-500 w-3"
                        />
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                            isPass
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={
                              isPass
                                ? faCheckCircle
                                : res.status === 'TIME_LIMIT_EXCEEDED'
                                ? faClock
                                : res.status === 'COMPILATION_ERROR'
                                ? faExclamationTriangle
                                : faTimesCircle
                            }
                          />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">
                              Test Case #{res.order}
                            </span>
                            {res.isHidden && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] flex items-center space-x-1">
                                <FontAwesomeIcon icon={faEyeSlash} className="text-[9px]" />
                                <span>Hidden</span>
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[11px] font-mono mt-0.5 ${
                              isPass ? 'text-emerald-400' : 'text-rose-400 font-semibold'
                            }`}
                          >
                            {res.logMessage}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">
                          {res.timeMs}ms
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isPass
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {res.points} / {res.maxPoints} pts
                        </span>
                      </div>
                    </div>

                    {/* Expanded Test Details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-[#0d0d0d] space-y-3 text-xs font-mono">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                              Standard Input
                            </span>
                            <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                              {res.inputData || <span className="text-slate-600 italic">No input</span>}
                            </pre>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                              Expected Output
                            </span>
                            <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-36">
                              {res.expectedOutput || <span className="text-slate-600 italic">Empty output</span>}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                              isPass ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            Actual Output
                          </span>
                          <pre
                            className={`p-2.5 rounded border overflow-x-auto whitespace-pre-wrap max-h-40 ${
                              isPass
                                ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                                : 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                            }`}
                          >
                            {res.actualOutput || <span className="text-slate-600 italic">No output produced</span>}
                          </pre>
                        </div>

                        {res.errorDetails && !isPass && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-1">
                              Diagnostics & Mismatch Details
                            </span>
                            <pre className="p-2.5 rounded bg-amber-950/20 border border-amber-900/50 text-amber-300 overflow-x-auto whitespace-pre-wrap max-h-36">
                              {res.errorDetails}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Initial state before execution */
              testCases.map((tc, idx) => (
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
                          Test Case #{tc.order ?? idx + 1}
                        </span>
                        {tc.isHidden && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">Ready to evaluate</p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                    {tc.points ?? 10} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Test Case Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FontAwesomeIcon icon={faPlus} className="text-brand-400" />
                <span>Add Custom Test Case</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Standard Input (stdin)</label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. 5\n10 20 30 40 50"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Expected Output (stdout)</label>
                <textarea
                  value={customExpected}
                  onChange={(e) => setCustomExpected(e.target.value)}
                  placeholder="e.g. 50 40 30 20 10"
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Points</label>
                <input
                  type="number"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold"
                >
                  Add Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
