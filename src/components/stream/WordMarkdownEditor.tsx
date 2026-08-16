'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { CodeBlockItem } from './PostContentRenderer';
import { apiClient } from '@/config/api';
import { getActiveThemeId } from '../themes';
import {
  createInteractiveEquationHtml,
  latexToInteractivePills,
  interactivePillsToLatex,
} from '@/utils/mathRenderer';

import {
  EditorCell,
  DocumentBlock,
  JupyterCell,
  WordMarkdownEditorProps,
} from './editor/types';
import { parseInitialContent } from './editor/editorUtils';
import { EditorToolbar } from './editor/EditorToolbar';
import { RichTextCell } from './editor/RichTextCell';
import { CodeCellCard, CodeCellExecutionState } from './editor/CodeCellCard';
import { LatexEquationModal } from './editor/LatexEquationModal';
import STARTER_TEMPLATES_JSON from '@/data/starterTemplates.json';

export type { WordMarkdownEditorProps, EditorCell, DocumentBlock, JupyterCell };

export function WordMarkdownEditor({
  value,
  onChange,
  codeBlocks = [],
  onCodeBlocksChange,
  placeholder = 'Write an announcement or question...',
  minHeight = '140px',
  isPostRunnable = false,
  onRunCodePreview,
  mentionableUsers,
}: WordMarkdownEditorProps) {
  const [cells, setCells] = useState<EditorCell[]>(() =>
    parseInitialContent(value, codeBlocks)
  );
  const [activeTheme, setActiveTheme] = useState<string>('educode-dark');
  const [mounted, setMounted] = useState(false);

  // LaTeX Equation Modal state
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [equationInput, setEquationInput] = useState('');
  const [equationMode, setEquationMode] = useState<'inline' | 'block'>('inline');
  const editingEquationPillRef = useRef<{ cellId: string; element: HTMLElement } | null>(null);

  // Execution states for code cells
  const [cellExecutions, setCellExecutions] = useState<Record<string, CodeCellExecutionState>>({});

  const activeEditableRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<{ cellId: string; range: Range; el: HTMLDivElement } | null>(null);

  useEffect(() => {
    setMounted(true);
    setActiveTheme(getActiveThemeId());
  }, []);

  const syncCellsToParent = (currentCells: EditorCell[]) => {
    let combinedBody = '';
    const currentCodeBlocks: CodeBlockItem[] = [];

    currentCells.forEach((cell) => {
      if (cell.type === 'text') {
        const portableLatex = interactivePillsToLatex(cell.content).trim();
        if (portableLatex) {
          combinedBody += (combinedBody ? '\n\n' : '') + portableLatex;
        }
      } else if (cell.type === 'code') {
        const codeMd = `\n\n\`\`\`${cell.language || 'cpp'}\n${cell.content}\n\`\`\`\n\n`;
        combinedBody += codeMd;
        currentCodeBlocks.push({
          id: cell.id,
          title: cell.title || 'Code Snippet',
          code: cell.content,
          language: cell.language || 'cpp',
          isRunnable: cell.isRunnable ?? true,
          hasInput: cell.hasInput,
          stdin: cell.stdin,
        });
      }
    });

    onChange(combinedBody);
    if (onCodeBlocksChange) {
      onCodeBlocksChange(currentCodeBlocks);
    }
  };

  const handleTextChange = (id: string, htmlContent: string) => {
    const updated = cells.map((c) => (c.id === id ? { ...c, content: htmlContent } : c));
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleCodeChange = (id: string, code: string) => {
    const updated = cells.map((c) => (c.id === id ? { ...c, content: code } : c));
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleCodeMetaChange = (
    id: string,
    field: 'language' | 'title' | 'isRunnable' | 'hasInput',
    val: any
  ) => {
    const updated = cells.map((c) => (c.id === id ? { ...c, [field]: val } : c));
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleAddTextCell = (indexInsertAfter?: number) => {
    const newCell: EditorCell = {
      id: `txt_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      type: 'text',
      content: '',
    };

    let updated: EditorCell[];
    if (indexInsertAfter !== undefined && indexInsertAfter >= 0) {
      updated = [
        ...cells.slice(0, indexInsertAfter + 1),
        newCell,
        ...cells.slice(indexInsertAfter + 1),
      ];
    } else {
      updated = [...cells, newCell];
    }
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleAddCodeCell = (indexInsertAfter?: number) => {
    const codeCount = cells.filter((c) => c.type === 'code').length + 1;
    const newCell: EditorCell = {
      id: `code_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      type: 'code',
      content: STARTER_TEMPLATES_JSON.cpp,
      language: 'cpp',
      title: `Code Snippet #${codeCount}`,
      isRunnable: true,
    };

    let updated: EditorCell[];
    if (indexInsertAfter !== undefined && indexInsertAfter >= 0) {
      updated = [
        ...cells.slice(0, indexInsertAfter + 1),
        newCell,
        ...cells.slice(indexInsertAfter + 1),
      ];
    } else {
      updated = [...cells, newCell];
    }
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleRemoveCell = (id: string) => {
    if (cells.length <= 1) {
      const reset: EditorCell[] = [{ id: 'cell_txt_init', type: 'text', content: '' }];
      setCells(reset);
      syncCellsToParent(reset);
      return;
    }
    const updated = cells.filter((c) => c.id !== id);
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleMoveCell = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= cells.length) return;

    const copy = [...cells];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    setCells(copy);
    syncCellsToParent(copy);
  };

  const execFormat = (command: string, val: string | undefined = undefined) => {
    if (savedSelectionRef.current) {
      const { cellId, range, el } = savedSelectionRef.current;
      el.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      document.execCommand(command, false, val);
      handleTextChange(cellId, el.innerHTML);
    } else if (activeEditableRef.current) {
      activeEditableRef.current.focus();
      document.execCommand(command, false, val);
      const textId = activeEditableRef.current.getAttribute('data-cell-id');
      if (textId) {
        handleTextChange(textId, activeEditableRef.current.innerHTML);
      }
    } else {
      document.execCommand(command, false, val);
    }
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table class="w-full my-3 border-collapse border border-slate-700 text-xs">
        <thead>
          <tr class="bg-slate-900 border-b border-slate-700">
            <th class="border border-slate-700 p-2 text-left font-bold text-slate-200">Header 1</th>
            <th class="border border-slate-700 p-2 text-left font-bold text-slate-200">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-800 p-2 text-slate-300">Data cell 1</td>
            <td class="border border-slate-800 p-2 text-slate-300">Data cell 2</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    execFormat('insertHTML', tableHtml);
  };

  const handleInsertLink = () => {
    const url = prompt('Enter Destination URL:', 'https://');
    if (url) {
      execFormat('createLink', url);
    }
  };

  const handleRenderAllFormulasInActiveCell = () => {
    if (activeEditableRef.current) {
      const currentHtml = activeEditableRef.current.innerHTML;
      const converted = latexToInteractivePills(currentHtml);
      activeEditableRef.current.innerHTML = converted;
      const textId = activeEditableRef.current.getAttribute('data-cell-id');
      if (textId) {
        handleTextChange(textId, converted);
      }
    } else {
      const updated = cells.map((c) =>
        c.type === 'text' ? { ...c, content: latexToInteractivePills(c.content) } : c
      );
      setCells(updated);
      syncCellsToParent(updated);
    }
  };

  const handleOpenEquationModal = (
    cellId?: string,
    existingPill?: HTMLElement,
    initialLatex = '',
    initialMode: 'inline' | 'block' = 'inline'
  ) => {
    if (existingPill && cellId) {
      editingEquationPillRef.current = { cellId, element: existingPill };
      setEquationInput(initialLatex);
      setEquationMode(initialMode);
    } else {
      editingEquationPillRef.current = null;
      setEquationInput('');
      setEquationMode('inline');
    }
    setIsEquationModalOpen(true);
  };

  const handleInsertEquationSubmit = () => {
    if (!equationInput.trim()) return;

    if (editingEquationPillRef.current) {
      const { cellId, element } = editingEquationPillRef.current;
      const newHtml = createInteractiveEquationHtml(equationInput.trim(), equationMode);
      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = newHtml;
      const newPill = tempWrapper.firstElementChild;
      if (newPill && element.parentNode) {
        element.parentNode.replaceChild(newPill, element);
        const parentCellEl = newPill.closest('[data-cell-id]') as HTMLDivElement | null;
        if (parentCellEl) {
          handleTextChange(cellId, parentCellEl.innerHTML);
        }
      }
      editingEquationPillRef.current = null;
      setIsEquationModalOpen(false);
      return;
    }

    const htmlPill = createInteractiveEquationHtml(equationInput.trim(), equationMode);
    if (equationMode === 'block') {
      execFormat('insertHTML', `<p></p>${htmlPill}<p></p>`);
    } else {
      execFormat('insertHTML', `${htmlPill}&nbsp;`);
    }
    setIsEquationModalOpen(false);
  };

  const handleInlineTestRun = async (cellId: string, code: string, lang: string) => {
    const currentStdin = cellExecutions[cellId]?.stdin || '';
    setCellExecutions((prev) => ({
      ...prev,
      [cellId]: {
        ...(prev[cellId] || { stdin: currentStdin, showStdin: false }),
        isRunning: true,
        showOutput: true,
        result: undefined,
      },
    }));

    try {
      const res = await apiClient.post('/stream/execute', {
        code,
        language: lang,
        input: currentStdin || undefined,
      });

      setCellExecutions((prev) => ({
        ...prev,
        [cellId]: {
          ...(prev[cellId] || { stdin: currentStdin, showStdin: false }),
          isRunning: false,
          showOutput: true,
          result: res.data,
        },
      }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Execution request failed';

      setCellExecutions((prev) => ({
        ...prev,
        [cellId]: {
          ...(prev[cellId] || { stdin: currentStdin, showStdin: false }),
          isRunning: false,
          showOutput: true,
          result: {
            stdout: '',
            stderr: `[Execution Error]\n${msg}`,
            exitCode: 1,
            durationMs: 0,
          },
        },
      }));
    }
  };

  const handleStdinChange = (cellId: string, val: string) => {
    setCellExecutions((prev) => ({
      ...prev,
      [cellId]: {
        ...(prev[cellId] || { isRunning: false, result: undefined, showOutput: false, showStdin: true }),
        stdin: val,
      },
    }));

    const targetCell = cells.find((c) => c.id === cellId);
    if (targetCell && targetCell.stdin !== undefined) {
      const updated = cells.map((c) => (c.id === cellId ? { ...c, stdin: val } : c));
      setCells(updated);
      syncCellsToParent(updated);
    }
  };

  const handleSetDefaultStdin = (cellId: string, isChecked: boolean) => {
    const currentVal = cellExecutions[cellId]?.stdin || '';
    const updated = cells.map((c) => {
      if (c.id === cellId) {
        return {
          ...c,
          hasInput: isChecked,
          stdin: isChecked ? currentVal : undefined,
        };
      }
      return c;
    });
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleToggleStdin = (cellId: string) => {
    setCellExecutions((prev) => {
      const curr = prev[cellId];
      const show = !curr?.showStdin;
      return {
        ...prev,
        [cellId]: {
          ...(curr || { isRunning: false, stdin: '', result: undefined, showOutput: false }),
          showStdin: show,
        },
      };
    });
  };

  const handleHideOutput = (cellId: string) => {
    setCellExecutions((prev) => {
      const curr = prev[cellId];
      if (!curr) return prev;
      return {
        ...prev,
        [cellId]: {
          ...curr,
          showOutput: false,
        },
      };
    });
  };

  return (
    <div className="flex flex-col space-y-3 relative text-left" dir="ltr">
      {/* Ribbon Toolbar */}
      <EditorToolbar
        onExecFormat={execFormat}
        onInsertTable={handleInsertTable}
        onInsertLink={handleInsertLink}
        onOpenEquationModal={() => handleOpenEquationModal()}
        onRenderAllFormulas={handleRenderAllFormulasInActiveCell}
        onAddTextCell={() => handleAddTextCell()}
        onAddCodeCell={() => handleAddCodeCell()}
      />

      {/* Editor Document Canvas */}
      <div
        className="space-y-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 p-4 shadow-inner text-left"
        style={{ minHeight }}
        dir="ltr"
      >
        {cells.map((cell, idx) => (
          <React.Fragment key={cell.id}>
            {cell.type === 'text' ? (
              <RichTextCell
                cell={cell}
                placeholder={placeholder}
                onTextChange={handleTextChange}
                onFocus={(el) => {
                  activeEditableRef.current = el;
                }}
                onSaveSelection={(cellId, range, el) => {
                  savedSelectionRef.current = { cellId, range, el };
                }}
                onEditEquation={(cellId, element, latex, mode) => {
                  handleOpenEquationModal(cellId, element, latex, mode);
                }}
                onRemoveCell={handleRemoveCell}
                canRemove={cells.length > 1}
                mentionableUsers={mentionableUsers}
              />
            ) : (
              <CodeCellCard
                cell={cell}
                idx={idx}
                totalCells={cells.length}
                activeTheme={activeTheme}
                executionState={cellExecutions[cell.id]}
                onCodeChange={handleCodeChange}
                onCodeMetaChange={handleCodeMetaChange}
                onSetDefaultStdin={handleSetDefaultStdin}
                onStdinChange={handleStdinChange}
                onInlineTestRun={handleInlineTestRun}
                onToggleStdin={handleToggleStdin}
                onHideOutput={handleHideOutput}
                onMoveCell={handleMoveCell}
                onRemoveCell={handleRemoveCell}
              />
            )}

            {/* Quick Add Divider Between Cells */}
            <div className="relative py-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative z-10 flex items-center space-x-2 bg-slate-950 px-3">
                <button
                  type="button"
                  onClick={() => handleAddTextCell(idx)}
                  className="px-2.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-full text-[10px] font-bold flex items-center space-x-1"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                  <span>+ Text Cell</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCodeCell(idx)}
                  className="px-2.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 rounded-full text-[10px] font-bold flex items-center space-x-1"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                  <span>+ Code Cell</span>
                </button>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* LaTeX Equation Builder Modal */}
      <LatexEquationModal
        isOpen={isEquationModalOpen}
        onClose={() => {
          editingEquationPillRef.current = null;
          setIsEquationModalOpen(false);
        }}
        equationInput={equationInput}
        setEquationInput={setEquationInput}
        equationMode={equationMode}
        setEquationMode={setEquationMode}
        onInsert={handleInsertEquationSubmit}
        isEditing={!!editingEquationPillRef.current}
        mounted={mounted}
      />
    </div>
  );
}

export default WordMarkdownEditor;
