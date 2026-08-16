'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faFlask,
  faSpinner,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  assessmentType: 'LAB' | 'ASSIGNMENT' | 'EXAM';
  setAssessmentType: (val: 'LAB' | 'ASSIGNMENT' | 'EXAM') => void;
  assessmentTitle: string;
  setAssessmentTitle: (val: string) => void;
  assessmentDesc: string;
  setAssessmentDesc: (val: string) => void;
  assessmentDuration: number;
  setAssessmentDuration: (val: number) => void;
  isCreating: boolean;
}

export function CreateAssessmentModal({
  isOpen,
  onClose,
  onSubmit,
  assessmentType,
  setAssessmentType,
  assessmentTitle,
  setAssessmentTitle,
  assessmentDesc,
  setAssessmentDesc,
  assessmentDuration,
  setAssessmentDuration,
  isCreating,
}: CreateAssessmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <FontAwesomeIcon icon={faFlask} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Assessment Module</h3>
              <p className="text-xs text-slate-400">Bundle coding tasks under a lab, exam, or assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Module Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['LAB', 'ASSIGNMENT', 'EXAM'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAssessmentType(t)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    assessmentType === t
                      ? 'bg-teal-600/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Lab 03: Dynamic Programming"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Provide instructions or background for this module..."
              value={assessmentDesc}
              onChange={(e) => setAssessmentDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500"
            />
          </div>

          {(assessmentType === 'EXAM' || assessmentType === 'LAB') && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Duration (Minutes)</label>
              <input
                type="number"
                min={1}
                value={assessmentDuration}
                onChange={(e) => setAssessmentDuration(parseInt(e.target.value, 10) || 60)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isCreating ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPlus} />
                  <span>Create Module</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
