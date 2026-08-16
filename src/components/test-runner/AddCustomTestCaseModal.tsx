'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { TestCaseInput } from '@/utils/testCaseRunner';

interface AddCustomTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tc: TestCaseInput) => void;
  order: number;
}

export function AddCustomTestCaseModal({
  isOpen,
  onClose,
  onAdd,
  order,
}: AddCustomTestCaseModalProps) {
  const [customInput, setCustomInput] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  const [customPoints, setCustomPoints] = useState('10');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: `custom-${Date.now()}`,
      order,
      inputData: customInput,
      expectedOutput: customExpected,
      points: parseInt(customPoints, 10) || 10,
      testType: 'SAMPLE',
    });
    setCustomInput('');
    setCustomExpected('');
    setCustomPoints('10');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <FontAwesomeIcon icon={faPlus} className="text-brand-400" />
            <span>Add Custom Test Case</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Standard Input (stdin)</label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. 5\n10 20 30 40 50"
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Expected Output (stdout)</label>
            <textarea
              value={customExpected}
              onChange={(e) => setCustomExpected(e.target.value)}
              placeholder="e.g. 50 40 30 20 10"
              rows={3}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Points</label>
            <input
              type="number"
              value={customPoints}
              onChange={(e) => setCustomPoints(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold"
            >
              Add Test Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
