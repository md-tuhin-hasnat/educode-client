'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faPlay,
  faSpinner,
  faTrash,
  faArrowUp,
  faArrowDown,
  faTerminal,
  faCheckCircle,
  faExclamationTriangle,
  faKeyboard,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { registerMonacoThemes } from '@/components/themes';
import { EditorCell } from './types';
import SUPPORTED_LANGUAGES_JSON from '@/data/supportedLanguages.json';

export interface CodeCellExecutionState {
  isRunning: boolean;
  result?: { stdout: string; stderr: string; exitCode: number; durationMs: number };
  showOutput: boolean;
  showStdin: boolean;
  stdin?: string;
}

interface CodeCellCardProps {
  cell: EditorCell;
  idx: number;
  totalCells: number;
  activeTheme?: string;
  executionState?: CodeCellExecutionState;
  onCodeChange: (id: string, code: string) => void;
  onCodeMetaChange: (id: string, field: 'language' | 'title' | 'isRunnable' | 'hasInput', val: any) => void;
  onSetDefaultStdin: (id: string, enabled: boolean) => void;
  onStdinChange: (id: string, val: string) => void;
  onInlineTestRun: (id: string, code: string, lang: string) => void;
  onToggleStdin: (id: string) => void;
  onHideOutput: (id: string) => void;
  onMoveCell: (idx: number, direction: 'up' | 'down') => void;
  onRemoveCell: (id: string) => void;
}

export function CodeCellCard({
  cell,
  idx,
  totalCells,
  activeTheme,
  executionState,
  onCodeChange,
  onCodeMetaChange,
  onSetDefaultStdin,
  onStdinChange,
  onInlineTestRun,
  onToggleStdin,
  onHideOutput,
  onMoveCell,
  onRemoveCell,
}: CodeCellCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg transition-all text-left">
      {/* Code Cell Header */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faCode} className="text-teal-400 text-xs" />
          <input
            type="text"
            value={cell.title || ''}
            onChange={(e) => onCodeMetaChange(cell.id, 'title', e.target.value)}
            placeholder="Code Snippet Title..."
            className="bg-transparent border-none text-xs font-bold text-slate-200 focus:outline-none focus:ring-0 p-0"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Language Selector */}
          <select
            value={cell.language || 'cpp'}
            onChange={(e) => onCodeMetaChange(cell.id, 'language', e.target.value)}
            className="bg-slate-900 border border-slate-800 text-teal-400 font-mono text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES_JSON.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>

          <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cell.isRunnable ?? true}
              onChange={(e) => onCodeMetaChange(cell.id, 'isRunnable', e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/30"
            />
            <span>Runnable</span>
          </label>

          <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cell.hasInput ?? false}
              onChange={(e) => onCodeMetaChange(cell.id, 'hasInput', e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-400 focus:ring-indigo-500/30"
            />
            <span>Has Input</span>
          </label>

          {(cell.isRunnable ?? true) && (
            <button
              type="button"
              onClick={() => onInlineTestRun(cell.id, cell.content, cell.language || 'cpp')}
              disabled={executionState?.isRunning || (cell.hasInput && !executionState?.stdin?.trim())}
              title={
                cell.hasInput && !executionState?.stdin?.trim()
                  ? 'Standard input is required to run'
                  : 'Test Run'
              }
              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {executionState?.isRunning ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="text-[10px] animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                  <span>Test Run</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
            <button
              type="button"
              onClick={() => onMoveCell(idx, 'up')}
              disabled={idx === 0}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              title="Move Up"
            >
              <FontAwesomeIcon icon={faArrowUp} className="text-[11px]" />
            </button>
            <button
              type="button"
              onClick={() => onMoveCell(idx, 'down')}
              disabled={idx === totalCells - 1}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              title="Move Down"
            >
              <FontAwesomeIcon icon={faArrowDown} className="text-[11px]" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveCell(cell.id)}
              className="p-1 text-slate-500 hover:text-rose-400 ml-1"
              title="Delete Code Cell"
            >
              <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="h-52 bg-slate-950 border-t border-slate-900">
        <Editor
          height="100%"
          language={cell.language === 'cpp' || cell.language === 'c' ? 'cpp' : cell.language || 'cpp'}
          theme={activeTheme || 'educode-dark'}
          beforeMount={registerMonacoThemes}
          value={cell.content}
          onChange={(val) => onCodeChange(cell.id, val || '')}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            fontFamily: 'Fira Code, monospace',
            lineNumbersMinChars: 3,
          }}
        />
      </div>

      {/* Standard Input (stdin) Box */}
      {(cell.hasInput || cell.stdin !== undefined || executionState?.showStdin) && (
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-sans font-extrabold uppercase text-teal-400 tracking-wider flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faKeyboard} className="text-teal-400 text-[10px]" />
              <span>Standard Input (stdin)</span>
              {cell.hasInput && (
                <span className="text-[10px] text-amber-400 font-normal normal-case ml-2 font-bold">
                  (Required to run)
                </span>
              )}
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-300 select-none hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={cell.stdin !== undefined}
                onChange={(e) => onSetDefaultStdin(cell.id, e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-teal-400 focus:ring-teal-500/30 cursor-pointer w-3.5 h-3.5"
              />
              <span className="text-[11px] font-semibold text-slate-300">Save as default input for post</span>
            </label>
          </div>
          <textarea
            value={executionState?.stdin || ''}
            onChange={(e) => onStdinChange(cell.id, e.target.value)}
            placeholder="Type custom input for your program here..."
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      )}

      {/* Inline Execution Output Terminal */}
      {executionState?.showOutput && (
        <div className="border-t border-slate-800 bg-slate-950/95 font-mono text-xs text-slate-200">
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faTerminal} className="text-teal-400 text-xs" />
              <span className="font-bold text-slate-300 text-[11px] tracking-wide uppercase">Output Terminal</span>
              {executionState?.isRunning ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-sans font-bold flex items-center space-x-1">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" />
                  <span>Executing...</span>
                </span>
              ) : executionState?.result ? (
                executionState?.result?.exitCode === 0 ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-bold flex items-center space-x-1">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                    <span>Exit 0 ({executionState?.result?.durationMs}ms)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans font-bold flex items-center space-x-1">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" />
                    <span>Exit {executionState?.result?.exitCode} ({executionState?.result?.durationMs}ms)</span>
                  </span>
                )
              ) : null}
            </div>

            <div className="flex items-center space-x-2 font-sans">
              <button
                type="button"
                onClick={() => onToggleStdin(cell.id)}
                className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                  executionState?.showStdin
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Toggle standard input (stdin)"
              >
                <FontAwesomeIcon icon={faKeyboard} className="text-[10px]" />
                <span>Stdin</span>
              </button>
              <button
                type="button"
                onClick={() => onHideOutput(cell.id)}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Hide Terminal Output"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xs" />
              </button>
            </div>
          </div>

          <div className="p-4 max-h-60 overflow-y-auto space-y-2">
            {executionState?.isRunning ? (
              <p className="text-slate-400 italic text-xs animate-pulse">Running program on isolated server container...</p>
            ) : executionState?.result ? (
              <>
                {executionState?.result?.stdout && (
                  <pre className="text-emerald-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {executionState?.result?.stdout}
                  </pre>
                )}
                {executionState?.result?.stderr && (
                  <pre className="text-rose-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {executionState?.result?.stderr}
                  </pre>
                )}
                {!executionState?.result?.stdout && !executionState?.result?.stderr && (
                  <p className="text-slate-500 italic text-xs">(Program executed with no console output)</p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
