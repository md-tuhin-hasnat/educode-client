'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faClock,
  faChevronDown,
  faChevronRight,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { TestCaseResult } from '@/utils/testCaseRunner';

interface TestCaseResultCardProps {
  result: TestCaseResult;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function TestCaseResultCard({
  result: res,
  isExpanded,
  onToggleExpand,
}: TestCaseResultCardProps) {
  const isPass = res.passed;
  const isPretest = (res.testType || (res.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST';
  const isSystem = res.testType === 'SYSTEM';
  const isHiddenCase = isPretest || isSystem || !!res.isHidden;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isPass
          ? 'border-emerald-900/40 bg-emerald-950/10'
          : 'border-rose-900/40 bg-rose-950/10'
      }`}
    >
      {/* Card Summary Header */}
      <div
        onClick={onToggleExpand}
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
                {isPretest ? `Pretest #${res.order}` : isSystem ? `System Test #${res.order}` : `Sample #${res.order}`}
              </span>
              {isPretest ? (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] flex items-center space-x-1">
                  <FontAwesomeIcon icon={faEyeSlash} className="text-[9px]" />
                  <span>Pretest</span>
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
          {isHiddenCase ? (
            /* Hidden Pretest / System Test - Never reveal inputs, expected outputs, actual outputs, or diffs */
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2.5">
              <div className="flex items-center justify-center space-x-2 text-amber-400 font-bold text-xs font-sans">
                <FontAwesomeIcon icon={faEyeSlash} />
                <span>Hidden Test Case Details</span>
              </div>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto font-sans">
                Test input, expected output, and solution diagnostics are hidden for pretests to protect problem integrity and prevent solution hints.
              </p>
              <div className="inline-flex flex-wrap items-center justify-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400 font-sans">Verdict:</span>
                  <span className={isPass ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {isPass
                      ? 'ACCEPTED (AC)'
                      : res.status === 'TIME_LIMIT_EXCEEDED'
                      ? 'TIME LIMIT EXCEEDED (TLE)'
                      : res.status === 'RUNTIME_ERROR'
                      ? 'RUNTIME ERROR (RTE)'
                      : res.status === 'COMPILATION_ERROR'
                      ? 'COMPILATION ERROR (CE)'
                      : 'WRONG ANSWER (WA)'}
                  </span>
                </div>
                <span className="text-slate-700">•</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400 font-sans">Time:</span>
                  <span className="text-white font-bold">{res.timeMs}ms</span>
                </div>
                <span className="text-slate-700">•</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-slate-400 font-sans">Score:</span>
                  <span className={isPass ? 'text-emerald-400 font-bold' : 'text-slate-300 font-bold'}>
                    {res.points} / {res.maxPoints} pts
                  </span>
                </div>
              </div>

              {res.status === 'COMPILATION_ERROR' && res.errorDetails && (
                <div className="text-left mt-3">
                  <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block mb-1 font-sans">
                    Compilation Diagnostics:
                  </span>
                  <pre className="p-2.5 rounded bg-rose-950/20 border border-rose-900/50 text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-36 text-[11px]">
                    {res.errorDetails}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* Public Sample Test Case Details */
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
