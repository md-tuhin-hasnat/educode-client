'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScaleBalanced,
  faFlask,
  faCheckCircle,
  faBullseye,
  faLightbulb,
  faRotateLeft,
  faSliders,
} from '@fortawesome/free-solid-svg-icons';
import {
  CheckerConfig,
  CheckerType,
  CHECKER_PRESETS,
  getPresetCheckerScript,
} from '@/utils/testCaseChecker';
import { renderLatex } from '@/utils/mathRenderer';

interface CheckerEditorTabProps {
  currentChecker: CheckerConfig;
  onSelectCheckerPreset: (presetId: CheckerType, customEps?: number) => void;
  onUpdateFloatTolerance: (eps: number) => void;
  onTestCheckerInteractively: () => void;
  onLoadScriptPreset: (script: string) => void;
}

export function CheckerEditorTab({
  currentChecker,
  onSelectCheckerPreset,
  onUpdateFloatTolerance,
  onTestCheckerInteractively,
  onLoadScriptPreset,
}: CheckerEditorTabProps) {
  return (
    <div className="px-3.5 py-2 bg-[#12171f] border-b border-slate-800 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center space-x-1 text-cyan-300 font-semibold mr-1">
            <FontAwesomeIcon icon={faScaleBalanced} />
            <span>Judge Mode:</span>
          </div>

          {/* Compact Presets Bar */}
          {CHECKER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectCheckerPreset(preset.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                currentChecker.type === preset.id
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={preset.description}
            >
              {preset.label.split('(')[0].trim()}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {/* Preset script quick loader */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
            <FontAwesomeIcon icon={faSliders} className="text-cyan-400 text-[10px]" />
            <select
              onChange={(e) => {
                const presetId = e.target.value as CheckerType;
                if (presetId) {
                  const script = getPresetCheckerScript(presetId, currentChecker.floatTolerance ?? 1e-6);
                  onLoadScriptPreset(script);
                }
              }}
              className="bg-transparent text-[11px] text-slate-200 outline-none cursor-pointer pr-1"
              defaultValue=""
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Load Preset Script...
              </option>
              {CHECKER_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.label.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onTestCheckerInteractively}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-all"
            title="Test checker against sample user & jury outputs"
          >
            <FontAwesomeIcon icon={faFlask} className="text-[10px]" />
            <span>Test Checker</span>
          </button>
        </div>
      </div>

      {/* Floating Point Precision Tolerance Settings */}
      {currentChecker.type === 'FLOAT_TOLERANCE' && (
        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-[11px] text-slate-300">
            <FontAwesomeIcon icon={faBullseye} className="text-cyan-400 text-xs" />
            <span>Precision Tolerance (ε):</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {[
              { label: '10⁻⁴', val: 1e-4 },
              { label: '10⁻⁶', val: 1e-6 },
              { label: '10⁻⁹', val: 1e-9 },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => onUpdateFloatTolerance(preset.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-all ${
                  currentChecker.floatTolerance === preset.val
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5">
              <span className="text-[10px] text-slate-400 font-mono">ε =</span>
              <input
                type="number"
                step="any"
                min="0.000000000001"
                max="1"
                value={currentChecker.floatTolerance ?? 1e-6}
                onChange={(e) => onUpdateFloatTolerance(parseFloat(e.target.value) || 1e-6)}
                className="w-20 bg-transparent text-[11px] font-mono text-cyan-300 font-bold outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
