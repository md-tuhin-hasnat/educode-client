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
}: Pick<SolutionEditorTabProps, 'language' | 'onGenerateTemplateFromSolution'>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#12171f] border-b border-slate-800 text-xs">
      <div className="flex items-center space-x-2 text-slate-300">
        <FontAwesomeIcon icon={faCode} className="text-emerald-400 text-xs" />
        <span>
          Official Reference Solution in <strong className="text-emerald-300 font-semibold">{language.toUpperCase()}</strong>
        </span>
        <span className="text-[11px] text-slate-500 hidden md:inline">— Used to evaluate test suites & calculate outputs</span>
      </div>

      <button
        type="button"
        onClick={onGenerateTemplateFromSolution}
        className="h-7 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        title="Extract starter template for students by clearing inner function body"
      >
        <FontAwesomeIcon icon={faFileCode} className="text-[10px]" />
        <span>Extract Starter Template</span>
      </button>
    </div>
  );
}
