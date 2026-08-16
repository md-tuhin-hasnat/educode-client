'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faPlay,
  faFileCode,
  faTerminal,
  faCheckCircle,
  faTimes,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { RunExecutionResult } from './types';

interface SolutionEditorTabProps {
  language: string;
  onGenerateTemplateFromSolution: () => void;
  customStdin: string;
  setCustomStdin: (val: string) => void;
  isRunning: boolean;
  onRunSolution: () => void;
  runResult: RunExecutionResult | null;
}

export function SolutionEditorTab({
  language,
  onGenerateTemplateFromSolution,
  customStdin,
  setCustomStdin,
  isRunning,
  onRunSolution,
  runResult,
}: SolutionEditorTabProps) {
  return (
    <div className="space-y-3">
      {/* Helper Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <FontAwesomeIcon icon={faCode} className="text-emerald-400" />
          <span>
            Write the official Reference Solution in <strong>{language.toUpperCase()}</strong>.
          </span>
        </div>

        <button
          type="button"
          onClick={onGenerateTemplateFromSolution}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
          title="Create a starter skeleton for students by removing implementation logic"
        >
          <FontAwesomeIcon icon={faFileCode} className="text-[11px]" />
          <span>Extract Starter Template</span>
        </button>
      </div>

      {/* Terminal Stdin/Stdout Drawer */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-300 font-sans font-bold flex items-center space-x-1.5">
            <FontAwesomeIcon icon={faTerminal} className="text-emerald-400" />
            <span>Interactive Code Execution Terminal</span>
          </span>

          <button
            type="button"
            onClick={onRunSolution}
            disabled={isRunning}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-sans font-bold text-xs flex items-center space-x-1 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
            <span>{isRunning ? 'Running...' : 'Run with Input'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block mb-1">
              Custom Input (stdin):
            </label>
            <textarea
              rows={3}
              value={customStdin}
              onChange={(e) => setCustomStdin(e.target.value)}
              placeholder="Type test input for stdin..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-slate-700"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider block mb-1">
              Execution Output (stdout / stderr):
            </label>
            <div className="h-[76px] bg-slate-900 border border-slate-800 rounded-xl p-2.5 overflow-y-auto text-xs">
              {runResult ? (
                <div>
                  <div className="flex items-center space-x-2 text-[10px] pb-1 mb-1 border-b border-slate-800 text-slate-400">
                    <span className={runResult.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Exit Code: {runResult.exitCode}
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                      <span>{runResult.durationMs}ms</span>
                    </span>
                  </div>
                  {runResult.stdout && <pre className="text-emerald-300 whitespace-pre-wrap">{runResult.stdout}</pre>}
                  {runResult.stderr && <pre className="text-rose-400 whitespace-pre-wrap">{runResult.stderr}</pre>}
                  {!runResult.stdout && !runResult.stderr && (
                    <span className="text-slate-500 italic">(Process completed with no output)</span>
                  )}
                </div>
              ) : (
                <span className="text-slate-500 italic">Output will appear here after clicking "Run with Input".</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
