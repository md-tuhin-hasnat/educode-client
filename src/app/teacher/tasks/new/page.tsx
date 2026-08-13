'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
  faTrash,
  faCheckCircle,
  faCode,
  faVial,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';

export default function CreateTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState(['cpp', 'python']);
  const [testCases, setTestCases] = useState([
    { input: '5\n10 20 30 40 50', expectedOutput: 'Sum = 150', isHidden: false, points: 10 },
  ]);
  const [proctoredMode, setProctoredMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTestCase = () => {
    setTestCases([
      ...testCases,
      { input: '', expectedOutput: '', isHidden: true, points: 10 },
    ]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const toggleLanguage = (lang: string) => {
    if (allowedLanguages.includes(lang)) {
      setAllowedLanguages(allowedLanguages.filter((l) => l !== lang));
    } else {
      setAllowedLanguages([...allowedLanguages, lang]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/teacher/dashboard');
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h1 className="text-xl font-bold text-white">Create New Assessment Task</h1>
        <p className="text-xs text-slate-400 mt-1">Configure automated test cases, code templates, and proctoring rules.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Task Info */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <FontAwesomeIcon icon={faCode} className="text-brand-500" />
            <span>Task Metadata</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Binary Search Tree Insertion & Traversal"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Problem Description</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem, input formats, constraints, and time limits..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Allowed Programming Languages</label>
            <div className="flex items-center space-x-3">
              {['cpp', 'c', 'python', 'java'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all ${
                    allowedLanguages.includes(lang)
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test Cases Setup */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faVial} className="text-tealAccent-500" />
              <span>Automated Evaluation Test Cases ({testCases.length})</span>
            </h3>
            <button
              type="button"
              onClick={handleAddTestCase}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-tealAccent-400 text-xs font-semibold flex items-center space-x-1 border border-slate-700"
            >
              <FontAwesomeIcon icon={faPlusCircle} />
              <span>Add Test Case</span>
            </button>
          </div>

          <div className="space-y-3">
            {testCases.map((tc, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Test Case #{idx + 1}</span>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400">
                      <input
                        type="checkbox"
                        checked={tc.isHidden}
                        onChange={(e) => {
                          const updated = [...testCases];
                          updated[idx].isHidden = e.target.checked;
                          setTestCases(updated);
                        }}
                        className="rounded bg-slate-800 border-slate-700 text-brand-600 focus:ring-brand-500"
                      />
                      <span>Hidden Evaluation Case</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveTestCase(idx)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Standard Input (stdin)</label>
                    <textarea
                      rows={2}
                      value={tc.input}
                      onChange={(e) => {
                        const updated = [...testCases];
                        updated[idx].input = e.target.value;
                        setTestCases(updated);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-tealAccent-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Expected Output (stdout)</label>
                    <textarea
                      rows={2}
                      value={tc.expectedOutput}
                      onChange={(e) => {
                        const updated = [...testCases];
                        updated[idx].expectedOutput = e.target.value;
                        setTestCases(updated);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrity Proctoring Rules */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <FontAwesomeIcon icon={faShieldAlt} className="text-brand-400" />
              <span>Enable Academic Integrity Proctoring</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Logs focus lost events, screenshot audits, and runs plagiarism similarity checks upon submission.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={proctoredMode}
              onChange={(e) => setProctoredMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition-all"
        >
          <FontAwesomeIcon icon={faCheckCircle} />
          <span>{isSubmitting ? 'Publishing Task...' : 'Publish Assessment Task'}</span>
        </button>
      </form>
    </div>
  );
}
