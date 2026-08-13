'use client';

import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import '@/lib/monacoInit';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faUnderline,
  faCode,
  faListUl,
  faListOl,
  faTable,
  faLink,
  faPlus,
  faTrash,
  faArrowUp,
  faArrowDown,
  faPlay,
  faFileCode,
  faFont,
  faTerminal,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faKeyboard,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { CodeBlockItem } from './PostContentRenderer';
import { apiClient } from '@/config/api';
import { registerMonacoThemes, getActiveThemeId } from '../themes';
import { doesCodeRequireStdin } from '@/utils/syntaxValidator';


export interface WordMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  codeBlocks?: CodeBlockItem[];
  onCodeBlocksChange?: (blocks: CodeBlockItem[]) => void;
  placeholder?: string;
  minHeight?: string;
  isPostRunnable?: boolean;
  onRunCodePreview?: (code: string, lang: string, title: string) => void;
}

export interface EditorCell {
  id: string;
  type: 'text' | 'code';
  content: string;
  language?: string;
  title?: string;
  isRunnable?: boolean;
  hasInput?: boolean;
  stdin?: string;
}

// Backwards compatibility alias
export type DocumentBlock = EditorCell;
export type JupyterCell = EditorCell;

function parseInitialContent(val: string, initialCodeBlocks?: CodeBlockItem[]): EditorCell[] {
  if (!val && (!initialCodeBlocks || initialCodeBlocks.length === 0)) {
    return [
      { id: 'cell_txt_init', type: 'text', content: '' },
    ];
  }

  const cells: EditorCell[] = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let codeIdx = 0;

  while ((match = codeRegex.exec(val)) !== null) {
    const textBefore = val.substring(lastIndex, match.index).trim();
    if (textBefore) {
      const formattedText = textBefore.startsWith('<')
        ? textBefore
        : `<p>${textBefore.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
      cells.push({
        id: `txt_${Math.random().toString(36).substring(5)}`,
        type: 'text',
        content: formattedText,
      });
    }

    const lang = match[1] || 'cpp';
    const code = match[2] || '';
    const codeMeta = initialCodeBlocks && initialCodeBlocks[codeIdx] ? initialCodeBlocks[codeIdx] : null;

    codeIdx++;
    cells.push({
      id: codeMeta?.id || `code_${Math.random().toString(36).substring(5)}`,
      type: 'code',
      content: code,
      language: codeMeta?.language || lang,
      title: codeMeta?.title || `Code Snippet #${codeIdx}`,
      isRunnable: codeMeta?.isRunnable ?? true,
      hasInput: codeMeta?.hasInput !== undefined ? codeMeta.hasInput : doesCodeRequireStdin(code),
      stdin: codeMeta?.stdin,
    });

    lastIndex = codeRegex.lastIndex;
  }

  const remainingText = val.substring(lastIndex).trim();
  if (remainingText) {
    const formattedText = remainingText.startsWith('<')
      ? remainingText
      : `<p>${remainingText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
    cells.push({
      id: `txt_${Math.random().toString(36).substring(5)}`,
      type: 'text',
      content: formattedText,
    });
  }

  if (initialCodeBlocks && initialCodeBlocks.length > codeIdx) {
    for (let i = codeIdx; i < initialCodeBlocks.length; i++) {
      const cb = initialCodeBlocks[i];
      cells.push({
        id: cb.id || `code_${Math.random().toString(36).substring(5)}`,
        type: 'code',
        content: cb.code,
        language: cb.language || 'cpp',
        title: cb.title || `Code Snippet #${i + 1}`,
        isRunnable: cb.isRunnable ?? true,
        hasInput: cb.hasInput !== undefined ? cb.hasInput : doesCodeRequireStdin(cb.code),
        stdin: cb.stdin,
      });
    }
  }

  if (cells.length === 0) {
    cells.push({ id: 'cell_txt_init', type: 'text', content: '' });
  }

  return cells;
}

