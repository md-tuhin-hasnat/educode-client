'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import '@/lib/monacoInit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faTerminal,
  faTimes,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faKeyboard,
  faCode,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';
import SUPPORTED_LANGUAGES_JSON from '@/data/supportedLanguages.json';

interface CodeExecutionTerminalProps {
  initialCode: string;
  language: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExecutionTerminal: React.FC<CodeExecutionTerminalProps> = ({
  initialCode,
  language,
  title = 'Interactive Code Runner',
  isOpen,
  onClose,
}) => {
  const [code, setCode] = useState(initialCode);
  const [selectedLang, setSelectedLang] = useState(language || 'cpp');
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    try {
      setIsRunning(true);
      setResult(null);
      const res = await apiClient.post('/stream/execute', {
        code,
        language: selectedLang.toLowerCase(),
        input: input || undefined,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Execution request failed';
      setResult({
        stdout: '',
        stderr: `[Server Connection Error]\n${msg}`,
        exitCode: 1,
        durationMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Terminal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FontAwesomeIcon icon={faTerminal} className="text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-teal-300 border border-slate-700 uppercase">
                  {selectedLang}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Isolated Cloud Sandbox Engine (C, C++, Java, Python, JS)</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              {SUPPORTED_LANGUAGES_JSON.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPlay} className="text-xs" />
                  <span>Run Code</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
          {/* Left Panel: Monaco Code Editor */}
          <div className="flex flex-col h-full bg-slate-950">
            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faCode} className="text-teal-400" />
                <span>Source Code</span>
              </span>
              <span className="text-[11px] text-slate-500">Editable Snippet</span>
            </div>
            <div className="flex-1 min-h-[300px]">
              <Editor
                height="100%"
                language={selectedLang === 'cpp' || selectedLang === 'c' ? 'cpp' : selectedLang}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  fontFamily: 'Fira Code, monospace',
                }}
              />
            </div>
          </div>

          {/* Right Panel: Stdin Input & Console Output */}
          <div className="flex flex-col h-full bg-slate-950 p-4 space-y-4 overflow-y-auto">
            {/* Standard Input Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                <FontAwesomeIcon icon={faKeyboard} className="text-brand-400" />
                <span>Standard Input (stdin)</span>
                <span className="text-[10px] text-slate-500 font-normal">(Optional program input)</span>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input values here (separated by lines if needed)..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Execution Console Output */}
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                  <FontAwesomeIcon icon={faTerminal} className="text-teal-400" />
                  <span>Execution Output</span>
                </label>
                {result && (
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-slate-400">
                      Duration: <strong className="text-teal-300 font-mono">{result.durationMs}ms</strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1 ${
                        result.exitCode === 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={result.exitCode === 0 ? faCheckCircle : faExclamationTriangle}
                        className="text-[10px]"
                      />
                      <span>Exit Code: {result.exitCode}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[220px] bg-slate-900/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-3 shadow-inner">
                {isRunning ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-2 text-slate-500 py-12">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-teal-400" />
                    <p className="text-xs">Compiling & executing code on cloud runner...</p>
                  </div>
                ) : result ? (
                  <>
                    {result.stdout && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                          [Standard Output (stdout)]
                        </span>
                        <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {result.stdout}
                        </pre>
                      </div>
                    )}

                    {result.stderr && (
                      <div className="space-y-1 pt-2">
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                          [Error Output (stderr)]
                        </span>
                        <pre className="text-rose-300 bg-rose-950/40 border border-rose-900/40 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                          {result.stderr}
                        </pre>
                      </div>
                    )}

                    {!result.stdout && !result.stderr && (
                      <p className="text-slate-500 italic">Program executed successfully with no output.</p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600 py-12 space-y-1">
                    <FontAwesomeIcon icon={faTerminal} className="text-3xl text-slate-700" />
                    <p className="text-xs">Click &quot;Run Code&quot; above to execute this snippet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
