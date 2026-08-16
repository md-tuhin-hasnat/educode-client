'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faCode,
  faServer,
  faDatabase,
  faVial,
  faTerminal,
  faLayerGroup,
  faShieldHalved,
  faFileCode,
  faCheck,
  faCopy,
  faSearch,
  faArrowLeft,
  faExternalLinkAlt,
  faBoxes,
  faNetworkWired,
  faSliders,
  faClock,
  faMicrochip,
  faCheckCircle,
  faFolderOpen,
  faCodeBranch,
} from '@fortawesome/free-solid-svg-icons';

interface CodeSnippetProps {
  code: string;
  language?: string;
  filename?: string;
}

function CodeSnippet({ code, language = 'bash', filename }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px]">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          {filename && <span className="ml-2 font-semibold text-slate-300">{filename}</span>}
        </div>
        <div className="flex items-center space-x-3">
          <span className="uppercase text-[10px] text-slate-500 font-bold">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-slate-400 hover:text-emerald-400 transition-colors"
            title="Copy code"
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-xs" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const SECTIONS = [
  { id: 'overview', title: 'Architecture Overview', icon: faNetworkWired },
  { id: 'project-structure', title: 'Modular Directory Structure', icon: faFolderOpen },
  { id: 'client-architecture', title: 'Client Submodules', icon: faLayerGroup },
  { id: 'server-architecture', title: 'Server & Execution Sandbox', icon: faServer },
  { id: 'test-case-engine', title: '3-Way Test Suite & Checkers', icon: faVial },
  { id: 'json-datasets', title: 'JSON Data Configuration', icon: faBoxes },
  { id: 'api-reference', title: 'REST API & WebSockets', icon: faCode },
  { id: 'database-models', title: 'Database & Prisma Models', icon: faDatabase },
  { id: 'local-setup', title: 'Local Setup & Dev Commands', icon: faTerminal },
  { id: 'security-roles', title: 'Security & Role Permissions', icon: faShieldHalved },
];

