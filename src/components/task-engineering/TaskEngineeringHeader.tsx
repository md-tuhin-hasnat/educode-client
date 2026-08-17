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
    <div className="flex flex-wrap items-center justify-between bg-[#161b22] border border-slate-800 rounded-t-2xl px-3 pt-2 pb-0 shadow-lg gap-2">
      {/* Left: Professional IDE File Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto">
        {/* Solution Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('solution')}
          className={`h-9 px-3.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 border-t-2 transition-all shrink-0 ${
            activeTab === 'solution'
              ? 'bg-[#1e1e1e] text-white border-t-emerald-500 border-x border-slate-800 shadow-md'
              : 'border-t-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title={`Official Reference Solution (${fileNames.solution})`}
        >
          <FontAwesomeIcon icon={faCode} className={`text-xs ${activeTab === 'solution' ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="font-mono">{fileNames.solution}</span>
        </button>

        {/* Generator Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`h-9 px-3.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 border-t-2 transition-all shrink-0 ${
            activeTab === 'generator'
              ? 'bg-[#1e1e1e] text-white border-t-amber-500 border-x border-slate-800 shadow-md'
              : 'border-t-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title={`Test Case Generator Script (${fileNames.generator})`}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} className={`text-xs ${activeTab === 'generator' ? 'text-amber-400' : 'text-slate-500'}`} />
          <span className="font-mono">{fileNames.generator}</span>
        </button>

        {/* Checker Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('checker')}
          className={`h-9 px-3.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 border-t-2 transition-all shrink-0 ${
            activeTab === 'checker'
              ? 'bg-[#1e1e1e] text-white border-t-cyan-500 border-x border-slate-800 shadow-md'
              : 'border-t-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title={`Output & Precision Checker (${fileNames.checker})`}
        >
          <FontAwesomeIcon icon={faScaleBalanced} className={`text-xs ${activeTab === 'checker' ? 'text-cyan-400' : 'text-slate-500'}`} />
          <span className="font-mono">{fileNames.checker}</span>
        </button>

        {/* Starter Template Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('template')}
          className={`h-9 px-3.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 border-t-2 transition-all shrink-0 ${
            activeTab === 'template'
              ? 'bg-[#1e1e1e] text-white border-t-purple-500 border-x border-slate-800 shadow-md'
              : 'border-t-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title={`Student Starter Skeleton (${fileNames.template})`}
        >
          <FontAwesomeIcon icon={faFileCode} className={`text-xs ${activeTab === 'template' ? 'text-purple-400' : 'text-slate-500'}`} />
          <span className="font-mono">{fileNames.template}</span>
        </button>

        {/* Test Suite Matrix Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('testsuite')}
          className={`h-9 px-3.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 border-t-2 transition-all shrink-0 ${
            activeTab === 'testsuite'
              ? 'bg-[#1e1e1e] text-white border-t-brand-500 border-x border-slate-800 shadow-md'
              : 'border-t-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title={`Comprehensive Test Suite (${testCases.length} test cases)`}
        >
          <FontAwesomeIcon icon={faLayerGroup} className={`text-xs ${activeTab === 'testsuite' ? 'text-brand-400' : 'text-slate-500'}`} />
          <span>Test Suite</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-brand-500/20 text-brand-300 border border-brand-500/40">
            {testCases.length}
          </span>
        </button>
      </div>

      {/* Right: Unified Action Buttons & IDE Utilities */}
      <div className="flex items-center space-x-2 pb-2">
        {/* Primary Tab Execution Button */}
        {activeTab !== 'testsuite' && (
          <button
            type="button"
            onClick={onRunActiveTab}
            disabled={isRunning || isGeneratingBatch}
            className={`h-7.5 px-3 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
              activeTab === 'solution'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                : activeTab === 'generator'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : activeTab === 'checker'
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Execute current file in container sandbox"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>
              {activeTab === 'solution'
                ? 'Run Solution'
                : activeTab === 'generator'
                ? 'Generate Case'
                : activeTab === 'checker'
                ? 'Run Checker'
                : 'Test Starter'}
            </span>
          </button>
        )}

        {/* Evaluate Suite Button */}
        <button
          type="button"
          onClick={onEvaluateSuite}
          disabled={isEvaluatingSuite || testCases.length === 0}
          className="h-7.5 px-3 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white flex items-center space-x-1.5 transition-all shadow-md shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Run reference solution against all test cases"
        >
          <FontAwesomeIcon icon={faFlask} className="text-[10px]" />
          <span>Evaluate Suite</span>
          <span className="font-mono text-[10px] opacity-80">({testCases.length})</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Theme Selector */}
        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl px-2 h-7.5" title="Monaco Theme">
          <FontAwesomeIcon icon={faPalette} className="text-slate-400 text-[10px]" />
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="bg-transparent text-[11px] text-slate-300 outline-none cursor-pointer max-w-[85px] truncate"
          >
            {PRESET_THEMES.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Adjuster */}
        <div className="flex items-center space-x-0.5 bg-slate-900 border border-slate-800 rounded-xl px-1.5 h-7.5">
          <FontAwesomeIcon icon={faFont} className="text-slate-400 text-[9px] mr-0.5" />
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.max(11, s - 1))}
            className="w-4 h-5 text-[11px] text-slate-400 hover:text-white font-bold flex items-center justify-center rounded hover:bg-slate-800"
            title="Decrease Font Size"
          >
            -
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-4 text-center">{fontSize}</span>
          <button
            type="button"
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            className="w-4 h-5 text-[11px] text-slate-400 hover:text-white font-bold flex items-center justify-center rounded hover:bg-slate-800"
            title="Increase Font Size"
          >
            +
          </button>
        </div>

        {/* Reset Boilerplate */}
        <button
          type="button"
          onClick={onResetActiveBoilerplate}
          className="w-7.5 h-7.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-slate-800 flex items-center justify-center transition-colors"
          title="Reset active tab to default starter boilerplate"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
        </button>

        {/* Copy Code */}
        <button
          type="button"
          onClick={onCopyCode}
          className="h-7.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 flex items-center space-x-1 transition-colors"
          title="Copy Active Code"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={`text-[10px] ${copied ? 'text-emerald-400' : ''}`} />
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullScreen}
          className="w-7.5 h-7.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs rounded-xl border border-slate-800 flex items-center justify-center transition-colors"
          title={isFullScreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Editor'}
        >
          <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}