interface RichTextCellComponentProps {
  cell: EditorCell;
  placeholder: string;
  onTextChange: (id: string, htmlContent: string) => void;
  onFocus: (editableEl: HTMLDivElement) => void;
  onRemoveCell: (id: string) => void;
  canRemove: boolean;
}

const RichTextCellComponent: React.FC<RichTextCellComponentProps> = ({
  cell,
  placeholder,
  onTextChange,
  onFocus,
  onRemoveCell,
  canRemove,
}) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (divRef.current && document.activeElement !== divRef.current) {
      if (divRef.current.innerHTML !== cell.content) {
        divRef.current.innerHTML = cell.content || '';
      }
    }
  }, [cell.id, cell.content]);

  const stripped = (cell.content || '').replace(/<[^>]*>/g, '').trim();
  const hasText = stripped.length > 0;
  const showPlaceholder = !isFocused && !hasText;

  return (
    <div className="relative group p-2 rounded-2xl border border-transparent hover:border-slate-800/80 transition-colors text-left" dir="ltr">
      {showPlaceholder && (
        <div className="absolute top-5 left-5 text-slate-500 italic text-sm pointer-events-none select-none z-10">
          {placeholder}
        </div>
      )}
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        data-cell-id={cell.id}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus(e.currentTarget);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onTextChange(cell.id, e.currentTarget.innerHTML);
        }}
        onInput={(e) => {
          onTextChange(cell.id, e.currentTarget.innerHTML);
        }}
        style={{ minHeight: '60px', direction: 'ltr', textAlign: 'left' }}
        className="w-full bg-transparent text-slate-100 focus:outline-none leading-relaxed text-sm p-3 rounded-xl hover:bg-slate-900/40 focus:bg-slate-900/60 transition-colors font-sans outline-none text-left [&_*]:text-left [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h1:first-child]:mt-0 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3:first-child]:mt-0 [&_p]:text-left [&_p]:mt-0 [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:my-2.5 [&_ul:first-child]:mt-0 [&_ul:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:text-left [&_ol]:my-2.5 [&_ol:first-child]:mt-0 [&_ol:last-child]:mb-0 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:text-left [&_li]:my-0.5 [&_li]:text-left [&_blockquote]:my-2.5 [&_blockquote:first-child]:mt-0 [&_blockquote:last-child]:mb-0 [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500 [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:text-slate-300 [&_blockquote]:text-left [&_table]:my-3 [&_table:first-child]:mt-0 [&_table:last-child]:mb-0 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-800 [&_th]:border [&_th]:border-slate-800 [&_th]:p-2 [&_th]:bg-slate-900 [&_th]:text-left [&_td]:border [&_td]:border-slate-800 [&_td]:p-2 [&_td]:text-left"
      />

      {canRemove && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={() => onRemoveCell(cell.id)}
            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
            title="Delete Text Cell"
          >
            <FontAwesomeIcon icon={faTrash} className="text-xs" />
          </button>
        </div>
      )}
    </div>
  );
};

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

