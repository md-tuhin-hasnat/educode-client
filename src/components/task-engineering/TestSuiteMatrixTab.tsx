'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLayerGroup,
  faFlask,
  faPlus,
  faTrash,
  faCheckCircle,
  faTimes,
  faSpinner,
  faSliders,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { TestCaseItem, TestCaseCategory, TestSuiteResultItem } from './types';

interface TestSuiteMatrixTabProps {
  testCases: TestCaseItem[];
  onTestCasesChange: (cases: TestCaseItem[]) => void;
  suiteCategoryFilter: 'ALL' | 'SAMPLE' | 'PRETEST' | 'SYSTEM';
  setSuiteCategoryFilter: (filter: 'ALL' | 'SAMPLE' | 'PRETEST' | 'SYSTEM') => void;
  testResults: TestSuiteResultItem[];
  isEvaluatingSuite: boolean;
  onEvaluateTestSuite: () => void;
  onOpenBatchDrawer: () => void;
}

export function TestSuiteMatrixTab({
  testCases,
  onTestCasesChange,
  suiteCategoryFilter,
  setSuiteCategoryFilter,
  testResults,
  isEvaluatingSuite,
  onEvaluateTestSuite,
  onOpenBatchDrawer,
}: TestSuiteMatrixTabProps) {
  const sampleCount = testCases.filter((t) => (t.testType || (!t.isHidden ? 'SAMPLE' : 'PRETEST')) === 'SAMPLE').length;
  const pretestCount = testCases.filter((t) => (t.testType || (t.isHidden ? 'PRETEST' : 'SAMPLE')) === 'PRETEST').length;
  const systemCount = testCases.filter((t) => t.testType === 'SYSTEM').length;

  const handleAddTestCase = (category: TestCaseCategory = 'SAMPLE') => {
    const newCase: TestCaseItem = {
      id: Date.now(),
      inputData: '',
      expectedOutput: '',
      points: 10,
      isHidden: category !== 'SAMPLE',
      testType: category,
      order: testCases.length,
    };
    onTestCasesChange([...testCases, newCase]);
  };

  const handleUpdateTestCase = (index: number, updates: Partial<TestCaseItem>) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], ...updates };
    onTestCasesChange(updated);
  };

  const handleDeleteTestCase = (index: number) => {
    const updated = testCases.filter((_, i) => i !== index);
    onTestCasesChange(updated);
  };

  const filteredCases = testCases.filter((tc) => {
    const effectiveCategory = tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE');
    if (suiteCategoryFilter === 'SAMPLE') return effectiveCategory === 'SAMPLE';
    if (suiteCategoryFilter === 'PRETEST') return effectiveCategory === 'PRETEST';
    if (suiteCategoryFilter === 'SYSTEM') return effectiveCategory === 'SYSTEM';
    return true;
  });

  return (
    <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
      {/* Header with Filter Pills and Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faLayerGroup} className="text-brand-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Test Suite Matrix ({testCases.length} Cases)
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setSuiteCategoryFilter('ALL')}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                suiteCategoryFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({testCases.length})
            </button>
            <button
              type="button"
              onClick={() => setSuiteCategoryFilter('SAMPLE')}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                suiteCategoryFilter === 'SAMPLE'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              🟢 Samples ({sampleCount})
            </button>
            <button
              type="button"
              onClick={() => setSuiteCategoryFilter('PRETEST')}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                suiteCategoryFilter === 'PRETEST'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              🟡 Pretests ({pretestCount})
            </button>
            <button
              type="button"
              onClick={() => setSuiteCategoryFilter('SYSTEM')}
              className={`px-2.5 py-0.5 rounded-lg transition-all ${
                suiteCategoryFilter === 'SYSTEM'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              🟣 System ({systemCount})
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenBatchDrawer}
            className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            <span>Generate Batch</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddTestCase('SAMPLE')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Add Test Case</span>
          </button>

          <button
            type="button"
            onClick={onEvaluateTestSuite}
            disabled={isEvaluatingSuite || testCases.length === 0}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faFlask} />
            <span>Run Reference Solution</span>
          </button>
        </div>
      </div>

      {/* Test Cases Table / List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredCases.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-800 text-slate-400">
            <p className="text-sm font-semibold">No test cases in this filter category.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "Add Test Case" or "Generate Batch" to create test cases.
            </p>
          </div>
        ) : (
          filteredCases.map((tc, idx) => {
            const originalIndex = testCases.findIndex((t) => t === tc);
            const effectiveCategory: TestCaseCategory =
              tc.testType || (tc.isHidden ? 'PRETEST' : 'SAMPLE');

            return (
              <div
                key={tc.id || idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      #{idx + 1}
                    </span>

                    {/* Category Selector 3-way toggle */}
                    <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTestCase(originalIndex, {
                            testType: 'SAMPLE',
                            isHidden: false,
                          })
                        }
                        className={`px-2 py-0.5 rounded ${
                          effectiveCategory === 'SAMPLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🟢 Sample
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTestCase(originalIndex, {
                            testType: 'PRETEST',
                            isHidden: true,
                          })
                        }
                        className={`px-2 py-0.5 rounded ${
                          effectiveCategory === 'PRETEST'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🟡 Pretest
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTestCase(originalIndex, {
                            testType: 'SYSTEM',
                            isHidden: true,
                          })
                        }
                        className={`px-2 py-0.5 rounded ${
                          effectiveCategory === 'SYSTEM'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        🟣 System
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span>Points:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tc.points ?? 10}
                        onChange={(e) =>
                          handleUpdateTestCase(originalIndex, {
                            points: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTestCase(originalIndex)}
                      className="text-slate-500 hover:text-rose-400 text-xs transition-colors p-1"
                      title="Delete test case"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Input (stdin):
                    </label>
                    <textarea
                      rows={2}
                      value={tc.inputData}
                      onChange={(e) =>
                        handleUpdateTestCase(originalIndex, { inputData: e.target.value })
                      }
                      placeholder="e.g. 5&#10;1 2 3 4 5"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Expected Output (stdout):
                    </label>
                    <textarea
                      rows={2}
                      value={tc.expectedOutput}
                      onChange={(e) =>
                        handleUpdateTestCase(originalIndex, {
                          expectedOutput: e.target.value,
                        })
                      }
                      placeholder="e.g. 15"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-emerald-300 outline-none focus:border-slate-600"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