export default function DeveloperDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.filter((s) => s.title.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            <span>Back to App</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <FontAwesomeIcon icon={faBook} className="text-white text-sm" />
            </div>
            <div>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 text-base tracking-tight">
                EduCode
              </span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Dev Docs v2.4
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
            />
            <input
              type="text"
              placeholder="Search developer docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <Link
            href="/docs/dev/index.html"
            target="_blank"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-800 flex items-center space-x-1.5 transition-colors"
          >
            <span>Raw HTML</span>
            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
          </Link>
        </div>
      </header>

      {/* Horizontal Quick-Jump Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2.5 overflow-x-auto scrollbar-none">
        <div className="max-w-5xl mx-auto flex items-center space-x-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-2 flex-shrink-0">
            Sections:
          </span>
          {filteredSections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeSection === sec.id
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <FontAwesomeIcon
                icon={sec.icon}
                className={`text-[11px] ${
                  activeSection === sec.id ? 'text-purple-400' : 'text-slate-500'
                }`}
              />
              <span>{sec.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Main Content Layout (Single-Column Reader) */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="space-y-16 pb-24">
          {/* Section 1: Overview */}
          <section id="overview" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faNetworkWired} />
              <span>System Overview</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              EduCode Architecture & Engineering Guide
            </h1>
            <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
              EduCode is a comprehensive automated coding, examination, and classroom engineering platform designed for university computer science curriculums. It features a full-featured online IDE, Codeforces/Polygon-style task engineering suite, sandboxed multilingual code execution, real-time collaboration streams, and rigorous plagiarism detection.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-purple-400 font-bold text-sm mb-1">Frontend Client</div>
                <div className="text-xs text-slate-400">Next.js 14 App Router, React 18, Tailwind CSS, Monaco Editor, KaTeX math renderer, Socket.IO.</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-emerald-400 font-bold text-sm mb-1">Backend Server</div>
                <div className="text-xs text-slate-400">NestJS framework, Prisma ORM, PostgreSQL database, Subprocess sandboxing, WebSocket Gateway.</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-cyan-400 font-bold text-sm mb-1">Judge Engine</div>
                <div className="text-xs text-slate-400">Time & memory limits, 3-way test suite (Sample, Pretest, System), Float tolerance, Token multiset & Polygon scripts.</div>
              </div>
            </div>
          </section>

          {/* Section 2: Modular Directory Structure */}
          <section id="project-structure" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faFolderOpen} />
              <span>Project Structure</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Modular Codebase Organization
            </h2>
            <p className="text-sm text-slate-300">
              The project is organized as a modular monorepo containing client, server, and shared datasets.
            </p>

            <CodeSnippet
              language="text"
              filename="Directory Hierarchy"
              code={`coding lab/
├── educode-client/                     # Next.js 14 Web Application & Electron frontend
│   ├── src/
│   │   ├── app/                        # Next.js App Router pages (student, teacher, admin, docs)
│   │   ├── components/
│   │   │   ├── task-engineering/       # Task Engineering IDE modular subcomponents
│   │   │   │   ├── types.ts            # Shared tab types, test categories, limit interfaces
│   │   │   │   ├── TaskEngineeringHeader.tsx
│   │   │   │   ├── SolutionEditorTab.tsx
│   │   │   │   ├── GeneratorEditorTab.tsx
│   │   │   │   ├── CheckerEditorTab.tsx
│   │   │   │   ├── TemplateEditorTab.tsx
│   │   │   │   ├── TestSuiteMatrixTab.tsx
│   │   │   │   └── ProblemPreviewPane.tsx
│   │   │   ├── test-runner/            # Automated Test Runner Panel subcomponents
│   │   │   │   ├── types.ts
│   │   │   │   ├── TestCaseFilterBar.tsx
│   │   │   │   ├── TestCaseResultCard.tsx
│   │   │   │   ├── AddCustomTestCaseModal.tsx
│   │   │   │   └── LiveTestLogsView.tsx
│   │   │   ├── stream/editor/          # Word & Markdown Rich Document Editor subcomponents
│   │   │   │   ├── types.ts
│   │   │   │   ├── editorUtils.ts
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── RichTextCell.tsx
│   │   │   │   ├── CodeCellCard.tsx
│   │   │   │   └── LatexEquationModal.tsx
│   │   │   ├── classroom/              # Classroom Hub tabs and modals
│   │   │   │   ├── types.ts
│   │   │   │   ├── ClassroomHeaderNav.tsx
│   │   │   │   ├── ClassroomStreamTab.tsx
│   │   │   │   ├── ClassroomClassworkTab.tsx
│   │   │   │   ├── ClassroomMaterialsTab.tsx
│   │   │   │   ├── ClassroomPeopleTab.tsx
│   │   │   │   ├── ClassroomGradesTab.tsx
│   │   │   │   ├── CreateAssessmentModal.tsx
│   │   │   │   └── CreateMaterialModal.tsx
│   │   │   └── themes.ts               # Monaco theme registrar & VS Code JSON parser
│   │   ├── data/                       # Externalized JSON configuration files
│   │   │   ├── mathSymbols.json        # Quick LaTeX symbols & formulas
│   │   │   ├── checkerPresets.json     # Polygon checker preset configs
│   │   │   ├── checkerScripts.json     # Python verification judge scripts
│   │   │   ├── taskEngineeringTemplates.json # Authoring reference solutions & generators
│   │   │   ├── starterTemplates.json   # Language boilerplates (C++, C, Python, Java, JS)
│   │   │   ├── generatorTemplates.json # Random test case generator scripts
│   │   │   ├── supportedLanguages.json # Languages metadata & compiler flags
│   │   │   └── monacoThemes.json       # Editor color themes & syntax rules
│   │   └── utils/
│   │       ├── testCaseChecker.ts      # Client-side Polygon evaluation engine
│   │       ├── testCaseRunner.ts       # Subprocess & WebWorker testcase execution runner
│   │       ├── mathRenderer.ts        # KaTeX LaTeX HTML formula serializer
│   │       └── syntaxValidator.ts     # Real-time static syntax validator
│   └── public/
│       └── docs/dev/index.html         # Standalone HTML Developer Documentation
│
├── educode-server/                     # NestJS Backend API & Judge Daemon
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                   # JWT Auth, bcrypt hashing, RolesGuard
│   │   │   ├── classroom/              # Courses, Assessments, Tasks, Grades
│   │   │   ├── stream/                 # Posts, Comments, WebSockets, Code Execution
│   │   │   │   ├── code-execution.service.ts # Sandboxed compilation & process runner
│   │   │   │   ├── stream.service.ts
│   │   │   │   └── stream.gateway.ts
│   │   │   ├── submissions/            # Submission queue & batch grading
│   │   │   └── plagiarism/             # Token-based AST similarity analyzer
│   │   └── prisma/
│   │       └── schema.prisma           # Relational schema (User, Course, Task, TestCase, etc.)
`}
            />
          </section>

          {/* Section 3: Client Submodules */}
          <section id="client-architecture" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faLayerGroup} />
              <span>Client Architecture</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Client Modular Subsystems
            </h2>
            <p className="text-sm text-slate-300">
              Each major view in the client is split into clean, modular subcomponents with dedicated types, ensuring high maintainability and testability:
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                  <FontAwesomeIcon icon={faSliders} />
                  <span>1. Task Engineering IDE (`components/task-engineering/`)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Allows instructors to author problem reference solutions, random test generators, Codeforces-style custom checkers, starter code templates, and manage the full test suite matrix with 3-way test categories (`SAMPLE`, `PRETEST`, `SYSTEM`).
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Exported components: `TaskEngineeringHeader`, `SolutionEditorTab`, `GeneratorEditorTab`, `CheckerEditorTab`, `TemplateEditorTab`, `TestSuiteMatrixTab`, `ProblemPreviewPane`.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <FontAwesomeIcon icon={faVial} />
                  <span>2. Test Runner Panel (`components/test-runner/`)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Executes student code against test cases, streams execution logs, calculates CPU time and memory consumption, displays expected vs actual output diffs, and hides private system tests.
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Exported components: `TestCaseFilterBar`, `TestCaseResultCard`, `AddCustomTestCaseModal`, `LiveTestLogsView`.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                  <FontAwesomeIcon icon={faFileCode} />
                  <span>3. Word & Markdown Editor (`components/stream/editor/`)</span>
                </div>
                <p className="text-xs text-slate-400">
                  A Notion/Word style multi-block content editor supporting inline rich text, interactive KaTeX LaTeX formulas, runnable Monaco code cells with live stdin/stdout, and @mention autocomplete.
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Exported components: `EditorToolbar`, `RichTextCell`, `CodeCellCard`, `LatexEquationModal`, `editorUtils.ts`.
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Server & Sandboxed Code Execution */}
          <section id="server-architecture" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faServer} />
              <span>Server & Execution Engine</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Sandboxed Subprocess Code Execution
            </h2>
            <p className="text-sm text-slate-300">
              The backend encapsulates all compilation and execution logic in <code className="text-amber-400 font-mono text-xs">CodeExecutionService</code> (`code-execution.service.ts`). It safely compiles C/C++/Java and runs Python/JavaScript in an isolated temporary working directory with strict timeouts and resource bounds.
            </p>

            <CodeSnippet
              language="typescript"
              filename="educode-server/src/modules/stream/code-execution.service.ts"
              code={`@Injectable()
export class CodeExecutionService {
  async executeCode(dto: ExecuteCodeDto): Promise<ExecutionResult> {
    const tempDir = path.join(process.cwd(), 'tmp_runner', \`exec_\${Date.now()}_\${Math.random().toString(36).substring(7)}\`);
    fs.mkdirSync(tempDir, { recursive: true });

    const startTime = Date.now();
    let stdout = '', stderr = '', exitCode = 0;
    const lang = dto.language.toLowerCase() as Language;

    try {
      if (lang === 'cpp') {
        const srcPath = path.join(tempDir, 'main.cpp');
        const binPath = path.join(tempDir, 'main_bin');
        fs.writeFileSync(srcPath, dto.code);

        // Compile with GCC 17
        const compileRes = await execPromise(\`g++ -std=c++17 "\${srcPath}" -o "\${binPath}"\`, { cwd: tempDir })
          .catch(err => ({ stdout: '', stderr: err.stderr || err.message }));

        if (compileRes.stderr && !fs.existsSync(binPath)) {
          stderr = \`[Compilation Error]\\n\${compileRes.stderr}\`;
          exitCode = 1;
        } else {
          const runRes = await this.runCommandWithInput(\`"\${binPath}"\`, tempDir, dto.input, dto.timeoutMs);
          stdout = runRes.stdout;
          stderr = runRes.stderr;
        }
      }
      // ... Python, C, Java, JavaScript
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return { stdout: stdout.trimEnd(), stderr: stderr.trimEnd(), exitCode, durationMs: Date.now() - startTime };
  }
}`}
            />
          </section>

          {/* Section 5: 3-Way Test Suite & Checkers */}
          <section id="test-case-engine" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faVial} />
              <span>Testing Lab</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              3-Way Test Suite Categories & Polygon Checkers
            </h2>
            <p className="text-sm text-slate-300">
              EduCode implements a 3-tier testcase classification model inspired by competitive programming judges (Codeforces / Polygon):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30">
                <div className="text-emerald-400 font-bold text-sm flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>1. Sample Tests</span>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Publicly visible on the problem statement. Students can view both standard input and expected output directly.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30">
                <div className="text-blue-400 font-bold text-sm flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>2. Pretests</span>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Hidden during problem view, but students have the option to execute them before submitting. Diagnostic verdicts (AC/WA) are returned without revealing private data.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30">
                <div className="text-purple-400 font-bold text-sm flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>3. System Tests</span>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Private grading test cases. Inaccessible by students and executed exclusively upon final assignment/exam submission.
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white pt-4">Supported Checker Types</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-slate-400 font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-800">Checker ID</th>
                    <th className="p-3 border-b border-slate-800">Description</th>
                    <th className="p-3 border-b border-slate-800">Tolerance / Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/60 font-mono text-[11px]">
                  <tr>
                    <td className="p-3 text-purple-400 font-bold">EXACT</td>
                    <td className="p-3 text-slate-300">Exact token & whitespace-normalized comparison</td>
                    <td className="p-3 text-slate-400">Token-by-token equality</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-emerald-400 font-bold">FLOAT_TOLERANCE</td>
                    <td className="p-3 text-slate-300">Floating-point / double precision error tolerance</td>
                    <td className="p-3 text-slate-400">|a - b| ≤ ε or |a - b| / max(1, |a|) ≤ ε (default 1e-6)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-blue-400 font-bold">CASE_INSENSITIVE</td>
                    <td className="p-3 text-slate-300">Case-insensitive output match (YES/yes, True/true)</td>
                    <td className="p-3 text-slate-400">token.lower() == expected.lower()</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-amber-400 font-bold">UNORDERED_TOKENS</td>
                    <td className="p-3 text-slate-300">Order-independent token multiset verification</td>
                    <td className="p-3 text-slate-400">Counter(actual) == Counter(expected)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-pink-400 font-bold">CUSTOM_SCRIPT</td>
                    <td className="p-3 text-slate-300">Polygon custom Python judge script</td>
                    <td className="p-3 text-slate-400"><code>def check(inf, ans, ouf) -&gt; (bool, msg)</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6: JSON Data Configuration */}
          <section id="json-datasets" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faBoxes} />
              <span>Configuration Files</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Externalized JSON Datasets
            </h2>
            <p className="text-sm text-slate-300">
              All static assets and presets are decoupled into JSON files in <code className="text-cyan-400 font-mono text-xs">src/data/</code>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono">mathSymbols.json</span>
                <p className="text-slate-400 text-[11px] mt-1">LaTeX symbols, calculus operators, asymptotic complexities.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono">checkerPresets.json</span>
                <p className="text-slate-400 text-[11px] mt-1">Validation rules, descriptions, and UI badges for checkers.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono">checkerScripts.json</span>
                <p className="text-slate-400 text-[11px] mt-1">Python judge scripts for exact, float, and multiset verification.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono">starterTemplates.json</span>
                <p className="text-slate-400 text-[11px] mt-1">Default skeleton code for C++, C, Python, Java, and JS.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono">taskEngineeringTemplates.json</span>
                <p className="text-slate-400 text-[11px] mt-1">Reference solutions, generator scripts, and starter code for authoring.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono">monacoThemes.json</span>
                <p className="text-slate-400 text-[11px] mt-1">Monaco dark/light syntax themes and editor UI styling tokens.</p>
              </div>
            </div>
          </section>

          {/* Section 7: REST API & WebSockets */}
          <section id="api-reference" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faCode} />
              <span>API Reference</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              REST API Endpoints & Real-time WebSockets
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">POST</span>
                  <span className="text-slate-200">/api/stream/execute</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Executes code in sandbox. Request body: <code className="text-purple-300">{`{ code, language, input, timeoutMs }`}</code>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                  <span className="text-slate-200">/api/tasks/:id/testcases</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Retrieves testcases for a task. Filtered according to caller role (faculty/student).
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">POST</span>
                  <span className="text-slate-200">/api/submissions/submit</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Submits student solution for automated grading against full system test suite.
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white pt-4">Socket.IO Events</h3>
            <CodeSnippet
              language="typescript"
              filename="WebSocket Gateway Events"
              code={`// Stream & Collaboration Gateway: ws://localhost:3001
socket.emit('joinRoom', { roomId: 'course_123' });

// Live Events Received:
socket.on('postCreated', (post: Post) => { /* Update stream feed */ });
socket.on('commentAdded', (comment: Comment) => { /* Append comment to post */ });
socket.on('submissionEvaluated', (result: SubmissionResult) => { /* Live grade update */ });`}
            />
          </section>

          {/* Section 8: Database & Prisma Models */}
          <section id="database-models" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faDatabase} />
              <span>Database Schema</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Prisma Database Schema
            </h2>
            <p className="text-sm text-slate-300">
              The PostgreSQL database schema is managed via Prisma ORM (`schema.prisma`):
            </p>

            <CodeSnippet
              language="prisma"
              filename="educode-server/prisma/schema.prisma"
              code={`model Task {
  id              String         @id @default(uuid())
  title           String
  description     String
  timeLimitMs     Int            @default(2000)
  memoryLimitMb   Int            @default(256)
  allowedLanguage String?        @default("Any")
  starterCode     String?
  solutionCode    String?
  generatorCode   String?
  checkerType     String         @default("EXACT")
  floatTolerance  Float?         @default(0.000001)
  customChecker   String?
  testCases       TestCase[]
  submissions     Submission[]
}

model TestCase {
  id          String   @id @default(uuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  input       String
  expected    String
  category    String   @default("SYSTEM") // SAMPLE | PRETEST | SYSTEM
  isSample    Boolean  @default(false)
  isPretest   Boolean  @default(false)
  orderIndex  Int      @default(0)
}`}
            />
          </section>

          {/* Section 9: Local Setup & Dev Commands */}
          <section id="local-setup" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faTerminal} />
              <span>Development Setup</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Local Development Commands
            </h2>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  1. Start All Services (Client + Server + Database)
                </h4>
                <CodeSnippet
                  language="bash"
                  code={`# From the root repository directory:
npm run start

# Or start services individually:
cd educode-server && npm run start:dev  # NestJS API on http://localhost:3001
cd educode-client && npm run dev        # Next.js on http://localhost:3000`}
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  2. Run Unit Test Suites
                </h4>
                <CodeSnippet
                  language="bash"
                  code={`# Run Client Jest Tests:
cd educode-client && npm test -- --watchAll=false

# Run Server Tests:
cd educode-server && npm test`}
                />
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  3. Verify TypeScript Compilation
                </h4>
                <CodeSnippet
                  language="bash"
                  code={`# Client typecheck:
cd educode-client && npx tsc --noEmit

# Server build:
cd educode-server && npm run build`}
                />
              </div>
            </div>
          </section>

          {/* Section 10: Security & Roles */}
          <section id="security-roles" className="scroll-mt-24 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
              <FontAwesomeIcon icon={faShieldHalved} />
              <span>Security & Roles</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Role-Based Access Control (RBAC) & Test Accounts
            </h2>
            <p className="text-sm text-slate-300">
              EduCode enforces strict role guards (`RolesGuard`) with four distinct user roles:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-purple-400 font-bold text-sm">Faculty / Instructor</div>
                <div className="text-xs text-slate-400 mt-1">Full problem authoring, test case creation, grading override, classroom management.</div>
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded-lg">
                  alan.turing@teacher.university.edu <br />
                  PW: <span className="text-emerald-400">EduCodeFaculty2026!</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-emerald-400 font-bold text-sm">Student</div>
                <div className="text-xs text-slate-400 mt-1">Solve assessments, run pretests, submit solutions, join classrooms.</div>
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded-lg">
                  stu-2026-001@student.university.edu <br />
                  PW: <span className="text-emerald-400">EduCodeStudent2026!</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-blue-400 font-bold text-sm">Teaching Assistant (TA)</div>
                <div className="text-xs text-slate-400 mt-1">Assist instructors, review student submissions, provide grading comments.</div>
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded-lg">
                  teaching.assistant.bob@ta.university.edu <br />
                  PW: <span className="text-emerald-400">EduCodeTA2026!</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="text-red-400 font-bold text-sm">System Administrator</div>
                <div className="text-xs text-slate-400 mt-1">Manage global users, courses, execution clusters, and audit logs.</div>
                <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded-lg">
                  system.administrator@admin.university.edu <br />
                  PW: <span className="text-emerald-400">EduCodeAdmin2026!</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        EduCode Platform Developer Documentation • Built with Next.js 14, NestJS & TypeScript • &copy; 2026 EduCode
      </footer>
    </div>
  );
}
