'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faLayerGroup,
  faPlay,
  faSpinner,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';
import { TestCaseCategory } from './types';

interface GeneratorEditorTabProps {
  batchCount: number;
  setBatchCount: (count: number) => void;
  batchPoints: number;
  setBatchPoints: (pts: number) => void;
  batchCategory: TestCaseCategory;
  setBatchCategory: (cat: TestCaseCategory) => void;
  isGeneratingBatch: boolean;
  onGenerateBatch: () => void;
  onRunSingleGenerator: () => void;
  isRunning: boolean;
}

export function GeneratorEditorTab({
  batchCount,
  setBatchCount,
  batchPoints,
  setBatchPoints,
  batchCategory,
  setBatchCategory,
  isGeneratingBatch,
  onGenerateBatch,
  onRunSingleGenerator,
  isRunning,
}: GeneratorEditorTabProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 bg-[#12171f] border-b border-slate-800 text-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center space-x-1.5 text-amber-300 font-semibold">
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          <span>Batch Generator:</span>
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
          <span className="text-[11px] text-slate-400">Count:</span>
          <input
            type="number"
            min="1"
            max="50"
            value={batchCount}
            onChange={(e) => setBatchCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-10 bg-slate-950 border border-slate-700 rounded px-1 text-[11px] text-white font-mono text-center outline-none"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
          <span className="text-[11px] text-slate-400">Pts/Test:</span>
          <input
            type="number"
            min="1"
            max="100"
            value={batchPoints}
            onChange={(e) => setBatchPoints(parseInt(e.target.value) || 10)}
            className="w-10 bg-slate-950 border border-slate-700 rounded px-1 text-[11px] text-white font-mono text-center outline-none"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
          <span className="text-[11px] text-slate-400">Tier:</span>
          <select
            value={batchCategory}
            onChange={(e) => setBatchCategory(e.target.value as TestCaseCategory)}
            className="bg-transparent text-amber-300 font-bold text-[11px] outline-none cursor-pointer"
          >
            <option value="SAMPLE" className="bg-slate-900 text-white">🟢 Sample (Public)</option>
            <option value="PRETEST" className="bg-slate-900 text-white">🟡 Pretest (Runnable)</option>
            <option value="SYSTEM" className="bg-slate-900 text-white">🟣 System Test (Judge Only)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onRunSingleGenerator}
          disabled={isRunning || isGeneratingBatch}
          className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
          title="Run generator once to inspect sample output"
        >
          <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
          <span>Test 1 Case</span>
        </button>

        <button
          type="button"
          onClick={onGenerateBatch}
          disabled={isGeneratingBatch}
          className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all disabled:opacity-50"
        >
          <FontAwesomeIcon icon={isGeneratingBatch ? faSpinner : faLayerGroup} className={isGeneratingBatch ? 'animate-spin text-[10px]' : 'text-[10px]'} />
          <span>{isGeneratingBatch ? 'Generating...' : `Generate ${batchCount} Cases`}</span>
        </button>
      </div>
    </div>
  );
}