export const WordMarkdownEditor: React.FC<WordMarkdownEditorProps> = ({
  value,
  onChange,
  codeBlocks = [],
  onCodeBlocksChange,
  placeholder = 'Type formatted text here...',
  onRunCodePreview,
}) => {
  const [cells, setCells] = useState<EditorCell[]>(() =>
    parseInitialContent(value, codeBlocks)
  );

  const [cellExecutions, setCellExecutions] = useState<Record<string, CellExecutionState>>({});
  const [activeTheme, setActiveTheme] = useState<string>('educode-dark');

  useEffect(() => {
    setActiveTheme(getActiveThemeId());
  }, []);

  useEffect(() => {
    cells.forEach((cell) => {
      if (cell.type === 'code' && doesCodeRequireStdin(cell.content)) {
        setCellExecutions((prev) => {
          const current = prev[cell.id];
          if (current?.showStdin && current?.showOutput) return prev;
          return {
            ...prev,
            [cell.id]: {
              ...(current || { isRunning: false, stdin: '', result: null }),
              showStdin: true,
              showOutput: true,
            },
          };
        });
      }
    });
  }, [cells]);


  const handleInlineTestRun = async (cellId: string, code: string, lang: string) => {
    // If external listener is explicitly provided and handles it, call it
    if (onRunCodePreview) {
      onRunCodePreview(code, lang, 'Code Snippet');
    }

    const currentExec = cellExecutions[cellId] || {
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
      [cellId]: {
        ...currentExec,
        isRunning: true,
        showOutput: true,
        showStdin: shouldShowStdin,
      },
    }));

    try {
      const res = await apiClient.post('/stream/execute', {
        code,
        language: (lang || 'cpp').toLowerCase(),
        input: currentExec.stdin || undefined,
      });
      setCellExecutions((prev) => ({
        ...prev,
        [cellId]: {
          ...(prev[cellId] || currentExec),
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
        [cellId]: {
          ...(prev[cellId] || currentExec),
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

  const handleStdinChange = (cellId: string, val: string) => {
    setCellExecutions((prev) => ({
      ...prev,
      [cellId]: {
        ...(prev[cellId] || { isRunning: false, stdin: '', showStdin: true, result: null, showOutput: false }),
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
          stdin: isChecked ? currentVal : undefined,
        };
      }
      return c;
    });
    setCells(updated);
    syncCellsToParent(updated);
  };

  const toggleStdin = (cellId: string) => {
    setCellExecutions((prev) => {
      const curr = prev[cellId] || { isRunning: false, stdin: '', showStdin: false, result: null, showOutput: false };
      return {
        ...prev,
        [cellId]: {
          ...curr,
          showStdin: !curr.showStdin,
        },
      };
    });
  };

  const closeOutput = (cellId: string) => {
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

  const activeEditableRef = useRef<HTMLDivElement | null>(null);

  const syncCellsToParent = (currentCells: EditorCell[]) => {
    let combinedBody = '';
    const currentCodeBlocks: CodeBlockItem[] = [];

    currentCells.forEach((cell) => {
      if (cell.type === 'text') {
        if (cell.content.trim()) {
          combinedBody += (combinedBody ? '\n\n' : '') + cell.content.trim();
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
    val: string | boolean
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
      content: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}',
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
    if (activeEditableRef.current) {
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

  return (
    <div className="w-full space-y-4 font-sans select-text text-left" dir="ltr">
      {/* Clean Toolbar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20 backdrop-blur-md" dir="ltr">
        {/* Rich Text Controls */}
        <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<h1>')}
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-black transition-colors"
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<h2>')}
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors"
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => execFormat('formatBlock', '<p>')}
              className="px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Paragraph"
            >
              P
            </button>
          </div>

          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => execFormat('bold')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors font-bold"
              title="Bold"
            >
              <FontAwesomeIcon icon={faBold} />
            </button>
            <button
              type="button"
              onClick={() => execFormat('italic')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors italic"
              title="Italic"
            >
              <FontAwesomeIcon icon={faItalic} />
            </button>
            <button
              type="button"
              onClick={() => execFormat('underline')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors underline"
              title="Underline"
            >
              <FontAwesomeIcon icon={faUnderline} />
            </button>
            <button
              type="button"
              onClick={() =>
                execFormat(
                  'insertHTML',
                  '<code class="bg-slate-800 text-teal-300 font-mono px-1.5 py-0.5 rounded text-xs">code</code>'
                )
              }
              className="p-1.5 px-2 text-teal-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg text-xs transition-colors font-mono"
              title="Inline Code"
            >
              <FontAwesomeIcon icon={faCode} />
            </button>
          </div>

          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => execFormat('insertUnorderedList')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Bullet List"
            >
              <FontAwesomeIcon icon={faListUl} />
            </button>
            <button
              type="button"
              onClick={() => execFormat('insertOrderedList')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Numbered List"
            >
              <FontAwesomeIcon icon={faListOl} />
            </button>
            <button
              type="button"
              onClick={handleInsertTable}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Insert Table"
            >
              <FontAwesomeIcon icon={faTable} />
            </button>
            <button
              type="button"
              onClick={handleInsertLink}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Insert Link"
            >
              <FontAwesomeIcon icon={faLink} />
            </button>
          </div>
        </div>

        {/* Add Cell Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleAddTextCell()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <FontAwesomeIcon icon={faFont} className="text-xs text-brand-400" />
            <span>Text Cell</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddCodeCell()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-transform active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
            <FontAwesomeIcon icon={faFileCode} className="text-xs" />
            <span>Code Cell</span>
          </button>
        </div>
      </div>

      {/* Editor Cells Container Sheet */}
      <div className="bg-slate-950 border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-4 max-w-5xl mx-auto min-h-[400px] text-left" dir="ltr">
        {cells.map((cell, idx) => (
          <React.Fragment key={cell.id}>
            {cell.type === 'text' ? (
              <RichTextCellComponent
                cell={cell}
                placeholder={placeholder}
                onTextChange={handleTextChange}
                onFocus={(el) => {
                  activeEditableRef.current = el;
                }}
                onRemoveCell={handleRemoveCell}
                canRemove={cells.length > 1}
              />
            ) : (
              /* Code Cell */
              <div className="my-3 rounded-2xl bg-slate-900 border border-slate-700/80 overflow-hidden shadow-xl space-y-0 group">
                {/* Code Cell Header */}
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-3 flex-1 min-w-[200px]">
                    <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono font-bold text-[11px] rounded uppercase">
                      Code Cell
                    </span>

                    <input
                      type="text"
                      dir="ltr"
                      value={cell.title || ''}
                      onChange={(e) => handleCodeMetaChange(cell.id, 'title', e.target.value)}
                      placeholder="Title / Description (Optional)"
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500 max-w-xs flex-1 text-left"
                    />

                    <select
                      value={cell.language || 'cpp'}
                      onChange={(e) => handleCodeMetaChange(cell.id, 'language', e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-500 uppercase"
                    >
                      <option value="cpp">C++ (g++)</option>
                      <option value="c">C (gcc)</option>
                      <option value="python">Python 3</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript (Node)</option>
                      <option value="rust">Rust</option>
                      <option value="sql">SQL</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cell.isRunnable ?? true}
                        onChange={(e) => handleCodeMetaChange(cell.id, 'isRunnable', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/30"
                      />
                      <span>Runnable</span>
                    </label>

                    <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cell.hasInput ?? false}
                        onChange={(e) => handleCodeMetaChange(cell.id, 'hasInput', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-indigo-400 focus:ring-indigo-500/30"
                      />
                      <span>Has Input</span>
                    </label>

                    {(cell.isRunnable ?? true) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleInlineTestRun(cell.id, cell.content, cell.language || 'cpp')
                        }
                        disabled={cellExecutions[cell.id]?.isRunning || (cell.hasInput && !cellExecutions[cell.id]?.stdin?.trim())}
                        title={cell.hasInput && !cellExecutions[cell.id]?.stdin?.trim() ? 'Standard input is required to run' : 'Test Run'}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {cellExecutions[cell.id]?.isRunning ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} className="text-[10px] animate-spin" />
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                            <span>Test Run</span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleMoveCell(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <FontAwesomeIcon icon={faArrowUp} className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCell(idx, 'down')}
                        disabled={idx === cells.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <FontAwesomeIcon icon={faArrowDown} className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCell(cell.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 ml-1"
                        title="Delete Code Cell"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Monaco Code Editor */}
                <div className="h-52 bg-slate-950 border-t border-slate-900">
                  <Editor
                    height="100%"
                    language={
                      cell.language === 'cpp' || cell.language === 'c'
                        ? 'cpp'
                        : cell.language || 'cpp'
                    }
                    theme={activeTheme || 'educode-dark'}
                    beforeMount={registerMonacoThemes}
                    value={cell.content}

                    onChange={(val) => handleCodeChange(cell.id, val || '')}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      padding: { top: 10, bottom: 10 },
                      fontFamily: 'Fira Code, monospace',
                      lineNumbersMinChars: 3,
                    }}
                  />
                </div>

                {/* Standard Input (stdin) Box */}
                {(cell.hasInput || cell.stdin !== undefined || cellExecutions[cell.id]?.showStdin) && (
                  <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-sans font-extrabold uppercase text-teal-400 tracking-wider flex items-center space-x-1.5">
                        <FontAwesomeIcon icon={faKeyboard} className="text-teal-400 text-[10px]" />
                        <span>Standard Input (stdin)</span>
                        {cell.hasInput && (
                          <span className="text-[10px] text-amber-400 font-normal normal-case ml-2 font-bold">
                            (Required to run)
                          </span>
                        )}
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-300 select-none hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={cell.stdin !== undefined}
                          onChange={(e) => handleSetDefaultStdin(cell.id, e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-teal-400 focus:ring-teal-500/30 cursor-pointer w-3.5 h-3.5"
                        />
                        <span className="text-[11px] font-semibold text-slate-300">Save as default input for post</span>
                      </label>
                    </div>
                    <textarea
                      value={cellExecutions[cell.id]?.stdin || ''}
                      onChange={(e) => handleStdinChange(cell.id, e.target.value)}
                      placeholder="Type custom input for your program here..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                {/* Inline Execution Output Terminal */}
                {cellExecutions[cell.id]?.showOutput && (
                  <div className="border-t border-slate-800 bg-slate-950/95 font-mono text-xs text-slate-200">
                    {/* Terminal Bar */}
                    <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faTerminal} className="text-teal-400 text-xs" />
                        <span className="font-bold text-slate-300 text-[11px] tracking-wide uppercase">Output Terminal</span>
                        {cellExecutions[cell.id]?.isRunning ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 font-sans font-bold flex items-center space-x-1">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[9px]" />
                            <span>Executing...</span>
                          </span>
                        ) : cellExecutions[cell.id]?.result ? (
                          cellExecutions[cell.id]?.result?.exitCode === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-bold flex items-center space-x-1">
                              <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                              <span>Exit 0 ({cellExecutions[cell.id]?.result?.durationMs}ms)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans font-bold flex items-center space-x-1">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" />
                              <span>Exit {cellExecutions[cell.id]?.result?.exitCode} ({cellExecutions[cell.id]?.result?.durationMs}ms)</span>
                            </span>
                          )
                        ) : null}
                      </div>

                      <div className="flex items-center space-x-2 font-sans">
                        <button
                          type="button"
                          onClick={() => toggleStdin(cell.id)}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                            cellExecutions[cell.id]?.showStdin
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
                          onClick={() => closeOutput(cell.id)}
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Hide Terminal Output"
                        >
                          <FontAwesomeIcon icon={faTimes} className="text-xs" />
                        </button>
                      </div>
                    </div>

                    {/* Output Stream Content */}
                    <div className="p-4 max-h-60 overflow-y-auto space-y-2">
                      {cellExecutions[cell.id]?.isRunning ? (
                        <p className="text-slate-400 italic text-xs animate-pulse">Running program on isolated server container...</p>
                      ) : cellExecutions[cell.id]?.result ? (
                        <>
                          {cellExecutions[cell.id]?.result?.stdout && (
                            <pre className="text-emerald-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                              {cellExecutions[cell.id]?.result?.stdout}
                            </pre>
                          )}
                          {cellExecutions[cell.id]?.result?.stderr && (
                            <pre className="text-rose-400 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                              {cellExecutions[cell.id]?.result?.stderr}
                            </pre>
                          )}
                          {!cellExecutions[cell.id]?.result?.stdout && !cellExecutions[cell.id]?.result?.stderr && (
                            <p className="text-slate-500 italic text-xs">(Program executed with no console output)</p>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
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

        {/* Bottom Cell Add Bar */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 italic text-[11px]">
            Add text cells and code cells to build your post structure.
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleAddTextCell(cells.length - 1)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              <FontAwesomeIcon icon={faFont} className="text-xs text-brand-400" />
              <span>Add Text Cell</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddCodeCell()}
              className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-transform active:scale-95"
            >
              <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              <FontAwesomeIcon icon={faFileCode} className="text-xs" />
              <span>Add Code Cell</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
