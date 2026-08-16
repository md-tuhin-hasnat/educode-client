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
    <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
            <FontAwesomeIcon icon={faScaleBalanced} />
            <span>Codeforces Polygon-Style Checker & Evaluation Mode</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure how the judge validates student outputs against jury answers (e.g. float tolerance, case-insensitivity, or custom script).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Preset script quick loader */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <FontAwesomeIcon icon={faSliders} className="text-cyan-400 text-[11px]" />
            <select
              onChange={(e) => {
                const presetId = e.target.value as CheckerType;
                if (presetId) {
                  const script = getPresetCheckerScript(presetId, currentChecker.floatTolerance ?? 1e-6);
                  onLoadScriptPreset(script);
                }
              }}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
              defaultValue=""
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Load Preset to Editor...
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
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-600/30 transition-all self-start md:self-auto"
          >
            <FontAwesomeIcon icon={faFlask} />
            <span>Test Checker with Sample</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
        {CHECKER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectCheckerPreset(preset.id)}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${
              currentChecker.type === preset.id
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{preset.label.split('(')[0]}</span>
              {currentChecker.type === preset.id && (
                <FontAwesomeIcon icon={faCheckCircle} className="text-cyan-400 text-xs" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">{preset.description}</p>
            <div className="pt-1 text-[10px] text-cyan-400/80 font-medium flex items-center space-x-1">
              <span>⚡ Loads script to IDE</span>
            </div>
          </button>
        ))}
      </div>

      {/* Floating Point Precision Tolerance Settings */}
      {currentChecker.type === 'FLOAT_TOLERANCE' && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={faBullseye} className="text-cyan-400 text-sm" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Precision Tolerance Limit (ε):
                </span>
                <span className="text-[11px] text-slate-400">
                  Standard Codeforces `rcmp` checking: user output matches if absolute or relative error ≤ ε
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {[
                { label: '10⁻⁴ (0.0001)', val: 1e-4 },
                { label: '10⁻⁶ (0.000001)', val: 1e-6 },
                { label: '10⁻⁹ (1e-9)', val: 1e-9 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => onUpdateFloatTolerance(preset.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                    currentChecker.floatTolerance === preset.val
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}

              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-400 font-mono font-bold">ε =</span>
                <input
                  type="number"
                  step="any"
                  min="0.000000000001"
                  max="1"
                  value={currentChecker.floatTolerance ?? 1e-6}
                  onChange={(e) => onUpdateFloatTolerance(parseFloat(e.target.value) || 1e-6)}
                  className="w-24 bg-transparent text-xs font-mono text-cyan-300 font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Mathematical formula badge */}
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-[11px] text-slate-400">
              Mathematical Validation Formula:
            </span>
            <div
              className="text-cyan-300 text-xs font-serif"
              dangerouslySetInnerHTML={{
                __html: renderLatex(
                  `\\min\\left(|y_{\\text{user}} - y_{\\text{jury}}|, \\frac{|y_{\\text{user}} - y_{\\text{jury}}|}{\\max(1.0, |y_{\\text{jury}}|)}\\right) \\le ${currentChecker.floatTolerance ?? '10^{-6}'}`
                ),
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Notice indicating code is live in IDE */}
      <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/20 px-3 py-2 rounded-xl text-xs flex-wrap gap-2">
        <div className="flex items-center space-x-2 text-cyan-300">
          <FontAwesomeIcon icon={faLightbulb} className="text-cyan-400" />
          <span>
            <strong>{CHECKER_PRESETS.find((p) => p.id === currentChecker.type)?.label.split('(')[0]}</strong> preset is currently loaded in <code>checker.py</code> below. You can edit the code directly to customize your validation rules.
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelectCheckerPreset(currentChecker.type)}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-medium flex items-center space-x-1 transition-colors"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
          <span>Reset Preset Script</span>
        </button>
      </div>
    </div>
  );
}
