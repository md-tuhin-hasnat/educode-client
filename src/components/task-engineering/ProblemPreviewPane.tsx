'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faClock,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';
import { renderLatex } from '@/utils/mathRenderer';

interface ProblemPreviewPaneProps {
  description: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

export function ProblemPreviewPane({
  description,
  timeLimitMs,
  memoryLimitMb,
}: ProblemPreviewPaneProps) {
  const cleanDescription = (description || '').replace(
    /<!--educode-task-meta:[\s\S]*?-->/g,
    ''
  );

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <FontAwesomeIcon icon={faBookOpen} className="text-brand-400" />
          <span>Live Problem Statement Preview</span>
        </span>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono text-[11px] flex items-center space-x-1">
            <FontAwesomeIcon icon={faClock} className="text-[10px]" />
            <span>{timeLimitMs / 1000}s</span>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono text-[11px] flex items-center space-x-1">
            <FontAwesomeIcon icon={faMicrochip} className="text-[10px]" />
            <span>{memoryLimitMb} MB</span>
          </span>
        </div>
      </div>

      <div
        className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans"
        dangerouslySetInnerHTML={{
          __html: renderLatex(cleanDescription || 'No problem description provided yet.'),
        }}
      />
    </div>
  );
}
