'use client';

import React from 'react';
import { RunnerFilter } from './types';
import { TestCaseInput, TestSuiteSummary } from '@/utils/testCaseRunner';

interface TestCaseFilterBarProps {
  filter: RunnerFilter;
  setFilter: (f: RunnerFilter) => void;
  testCases: TestCaseInput[];
  summary: TestSuiteSummary | null;
}

export function TestCaseFilterBar({
  filter,
  setFilter,
  testCases,
  summary,
}: TestCaseFilterBarProps) {
  const sampleCount = testCases.filter(
    (t) => (t.testType || (!t.isHidden ? 'SAMPLE' : 'PRETEST')) === 'SAMPLE'
  ).length;
  const pretestCount = testCases.filter(
    (t) => (t.testType || (t.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST'
  ).length;

  return (
    <div className="p-2 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between shrink-0 overflow-x-auto">
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
        {sampleCount > 0 && (
          <button
            onClick={() => setFilter('SAMPLE')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              filter === 'SAMPLE'
                ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-700/50'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            🟢 Samples ({sampleCount})
          </button>
        )}
        {pretestCount > 0 && (
          <button
            onClick={() => setFilter('PRETEST')}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              filter === 'PRETEST'
                ? 'bg-amber-950/80 text-amber-300 font-bold border border-amber-700/50'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            🟡 Pretests ({pretestCount})
          </button>
        )}
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
  );
}
