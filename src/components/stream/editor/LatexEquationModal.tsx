'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { renderLatex } from '@/utils/mathRenderer';

interface LatexEquationModalProps {
  isOpen: boolean;
  onClose: () => void;
  equationInput: string;
  setEquationInput: (val: string) => void;
  equationMode: 'inline' | 'block';
  setEquationMode: (mode: 'inline' | 'block') => void;
  onInsert: () => void;
  isEditing: boolean;
  mounted: boolean;
}

import QUICK_MATH_SYMBOLS from '@/data/mathSymbols.json';

export function LatexEquationModal({
  isOpen,
  onClose,
  equationInput,
  setEquationInput,
  equationMode,
  setEquationMode,
  onInsert,
  isEditing,
  mounted,
}: LatexEquationModalProps) {
  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="font-serif italic text-emerald-400 font-bold text-base">f(x)</span>
            <h3 className="text-sm font-bold text-white">
              {isEditing ? 'Edit Mathematical Equation' : 'Insert LaTeX Math Equation'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="flex items-center space-x-4 text-xs text-slate-300">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              name="eqMode"
              checked={equationMode === 'inline'}
              onChange={() => setEquationMode('inline')}
              className="text-emerald-500"
            />
            <span>Inline Equation (<code className="text-emerald-400 font-mono">$...$</code>)</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              name="eqMode"
              checked={equationMode === 'block'}
              onChange={() => setEquationMode('block')}
              className="text-emerald-500"
            />
            <span>Block Equation (<code className="text-emerald-400 font-mono">$$...$$</code>)</span>
          </label>
        </div>

        {/* LaTeX Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            LaTeX Formula:
          </label>
          <textarea
            rows={3}
            value={equationInput}
            onChange={(e) => setEquationInput(e.target.value)}
            placeholder="e.g. O(N \log N) or \sum_{i=1}^{n} x_i"
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs font-mono text-white outline-none"
          />
        </div>

        {/* Quick Math Symbols */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
            Quick Symbols & Patterns:
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {QUICK_MATH_SYMBOLS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setEquationInput(equationInput ? `${equationInput} ${s.val}` : s.val)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Box */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
            Live Preview:
          </label>
          <div
            className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-100 min-h-[48px] flex items-center justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: renderLatex(
                equationInput
                  ? equationMode === 'block'
                    ? `$$${equationInput}$$`
                    : `$${equationInput}$`
                  : '(Type LaTeX code to preview)'
              ),
            }}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onInsert}
            disabled={!equationInput.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
          >
            {isEditing ? 'Update Equation' : 'Insert Equation'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
