'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileCode,
  faLightbulb,
  faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';

interface TemplateEditorTabProps {
  language: string;
  onResetBoilerplate: () => void;
}

export function TemplateEditorTab({
  language,
  onResetBoilerplate,
}: TemplateEditorTabProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-purple-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2 text-purple-300">
        <FontAwesomeIcon icon={faLightbulb} className="text-purple-400" />
        <span>
          <strong>Starter Template ({language.toUpperCase()}):</strong> This skeleton code is pre-loaded into the student's IDE when they begin solving the task.
        </span>
      </div>

      <button
        type="button"
        onClick={onResetBoilerplate}
        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-medium flex items-center space-x-1 transition-colors"
      >
        <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
        <span>Reset Template Boilerplate</span>
      </button>
    </div>
  );
}
