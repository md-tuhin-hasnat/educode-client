'use client';

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import '@/lib/monacoInit';
import { registerMonacoThemes, getActiveThemeId } from '@/components/themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faCopy,
  faCheck,
  faPlay,
  faTerminal,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faKeyboard,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';
import { doesCodeRequireStdin } from '@/utils/syntaxValidator';
import { renderMathInHtml } from '@/utils/mathRenderer';

export interface CodeBlockItem {
  id: string;
  title: string;
  code: string;
  language: string;
  isRunnable: boolean;
  hasInput?: boolean;
  stdin?: string;
}

export interface PostContentRendererProps {
  body: string;
  codeBlocks?: CodeBlockItem[];
  isPostRunnable?: boolean;
  defaultLanguage?: string;
  onRunCode?: (code: string, language: string, title: string) => void;
}

interface CellExecutionState {
  isRunning: boolean;
  stdin: string;
  showStdin: boolean;
  result: {
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  } | null;
  showOutput: boolean;
}

const MonacoCodeBlock: React.FC<{
  code: string;
  language: string;
  theme?: string;
}> = ({ code, language, theme }) => {
  const lineCount = code.split('\n').length;
  const computedHeight = Math.min(Math.max(lineCount * 19 + 24, 60), 550);

  const getMonacoLanguage = (lang: string) => {
    const l = (lang || '').toLowerCase().trim();
    if (l === 'cpp' || l === 'c++' || l === 'c') return 'cpp';
    if (l === 'js' || l === 'javascript') return 'javascript';
    if (l === 'ts' || l === 'typescript') return 'typescript';
    if (l === 'py' || l === 'python') return 'python';
    if (l === 'java') return 'java';
    if (l === 'html') return 'html';
    if (l === 'css') return 'css';
    if (l === 'json') return 'json';
    if (l === 'sql') return 'sql';
    return l || 'plaintext';
  };

  return (
    <div className="w-full bg-slate-950 overflow-hidden" style={{ height: `${computedHeight}px` }}>
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        theme={theme || 'educode-dark'}
        value={code}
        beforeMount={registerMonacoThemes}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          folding: false,
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          renderLineHighlight: 'none',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          wordWrap: 'on',
          automaticLayout: true,
          fontFamily: 'Fira Code, monospace',
          fontSize: 12,
          padding: { top: 10, bottom: 10 },
        }}
      />
    </div>
  );
};

