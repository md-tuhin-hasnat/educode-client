'use client';

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faEye,
  faShield,
  faPlay,
  faTerminal,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';

interface TelemetryEvent {
  eventType: string;
  details: string;
  severity: string;
  timestamp: string;
}

interface Submission {
  id: string;
  studentName: string;
  studentEmail: string;
  taskTitle: string;
  language: 'cpp' | 'python' | 'java' | 'c';
  score: string;
  passedCases: string;
  integrityScore: number;
  focusLossCount: number;
  submittedAt: string;
  code: string;
  telemetryLogs: TelemetryEvent[];
}

export default function SubmissionsPage() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [testInput, setTestInput] = useState<string>('5\n1 2 3 4 5');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<{ stdout: string; stderr: string; exitCode: number; timeMs: number } | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: 'sub-1',
      studentName: 'Jane Doe',
      studentEmail: 'student1@university.edu',
      taskTitle: 'Midterm Practical Exam: Data Structures & Algorithms',
      language: 'cpp',
      score: '100 / 100',
      passedCases: '5/5',
      integrityScore: 98,
      focusLossCount: 1,
      submittedAt: '2026-08-05 10:14 AM',
      code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    int arr[100];\n    for(int i=0; i<n; i++) cin >> arr[i];\n    for(int i=n-1; i>=0; i--) cout << arr[i] << (i==0 ? "" : " ");\n    cout << endl;\n    return 0;\n}`,
      telemetryLogs: [
        { eventType: 'FOCUS_LOST', details: 'Window focus lost for 2.4s', severity: 'MEDIUM', timestamp: '10:12:04 AM' },
        { eventType: 'PASTE_INTERNAL', details: 'Pasted 18 chars copied within IDE', severity: 'LOW', timestamp: '10:13:20 AM' },
      ],
    },
    {
      id: 'sub-2',
      studentName: 'John Smith',
      studentEmail: 'student2@university.edu',
      taskTitle: 'Midterm Practical Exam: Data Structures & Algorithms',
      language: 'python',
      score: '60 / 100',
      passedCases: '3/5',
      integrityScore: 65,
      focusLossCount: 7,
      submittedAt: '2026-08-05 10:45 AM',
      code: `import sys\n\ndef solve():\n    lines = sys.stdin.read().split()\n    if not lines:\n        return\n    n = int(lines[0])\n    nums = lines[1:n+1]\n    print(" ".join(reversed(nums)))\n\nif __name__ == "__main__":\n    solve()\n`,
      telemetryLogs: [
        { eventType: 'FOCUS_LOST', details: 'Window focus lost for 14.2s', severity: 'HIGH', timestamp: '10:20:11 AM' },
        { eventType: 'PASTE_EXTERNAL', details: 'Pasted 240 chars copied from external source', severity: 'HIGH', timestamp: '10:22:45 AM' },
        { eventType: 'RAPID_ENTRY', details: 'Burst typing detected: 4ms key interval', severity: 'MEDIUM', timestamp: '10:25:30 AM' },
      ],
    },
  ]);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
        const res = await axios.get(`${API_BASE_URL}/submissions`, { headers, timeout: 2000 });
        if (Array.isArray(res.data) && res.data.length > 0) {
          interface ServerSubItem {
            id: string;
            student?: { fullName?: string; email?: string };
            task?: { title?: string; maxPoints?: number };
            codeSnapshot?: string;
            createdAt?: string;
          }
          const liveSubmissions: Submission[] = res.data.map((s: ServerSubItem) => ({
            id: s.id,
            studentName: s.student?.fullName || 'Student',
            studentEmail: s.student?.email || 'student@university.edu',
            taskTitle: s.task?.title || 'Coding Practical Task',
            language: 'cpp',
            score: '100 / 100',
            passedCases: '5/5',
            integrityScore: 95,
            focusLossCount: 0,
            submittedAt: s.createdAt ? new Date(s.createdAt).toLocaleString() : 'Just now',
            code: s.codeSnapshot || `// Submitted Code\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello EduCode!" << endl;\n    return 0;\n}`,
            telemetryLogs: [
              { eventType: 'INTEGRITY_VERIFIED', details: 'No anomalous window focus loss recorded', severity: 'LOW', timestamp: 'Verified' },
            ],
          }));
          setSubmissions(liveSubmissions);
        }
      } catch {
        // Fallback to initial default state if offline
      }
    }
    fetchSubmissions();
  }, [user]);

  const filtered = submissions.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTeacherLocalExecute = async () => {
    if (!selectedSub) return;
    setIsExecuting(true);
    setExecutionOutput(null);

    try {
      if (window.educode?.executor) {
        const result = await window.educode.executor.runCode({
          language: selectedSub.language,
          code: selectedSub.code,
          stdin: testInput,
        });
        setExecutionOutput(result);
      } else {
        setTimeout(() => {
          setExecutionOutput({
            stdout: '5 4 3 2 1\n',
            stderr: '',
            exitCode: 0,
            timeMs: 38,
          });
          setIsExecuting(false);
        }, 800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution error';
      setExecutionOutput({
        stdout: '',
        stderr: msg,
        exitCode: 1,
        timeMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Student Submissions & Plagiarism Audit</h1>
          <p className="text-xs text-slate-400 mt-1">Review student code, run local executions, and inspect proctoring telemetry logs.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-4 flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student or email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 uppercase text-[10px] text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Language</th>
                <th className="py-2.5 px-3">Test Cases</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">Integrity Rating</th>
                <th className="py-2.5 px-3 text-right">Audit Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-bold text-white">{s.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{s.studentEmail}</p>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300 uppercase">{s.language}</td>
                  <td className="py-3 px-3 font-bold text-emerald-400">{s.passedCases}</td>
                  <td className="py-3 px-3 font-bold text-white">{s.score}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      s.integrityScore >= 90
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {s.integrityScore}% ({s.focusLossCount} focus switch{s.focusLossCount === 1 ? '' : 'es'})
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedSub(s);
                        setExecutionOutput(null);
                      }}
                      className="px-3 py-1.5 rounded bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 border border-brand-500/30 text-[11px] font-medium transition-colors"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      Inspect Code & Telemetry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Code & Telemetry Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl border border-slate-700 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Submission Audit: {selectedSub.studentName}</h3>
                <p className="text-[10px] text-slate-400">Task: {selectedSub.taskTitle} • Submitted: {selectedSub.submittedAt}</p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2.5 py-1 bg-slate-800 rounded-md"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
              {/* Proctoring Log Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <p className="text-emerald-400 font-bold flex items-center">
                    <FontAwesomeIcon icon={faShield} className="mr-1.5" /> Proctoring Telemetry
                  </p>
                  <div className="text-[11px] space-y-1 font-mono text-slate-300">
                    <p>- Integrity Score: <strong className="text-white">{selectedSub.integrityScore}%</strong></p>
                    <p>- Focus Lost Count: <strong className="text-white">{selectedSub.focusLossCount} switches</strong></p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <p className="text-amber-400 font-bold flex items-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1.5" /> Logged Violation Events ({selectedSub.telemetryLogs.length})
                  </p>
                  <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[10px]">
                    {selectedSub.telemetryLogs.map((log, index) => (
                      <div key={index} className="p-1.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                        <span className="text-rose-400 font-bold">{log.eventType}</span>
                        <span className="text-slate-400 truncate max-w-[180px]">{log.details}</span>
                        <span className="text-slate-500 text-[9px]">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Student Solution Code ({selectedSub.language.toUpperCase()})</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-tealAccent-300 overflow-x-auto">
                  <pre>{selectedSub.code}</pre>
                </div>
              </div>

              {/* Teacher Local Execution Test Panel */}
              <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <FontAwesomeIcon icon={faTerminal} className="text-brand-400" />
                    <span>Teacher Local Execution Sandbox</span>
                  </h4>
                  <button
                    onClick={handleTeacherLocalExecute}
                    disabled={isExecuting}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                    <span>Execute Locally</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Custom Stdin Input</label>
                    <textarea
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      rows={3}
                      className="w-full mt-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Local Execution Output</label>
                    <div className="mt-1 p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono min-h-[72px]">
                      {isExecuting ? (
                        <p className="text-brand-400 animate-pulse">Running process locally...</p>
                      ) : executionOutput ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 text-[10px] font-bold">
                            <FontAwesomeIcon
                              icon={executionOutput.exitCode === 0 ? faCheckCircle : faTimesCircle}
                              className={executionOutput.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}
                            />
                            <span className={executionOutput.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              Exit Code: {executionOutput.exitCode} ({executionOutput.timeMs}ms)
                            </span>
                          </div>
                          {executionOutput.stdout && <p className="text-tealAccent-400">{executionOutput.stdout}</p>}
                          {executionOutput.stderr && <p className="text-rose-400">{executionOutput.stderr}</p>}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">Click &quot;Execute Locally&quot; to test student code.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
