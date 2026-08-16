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
    <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-2">
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            <span>Test Case Generator & Batch Pipeline</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Write a Python script to generate random/edge test cases. The generator outputs inputs on <code>stdout</code>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onRunSingleGenerator}
            disabled={isRunning || isGeneratingBatch}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>Test Generate 1 Case</span>
          </button>
        </div>
      </div>

      {/* Batch Generation Control Bar */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Generate Count:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={batchCount}
              onChange={(e) => setBatchCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Points/Test:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={batchPoints}
              onChange={(e) => setBatchPoints(parseInt(e.target.value) || 10)}
              className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center outline-none"
            />
          </div>

          {/* Batch Target Category */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Target Tier:</span>
            <select
              value={batchCategory}
              onChange={(e) => setBatchCategory(e.target.value as TestCaseCategory)}
              className="bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-2 py-1 text-xs outline-none cursor-pointer"
            >
              <option value="SAMPLE">🟢 Sample (Public)</option>
              <option value="PRETEST">🟡 Pretest (Runnable)</option>
              <option value="SYSTEM">🟣 System Test (Judge Only)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerateBatch}
          disabled={isGeneratingBatch}
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          <FontAwesomeIcon icon={isGeneratingBatch ? faSpinner : faLayerGroup} className={isGeneratingBatch ? 'animate-spin' : ''} />
          <span>{isGeneratingBatch ? 'Generating Batch...' : `Generate ${batchCount} Test Cases`}</span>
        </button>
      </div>

      <div className="flex items-center space-x-2 text-amber-300 bg-amber-950/30 border border-amber-500/20 px-3 py-2 rounded-xl text-xs">
        <FontAwesomeIcon icon={faLightbulb} className="text-amber-400" />
        <span>
          <strong>How Batch Generation Works:</strong> EduCode executes <code>generator.py</code> to produce random inputs, feeds them into your reference <code>solution</code> to generate expected outputs, and inserts the resulting test cases into your Test Suite.
        </span>
      </div>
    </div>
  );
}
