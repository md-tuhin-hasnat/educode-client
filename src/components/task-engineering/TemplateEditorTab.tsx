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
    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#12171f] border-b border-slate-800 text-xs">
      <div className="flex items-center space-x-2 text-purple-300">
        <FontAwesomeIcon icon={faFileCode} className="text-purple-400" />
        <span>
          <strong>Starter Template ({language.toUpperCase()}):</strong> Code pre-loaded in student IDE when starting the task.
        </span>
      </div>

      <button
        type="button"
        onClick={onResetBoilerplate}
        className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-medium flex items-center space-x-1 transition-colors"
      >
        <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
        <span>Reset Template</span>
      </button>
    </div>
  );
}