export const PostContentRenderer: React.FC<PostContentRendererProps> = ({
  body,
  codeBlocks = [],
  isPostRunnable = true,
  defaultLanguage = 'cpp',
  onRunCode,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>('educode-dark');
  const [cellExecutions, setCellExecutions] = useState<Record<string, CellExecutionState>>({});

  useEffect(() => {
    setActiveTheme(getActiveThemeId());

    const initialExecs: Record<string, CellExecutionState> = {};
    codeBlocks.forEach((block, idx) => {
      const key = block.id || `code-block-${idx}`;
      const requiresInput = block.hasInput ?? doesCodeRequireStdin(block.code);
      const defaultStdin = block.stdin || '';
      if (requiresInput || defaultStdin) {
        initialExecs[key] = {
          isRunning: false,
          stdin: defaultStdin,
          showStdin: requiresInput || !!defaultStdin,
          result: null,
          showOutput: false,
        };
      }
    });

    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = codeRegex.exec(body)) !== null) {
      const code = match[2] || '';
      const key = `inline_${count}`;
      const blockMeta = codeBlocks[count];
      const defaultStdin = blockMeta?.stdin || '';
      const requiresInput = blockMeta?.hasInput ?? doesCodeRequireStdin(code);
      count++;
      if (requiresInput || defaultStdin) {
        initialExecs[key] = {
          isRunning: false,
          stdin: defaultStdin,
          showStdin: true,
          result: null,
          showOutput: false,
        };
      }
    }

    if (Object.keys(initialExecs).length > 0) {
      setCellExecutions((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(initialExecs)) {
          if (!next[k]) {
            next[k] = v;
          } else if (v.stdin && !next[k].stdin) {
            next[k] = { ...next[k], stdin: v.stdin, showStdin: true };
          }
        }
        return next;
      });
    }
  }, [body, codeBlocks]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInlineExecute = async (blockKey: string, code: string, lang: string) => {
    if (onRunCode) {
      onRunCode(code, lang, blockKey);
    }

    const currentExec = cellExecutions[blockKey] || {
      isRunning: false,
      stdin: '',
      showStdin: false,
      result: null,
      showOutput: false,
    };

    const needsStdin = doesCodeRequireStdin(code);
    const shouldShowStdin = currentExec.showStdin || needsStdin;

    setCellExecutions((prev) => ({
      ...prev,
      [blockKey]: {
        ...currentExec,
        isRunning: true,
        showOutput: true,
        showStdin: shouldShowStdin,
      },
    }));

    try {
      const res = await apiClient.post('/stream/execute', {
        code,
        language: (lang || defaultLanguage || 'cpp').toLowerCase(),
        input: currentExec.stdin || undefined,
      });

      setCellExecutions((prev) => ({
        ...prev,
        [blockKey]: {
          ...(prev[blockKey] || currentExec),
          isRunning: false,
          result: res.data,
          showOutput: true,
        },
      }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Execution request failed';

      setCellExecutions((prev) => ({
        ...prev,
        [blockKey]: {
          ...(prev[blockKey] || currentExec),
          isRunning: false,
          result: {
            stdout: '',
            stderr: `[Server Connection Error]\n${msg}`,
            exitCode: 1,
            durationMs: 0,
          },
          showOutput: true,
        },
      }));
    }
  };

  const handleStdinChange = (blockKey: string, val: string) => {
    setCellExecutions((prev) => ({
      ...prev,
      [blockKey]: {
        ...(prev[blockKey] || { isRunning: false, stdin: '', showStdin: true, result: null, showOutput: false }),
        stdin: val,
      },
    }));
  };

  const toggleStdin = (blockKey: string) => {
    setCellExecutions((prev) => {
      const curr = prev[blockKey] || { isRunning: false, stdin: '', showStdin: false, result: null, showOutput: false };
      return {
        ...prev,
        [blockKey]: {
          ...curr,
          showStdin: !curr.showStdin,
        },
      };
    });
  };

  const closeOutput = (blockKey: string) => {
    setCellExecutions((prev) => {
      const curr = prev[blockKey];
      if (!curr) return prev;
      return {
        ...prev,
        [blockKey]: {
          ...curr,
          showOutput: false,
        },
      };
    });
  };

  // Parse inline markdown code blocks ```lang\ncode\n``` from body text
  const textSegments: { text: string; codeBlock?: { code: string; lang: string } }[] = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(body)) !== null) {
    const textBefore = body.substring(lastIndex, match.index);
    const lang = match[1] || defaultLanguage;
    const code = match[2] || '';

    textSegments.push({ text: textBefore, codeBlock: { code, lang } });
    lastIndex = codeRegex.lastIndex;
  }
  const remainingText = body.substring(lastIndex);
  if (remainingText || textSegments.length === 0) {
    textSegments.push({ text: remainingText });
  }

  let totalInlineCount = 0;

  const renderStdinBox = (blockKey: string, requiresInput: boolean) => {
    const exec = cellExecutions[blockKey];
    const show = requiresInput || exec?.showStdin;
    if (!show) return null;

    return (
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-sans font-extrabold uppercase text-teal-400 tracking-wider flex items-center space-x-1.5">
            <FontAwesomeIcon icon={faKeyboard} className="text-teal-400 text-[10px]" />
            <span>Standard Input (stdin)</span>
            {requiresInput && (
              <span className="text-[10px] text-amber-400 font-normal normal-case ml-2 font-bold">
                (Required to run)
              </span>
            )}
          </label>
        </div>
        <textarea
          value={exec?.stdin || ''}
          onChange={(e) => handleStdinChange(blockKey, e.target.value)}
          placeholder="Type custom input for your program here..."
          rows={2}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
        />
      </div>
    );
  };

  const renderTerminal = (blockKey: string) => {
    const exec = cellExecutions[blockKey];
    if (!exec?.showOutput) return null;

    return (
      <div className="border-t border-slate-800 bg-slate-950/95 font-mono text-xs text-slate-200">
        {/* Terminal Header */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faTerminal} className="text-teal-400 text-xs" />
            <span className="font-bold text-slate-300 text-[11px] tracking-wide uppercase">Output Terminal</span>
            {exec.isRunning ? (
              <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-sans font-bold flex items-center space-x-1">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" />
                <span>Executing...</span>
              </span>
            ) : exec.result ? (
              exec.result.exitCode === 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-bold flex items-center space-x-1">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                  <span>Exit 0 ({exec.result.durationMs}ms)</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans font-bold flex items-center space-x-1">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" />
                  <span>Exit {exec.result.exitCode} ({exec.result.durationMs}ms)</span>
                </span>
              )
            ) : null}
          </div>

          <div className="flex items-center space-x-2 font-sans">
            <button
              type="button"
              onClick={() => toggleStdin(blockKey)}
              className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                exec.showStdin
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle standard input (stdin)"
            >
              <FontAwesomeIcon icon={faKeyboard} className="text-[10px]" />
              <span>Stdin</span>
            </button>
            <button
              type="button"
              onClick={() => closeOutput(blockKey)}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Hide Terminal Output"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </button>
          </div>
        </div>

        {/* Output Stream Content */}
        <div className="p-4 max-h-60 overflow-y-auto space-y-2">
          {exec.isRunning ? (
            <p className="text-slate-400 italic text-xs animate-pulse">Running program on isolated server container...</p>
          ) : exec.result ? (
            <>
              {exec.result.stdout && (
                <pre className="text-emerald-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {exec.result.stdout}
                </pre>
              )}
              {exec.result.stderr && (
                <pre className="text-rose-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {exec.result.stderr}
                </pre>
              )}
              {!exec.result.stdout && !exec.result.stderr && (
                <p className="text-slate-500 italic text-xs">(Program executed with no console output)</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-left" dir="ltr">
      {/* Inline Text and Embedded Code Blocks (Sequential Document Style) */}
      {textSegments.map((seg, idx) => {
        if (seg.codeBlock) totalInlineCount++;
        const currentFigNum = totalInlineCount;
        const blockKey = `inline_${idx}`;
        const blockMeta = codeBlocks[totalInlineCount - 1];
        const inlineRequiresInput = seg.codeBlock
          ? (blockMeta?.hasInput ?? doesCodeRequireStdin(seg.codeBlock.code))
          : false;

        return (
          <React.Fragment key={idx}>
            {seg.text.trim() && (
              /<[a-z][\s\S]*>/i.test(seg.text) ? (
                <div
                  dir="ltr"
                  className="text-xs text-slate-200 leading-relaxed text-left [&_*]:text-left [&_h1]:text-lg [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h1:first-child]:mt-0 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3:first-child]:mt-0 [&_p]:text-left [&_p]:mt-0 [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:my-2.5 [&_ul:first-child]:mt-0 [&_ul:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:text-left [&_ol]:my-2.5 [&_ol:first-child]:mt-0 [&_ol:last-child]:mb-0 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:text-left [&_li]:my-0.5 [&_li]:text-left [&_blockquote]:my-2.5 [&_blockquote:first-child]:mt-0 [&_blockquote:last-child]:mb-0 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-300 [&_blockquote]:text-left [&_table]:my-3 [&_table:first-child]:mt-0 [&_table:last-child]:mb-0 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-800 [&_th]:border [&_th]:border-slate-800 [&_th]:p-2 [&_th]:bg-slate-900 [&_th]:text-left [&_td]:border [&_td]:border-slate-800 [&_td]:p-2 [&_td]:text-left [&_a]:text-teal-400 [&_a]:underline font-sans"
                  dangerouslySetInnerHTML={{ __html: renderMathInHtml(seg.text) }}
                />
              ) : (
                <div
                  className="text-xs text-slate-200 leading-relaxed text-left font-sans"
                  dir="ltr"
                  dangerouslySetInnerHTML={{ __html: renderMathInHtml(seg.text.replace(/\n/g, '<br/>')) }}
                />
              )
            )}

            {seg.codeBlock && (
              <div className="my-3 rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden text-xs shadow-xl group">
                {/* Figure Header */}
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-teal-400 font-bold uppercase text-[11px] bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                      {seg.codeBlock.lang}
                    </span>
                    <span className="text-slate-300 font-semibold text-xs flex items-center space-x-1.5">
                      <FontAwesomeIcon icon={faCode} className="text-teal-400 text-[11px]" />
                      <span>Code Figure {currentFigNum}: Embedded Snippet</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(seg.codeBlock!.code, blockKey)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1"
                      title="Copy Code"
                    >
                      <FontAwesomeIcon
                        icon={copiedId === blockKey ? faCheck : faCopy}
                        className="text-[10px]"
                      />
                      <span>{copiedId === blockKey ? 'Copied' : 'Copy'}</span>
                    </button>

                    {isPostRunnable && (
                      <button
                        onClick={() =>
                          handleInlineExecute(
                            blockKey,
                            seg.codeBlock!.code,
                            seg.codeBlock!.lang
                          )
                        }
                        disabled={cellExecutions[blockKey]?.isRunning || (inlineRequiresInput && !cellExecutions[blockKey]?.stdin?.trim())}
                        title={inlineRequiresInput && !cellExecutions[blockKey]?.stdin?.trim() ? 'Standard input is required to run' : 'Run Code'}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon
                          icon={cellExecutions[blockKey]?.isRunning ? faSpinner : faPlay}
                          className={`text-[10px] ${cellExecutions[blockKey]?.isRunning ? 'animate-spin' : ''}`}
                        />
                        <span>{cellExecutions[blockKey]?.isRunning ? 'Running...' : 'Run Code'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <MonacoCodeBlock
                  code={seg.codeBlock.code}
                  language={seg.codeBlock.lang}
                  theme={activeTheme}
                />

                {renderStdinBox(blockKey, inlineRequiresInput)}
                {renderTerminal(blockKey)}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Explicit Structured Code Blocks (Placed Directly Under Text) */}
      {codeBlocks.length > totalInlineCount && (
        <div className="space-y-4 pt-1">
          {codeBlocks.slice(totalInlineCount).map((block, bIdx) => {
            const blockKey = block.id || `block_${bIdx}`;
            const blockRequiresInput = block.hasInput ?? doesCodeRequireStdin(block.code);

            return (
              <div
                key={blockKey}
                className="rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden text-xs shadow-xl group"
              >
                {/* Figure Header */}
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-mono text-teal-400 font-bold uppercase text-[11px] bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                      {block.language}
                    </span>
                    <span className="text-slate-200 font-bold text-xs flex items-center space-x-1.5">
                      <FontAwesomeIcon icon={faCode} className="text-teal-400 text-[11px]" />
                      <span>
                        Code Figure {totalInlineCount + bIdx + 1}: {block.title}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(block.code, blockKey)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all flex items-center space-x-1"
                      title="Copy Code"
                    >
                      <FontAwesomeIcon
                        icon={copiedId === blockKey ? faCheck : faCopy}
                        className="text-[10px]"
                      />
                      <span>{copiedId === blockKey ? 'Copied' : 'Copy'}</span>
                    </button>

                    {block.isRunnable && isPostRunnable ? (
                      <button
                        onClick={() => handleInlineExecute(blockKey, block.code, block.language)}
                        disabled={cellExecutions[blockKey]?.isRunning || (blockRequiresInput && !cellExecutions[blockKey]?.stdin?.trim())}
                        title={blockRequiresInput && !cellExecutions[blockKey]?.stdin?.trim() ? 'Standard input is required to run' : 'Run Code'}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon
                          icon={cellExecutions[blockKey]?.isRunning ? faSpinner : faPlay}
                          className={`text-[10px] ${cellExecutions[blockKey]?.isRunning ? 'animate-spin' : ''}`}
                        />
                        <span>{cellExecutions[blockKey]?.isRunning ? 'Running...' : 'Run Code'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                        Static Snippet
                      </span>
                    )}
                  </div>
                </div>

                <MonacoCodeBlock
                  code={block.code}
                  language={block.language}
                  theme={activeTheme}
                />

                {renderStdinBox(blockKey, blockRequiresInput)}
                {renderTerminal(blockKey)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

