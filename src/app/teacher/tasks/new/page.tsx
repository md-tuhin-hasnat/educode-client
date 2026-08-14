'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlusCircle,
  faTrash,
  faCheckCircle,
  faCode,
  faVial,
  faShieldAlt,
  faFileImport,
  faFileExport,
} from '@fortawesome/free-solid-svg-icons';
import { EduCodeEditor } from '@/components/Editor/EduCodeEditor';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [maxPoints, setMaxPoints] = useState(100);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowedLanguages, setAllowedLanguages] = useState(['cpp', 'python']);
  const [testCases, setTestCases] = useState([
    { input: '5\n10 20 30 40 50', expectedOutput: 'Sum = 150', isHidden: false, points: 10 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Test Case Maker State
  const [referenceSolution, setReferenceSolution] = useState('');
  const [referenceLanguage, setReferenceLanguage] = useState('cpp');
  const [isGeneratingOutputs, setIsGeneratingOutputs] = useState(false);
  const [isIdeOpen, setIsIdeOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(json => {
        const c = json.data?.items || json.items || json;
        if (Array.isArray(c)) {
          setCourses(c);
          if (c.length > 0) setCourseId(c[0].id);
        }
      })
      .catch(err => console.error("Failed to load courses", err));
    }
  }, [user]);

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

  const handleGenerateOutputs = async () => {
    if (!referenceSolution.trim()) {
      alert("Please provide a reference solution code.");
      return;
    }
    if (testCases.length === 0) {
      alert("Please add at least one test case.");
      return;
    }
    setIsGeneratingOutputs(true);
    
    try {
      const updatedTestCases = [...testCases];
      let hasError = false;
      
      for (let i = 0; i < updatedTestCases.length; i++) {
        const tc = updatedTestCases[i];
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stream/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify({
            code: referenceSolution,
            language: referenceLanguage,
            input: tc.input || ''
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.exitCode === 0) {
             updatedTestCases[i].expectedOutput = (data.stdout || '').trimEnd();
          } else {
             console.error(`Execution error for test case ${i+1}:`, data.stderr);
             updatedTestCases[i].expectedOutput = `[Execution Error]\n${data.stderr}`;
             hasError = true;
          }
        } else {
          console.error(`Failed to execute test case ${i+1}`);
          updatedTestCases[i].expectedOutput = `[Server Error]`;
          hasError = true;
        }
      }
      
      setTestCases(updatedTestCases);
      if (hasError) {
        alert("Outputs generated, but some test cases had execution errors.");
      } else {
        alert("Outputs successfully generated for all test cases!");
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during output generation');
    } finally {
      setIsGeneratingOutputs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          courseId: courseId || 'course-123',
          title,
          description,
          taskType: 'assignment',
          language: allowedLanguages[0] || 'cpp',
          maxPoints: Number(maxPoints),
          deadline: new Date(Date.now() + 86400000 * 7).toISOString(), // Default 1 week
          testCases: testCases.map(tc => ({
            inputData: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            points: Number(tc.points)
          }))
        })
      });

      if (res.ok) {
        router.push('/teacher/dashboard');
      } else {
        const err = await res.json();
        alert(`Failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const packageData = {
      title,
      description,
      allowedLanguages,
      maxPoints,
      testCases,
      referenceSolution,
      referenceLanguage
    };
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title ? title.replace(/\s+/g, '_') : 'problem_package'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.allowedLanguages) setAllowedLanguages(parsed.allowedLanguages);
        if (parsed.maxPoints) setMaxPoints(parsed.maxPoints);
        if (parsed.testCases) setTestCases(parsed.testCases);
        if (parsed.referenceSolution) setReferenceSolution(parsed.referenceSolution);
        if (parsed.referenceLanguage) setReferenceLanguage(parsed.referenceLanguage);
        
        alert("Package imported successfully!");
      } catch (err) {
        console.error("Invalid package", err);
        alert("Failed to parse the package file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white">Create Problem</h1>
          <p className="text-xs text-slate-400 mt-1">Design programming problems with automated test case generation.</p>
        </div>
        <div className="flex space-x-3">
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-2 border border-slate-700 transition-colors">
            <FontAwesomeIcon icon={faFileImport} />
            <span>Import Package</span>
          </button>
          <button type="button" onClick={handleExport} className="px-4 py-2 bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 text-xs font-bold rounded-xl flex items-center space-x-2 border border-brand-500/30 transition-colors">
            <FontAwesomeIcon icon={faFileExport} />
            <span>Export Package</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Task Info */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <FontAwesomeIcon icon={faCode} className="text-brand-500" />
            <span>Task Metadata</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              >
                {courses.length === 0 ? <option value="">No courses found</option> : null}
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title || c.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Points</label>
              <input
                type="number"
                required
                min="0"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

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

        {/* Test Case Maker (Programmatic) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faCode} className="text-purple-500" />
              <span>Reference Solution (Test Case Maker)</span>
            </h3>
            <select
              value={referenceLanguage}
              onChange={(e) => setReferenceLanguage(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">
            Write a correct solution to programmatically generate the expected outputs for all your test case inputs. 
            This saves time and avoids manual calculation errors.
          </p>
          <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-mono">Solution Code</span>
              <button
                type="button"
                onClick={() => setIsIdeOpen(true)}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-brand-500/20"
              >
                <FontAwesomeIcon icon={faCode} />
                <span>Open IDE</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 cursor-pointer hover:bg-slate-900/50 transition-colors" onClick={() => setIsIdeOpen(true)}>
              {referenceSolution || `// No solution provided yet.\n// Click "Open IDE" to start writing your reference solution.`}
            </pre>
          </div>
        </div>

        {/* Test Cases Setup */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faVial} className="text-tealAccent-500" />
              <span>Automated Evaluation Test Cases ({testCases.length})</span>
            </h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleGenerateOutputs}
                disabled={isGeneratingOutputs}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold flex items-center space-x-1 border border-purple-500/30 transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCode} />
                <span>{isGeneratingOutputs ? 'Generating...' : 'Generate Outputs'}</span>
              </button>
              <button
                type="button"
                onClick={handleAddTestCase}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-tealAccent-400 text-xs font-semibold flex items-center space-x-1 border border-slate-700"
              >
                <FontAwesomeIcon icon={faPlusCircle} />
                <span>Add Test Case</span>
              </button>
            </div>
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

                <div className="grid grid-cols-3 gap-3">
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
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Points</label>
                    <input
                      type="number"
                      value={tc.points}
                      onChange={(e) => {
                        const updated = [...testCases];
                        updated[idx].points = Number(e.target.value);
                        setTestCases(updated);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 focus:border-brand-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition-all"
        >
          <FontAwesomeIcon icon={faCheckCircle} />
          <span>{isSubmitting ? 'Publishing Problem...' : 'Publish Problem'}</span>
        </button>
      </form>

      {/* Full-Page IDE Modal */}
      {isIdeOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <FontAwesomeIcon icon={faCode} className="text-brand-400 text-lg" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Reference Solution IDE</h2>
                <p className="text-xs text-slate-400">Write your solution to generate test case outputs</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Language:</span>
                <select
                  value={referenceLanguage}
                  onChange={(e) => setReferenceLanguage(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none"
                >
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setIsIdeOpen(false)}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center space-x-2"
              >
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Done Coding</span>
              </button>
            </div>
          </div>
          
          {/* Monaco Editor */}
          <div className="flex-1 w-full min-h-0 bg-[#1e1e1e] flex flex-col">
            <EduCodeEditor
              context="assignments"
              language={referenceLanguage === 'c' ? 'cpp' : referenceLanguage}
              value={referenceSolution}
              onChange={(value) => setReferenceSolution(value || '')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
