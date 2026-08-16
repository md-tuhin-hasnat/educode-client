'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faWandMagicSparkles,
  faScaleBalanced,
  faFileCode,
  faLayerGroup,
  faPlay,
  faFlask,
  faClock,
  faMicrochip,
  faPalette,
  faFont,
  faCopy,
  faCheck,
  faExpand,
  faCompress,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { PRESET_THEMES } from '@/components/themes';
import { WorkspaceTab, TestCaseItem } from './types';

interface TaskEngineeringHeaderProps {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  fileNames: Record<string, string>;
  testCases: TestCaseItem[];
  timeLimitMs: number;
  onTimeLimitChange?: (val: number) => void;
  memoryLimitMb: number;
  onMemoryLimitChange?: (val: number) => void;
  themeId: string;
  setThemeId: (theme: string) => void;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  copied: boolean;
  onCopyCode: () => void;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onRunActiveTab: () => void;
  onEvaluateSuite: () => void;
  onResetActiveBoilerplate: () => void;
  isRunning: boolean;
  isEvaluatingSuite: boolean;
  isGeneratingBatch: boolean;
}

export function TaskEngineeringHeader({
  activeTab,
  setActiveTab,
  fileNames,
  testCases,
  timeLimitMs,
  onTimeLimitChange,
  memoryLimitMb,
  onMemoryLimitChange,
  themeId,
  setThemeId,
  fontSize,
  setFontSize,
  copied,
  onCopyCode,
  isFullScreen,
  onToggleFullScreen,
  onRunActiveTab,
  onEvaluateSuite,
  onResetActiveBoilerplate,
  isRunning,
  isEvaluatingSuite,
  isGeneratingBatch,
}: TaskEngineeringHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md">
      {/* Tab Switcher Pills */}
      <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800/80 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('solution')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'solution'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FontAwesomeIcon icon={faCode} />
          <span>Solution ({fileNames.solution})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'generator'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          <span>Generator ({fileNames.generator})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checker')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'checker'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FontAwesomeIcon icon={faScaleBalanced} />
          <span>Checker ({fileNames.checker})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('template')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'template'
              ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FontAwesomeIcon icon={faFileCode} />
          <span>Starter Template ({fileNames.template})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('testsuite')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'testsuite'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FontAwesomeIcon icon={faLayerGroup} />
          <span>Test Suite ({testCases.length})</span>
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        {/* Run Active Code Button */}
        {activeTab !== 'testsuite' && (
          <button
            type="button"
            onClick={onRunActiveTab}
            disabled={isRunning || isGeneratingBatch}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md ${
              activeTab === 'solution'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : activeTab === 'generator'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : activeTab === 'checker'
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FontAwesomeIcon icon={faPlay} className="text-[11px]" />
            <span>
              {activeTab === 'solution'
                ? 'Run Solution'
                : activeTab === 'generator'
                ? 'Generate Case'
                : activeTab === 'checker'
                ? 'Run Checker'
                : 'Test Template'}
            </span>
          </button>
        )}

        {/* Evaluate Full Suite Button */}
        <button
          type="button"
          onClick={onEvaluateSuite}
          disabled={isEvaluatingSuite || testCases.length === 0}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center space-x-2 transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Run reference solution against all test cases"
        >
          <FontAwesomeIcon icon={faFlask} className="text-[11px]" />
          <span>Evaluate Suite</span>
        </button>

        {/* Reset Active Boilerplate */}
        <button
          type="button"
          onClick={onResetActiveBoilerplate}
          className="p-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
          title="Reset to default starter boilerplate"
        >
          <FontAwesomeIcon icon={faRotateLeft} />
        </button>

        {/* Execution Limits Widget (Time & Memory Limit) */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300" title="Task Execution Time Limit">
            <FontAwesomeIcon icon={faClock} className="text-amber-400 text-[11px]" />
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Time:</span>
            <select
              value={timeLimitMs}
              onChange={(e) => onTimeLimitChange?.(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-1.5 py-0.5 text-[11px] outline-none cursor-pointer"
            >
              <option value={500}>0.5s</option>
              <option value={1000}>1.0s</option>
              <option value={2000}>2.0s</option>
              <option value={3000}>3.0s</option>
              <option value={5000}>5.0s</option>
              <option value={10000}>10.0s</option>
            </select>
          </div>
          <div className="h-3.5 w-px bg-slate-700" />
          <div className="flex items-center space-x-1.5 text-slate-300" title="Task Memory Limit">
            <FontAwesomeIcon icon={faMicrochip} className="text-cyan-400 text-[11px]" />
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Mem:</span>
            <select
              value={memoryLimitMb}
              onChange={(e) => onMemoryLimitChange?.(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded px-1.5 py-0.5 text-[11px] outline-none cursor-pointer"
            >
              <option value={128}>128 MB</option>
              <option value={256}>256 MB</option>
              <option value={512}>512 MB</option>
              <option value={1024}>1024 MB</option>
            </select>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
          <FontAwesomeIcon icon={faPalette} className="text-slate-400 text-xs" />
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
            title="Editor Theme"
          >
            {PRESET_THEMES.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Adjust */}
        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
          <FontAwesomeIcon icon={faFont} className="text-slate-400 text-xs mr-1" />
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(11, s - 1))}
            className="px-1.5 text-xs text-slate-400 hover:text-white font-bold"
            title="Decrease Font Size"
          >
            -
          </button>
          <span className="text-xs font-mono text-slate-300 w-4 text-center">{fontSize}</span>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            className="px-1.5 text-xs text-slate-400 hover:text-white font-bold"
            title="Increase Font Size"
          >
            +
          </button>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={onCopyCode}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center space-x-1.5 transition-colors"
          title="Copy Active Code"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-emerald-400' : ''} />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullScreen}
          className="p-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-colors"
          title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
        >
          <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} />
        </button>
      </div>
    </div>
  );
}
