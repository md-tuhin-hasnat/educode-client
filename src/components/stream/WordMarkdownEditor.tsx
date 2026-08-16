'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import {
  renderLatex,
  createInteractiveEquationHtml,
  latexToInteractivePills,
  interactivePillsToLatex,
} from '@/utils/mathRenderer';


export interface WordMarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  codeBlocks?: CodeBlockItem[];
  onCodeBlocksChange?: (blocks: CodeBlockItem[]) => void;
  placeholder?: string;
  minHeight?: string;
  isPostRunnable?: boolean;
  onRunCodePreview?: (code: string, lang: string, title: string) => void;
  mentionableUsers?: { id: string; name: string; avatarUrl?: string; role?: string }[];
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
        content: latexToInteractivePills(formattedText),
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
      content: latexToInteractivePills(formattedText),
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
  onSaveSelection: (cellId: string, range: Range, el: HTMLDivElement) => void;
  onEditEquation?: (cellId: string, element: HTMLElement, latex: string, mode: 'inline' | 'block') => void;
  onRemoveCell: (id: string) => void;
  canRemove: boolean;
  mentionableUsers?: { id: string; name: string; avatarUrl?: string; role?: string }[];
}

const RichTextCellComponent: React.FC<RichTextCellComponentProps> = ({
  cell,
  placeholder,
  onTextChange,
  onFocus,
  onSaveSelection,
  onEditEquation,
  onRemoveCell,
  canRemove,
  mentionableUsers,
}) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [mentionState, setMentionState] = useState<{
    active: boolean;
    query: string;
    node: Node | null;
    offset: number;
    top: number;
    left: number;
    selectedIndex: number;
  }>({ active: false, query: '', node: null, offset: 0, top: 0, left: 0, selectedIndex: 0 });

  const filteredUsers = React.useMemo(() => {
    if (!mentionState.active || !mentionableUsers) return [];
    const q = mentionState.query.toLowerCase();
    return mentionableUsers.filter(u => u.name.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q));
  }, [mentionState.active, mentionState.query, mentionableUsers]);

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && divRef.current) {
      const range = sel.getRangeAt(0);
      if (divRef.current.contains(range.commonAncestorContainer)) {
        onSaveSelection(cell.id, range.cloneRange(), divRef.current);
      }
    }
  };

  const handleMentionSelect = (user: { id: string; name: string }) => {
    if (!mentionState.node) return;
    const range = document.createRange();
    
    range.setStart(mentionState.node, mentionState.offset - mentionState.query.length - 1);
    range.setEnd(mentionState.node, mentionState.offset);
    range.deleteContents();

    const span = document.createElement('span');
    span.className = 'mention inline-flex items-center gap-1 bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md font-medium text-sm mx-1 align-baseline cursor-pointer hover:bg-teal-500/30 transition-colors';
    span.contentEditable = 'false';
    span.dataset.userId = user.id;
    span.innerHTML = `@${user.name}`;

    const space = document.createTextNode('\u00A0'); // nbsp
    range.insertNode(space);
    range.insertNode(span);

    // move cursor after space
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.setEndAfter(space);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(newRange);
      saveCurrentSelection();
    }

    setMentionState(prev => ({ ...prev, active: false }));
    if (divRef.current) {
      onTextChange(cell.id, divRef.current.innerHTML);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    saveCurrentSelection();
    onTextChange(cell.id, e.currentTarget.innerHTML);
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const text = range.startContainer.textContent || '';
        const offset = range.startOffset;
        const textBeforeCursor = text.substring(0, offset);
        
        // Match @ followed by word characters at the end of text before cursor
        const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
        
        if (match) {
          const rect = range.getBoundingClientRect();
          const parentRect = divRef.current?.getBoundingClientRect();
          
          if (parentRect) {
            setMentionState({
              active: true,
              query: match[1],
              node: range.startContainer,
              offset: offset,
              top: rect.bottom - parentRect.top + 5,
              left: rect.left - parentRect.left,
              selectedIndex: 0
            });
          }
        } else {
          setMentionState(prev => ({ ...prev, active: false }));
        }
      } else {
         setMentionState(prev => ({ ...prev, active: false }));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    saveCurrentSelection();
    if (mentionState.active && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, filteredUsers.length - 1) }));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) }));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers[mentionState.selectedIndex]) {
          handleMentionSelect(filteredUsers[mentionState.selectedIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState(prev => ({ ...prev, active: false }));
        return;
      }
    }

    if (e.key === ' ' || e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
          const text = range.startContainer.textContent || '';
          const offset = range.startOffset;
          const textBefore = text.substring(0, offset);

          // Check for block math: $$...$$
          const blockMatch = textBefore.match(/\$\$([^\$]+)\$\$$/);
          if (blockMatch) {
            e.preventDefault();
            const latex = blockMatch[1].trim();
            const matchStart = offset - blockMatch[0].length;
            
            range.setStart(range.startContainer, matchStart);
            range.setEnd(range.startContainer, offset);
            range.deleteContents();

            const tempWrapper = document.createElement('div');
            tempWrapper.innerHTML = createInteractiveEquationHtml(latex, 'block');
            const pill = tempWrapper.firstElementChild as HTMLElement;

            const pNode = document.createElement('p');
            pNode.innerHTML = '<br/>';

            range.insertNode(pNode);
            range.insertNode(pill);

            const newRange = document.createRange();
            newRange.setStart(pNode, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            saveCurrentSelection();
            if (divRef.current) {
              onTextChange(cell.id, divRef.current.innerHTML);
            }
            return;
          }

          // Check for inline math: $...$
          const inlineMatch = textBefore.match(/(?<!\\)\$([^\$\s][^\$]*)\$$/);
          if (inlineMatch) {
            e.preventDefault();
            const latex = inlineMatch[1].trim();
            const matchStart = offset - inlineMatch[0].length;

            range.setStart(range.startContainer, matchStart);
            range.setEnd(range.startContainer, offset);
            range.deleteContents();

            const tempWrapper = document.createElement('div');
            tempWrapper.innerHTML = createInteractiveEquationHtml(latex, 'inline');
            const pill = tempWrapper.firstElementChild as HTMLElement;

            const spaceNode = document.createTextNode('\u00A0');
            range.insertNode(spaceNode);
            range.insertNode(pill);

            const newRange = document.createRange();
            newRange.setStartAfter(spaceNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            saveCurrentSelection();
            if (divRef.current) {
              onTextChange(cell.id, divRef.current.innerHTML);
            }
            return;
          }
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    let pastedData = e.clipboardData.getData('text/html');
    if (pastedData) {
      pastedData = pastedData.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      pastedData = pastedData.replace(/<meta[^>]*>/gi, '');
      pastedData = pastedData.replace(/\sstyle="[^"]*"/gi, '');
      pastedData = pastedData.replace(/\sstyle='[^']*'/gi, '');
      pastedData = pastedData.replace(/\sclass="[^"]*"/gi, '');
      pastedData = pastedData.replace(/\sclass='[^']*'/gi, '');
      
      const converted = latexToInteractivePills(pastedData);
      document.execCommand('insertHTML', false, converted);
    } else {
      const text = e.clipboardData.getData('text/plain');
      const converted = latexToInteractivePills(text);
      if (converted !== text) {
        document.execCommand('insertHTML', false, converted);
      } else {
        document.execCommand('insertText', false, text);
      }
    }
    saveCurrentSelection();
    if (divRef.current) {
      onTextChange(cell.id, divRef.current.innerHTML);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const pill = target.closest('[data-latex]') as HTMLElement;
    if (pill) {
      e.preventDefault();
      e.stopPropagation();
      const latex = decodeURIComponent(pill.getAttribute('data-latex') || '');
      const mode = (pill.getAttribute('data-mode') || 'inline') as 'inline' | 'block';
      onEditEquation?.(cell.id, pill, latex, mode);
      return;
    }
    saveCurrentSelection();
  };

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
          saveCurrentSelection();
        }}
        onBlur={(e) => {
          setTimeout(() => {
            setIsFocused(false);
            setMentionState(prev => ({ ...prev, active: false }));
          }, 200);

          // Auto-convert raw $r$ or $$...$$ typed into rendered KaTeX pills on blur
          const currentHtml = e.currentTarget.innerHTML;
          const converted = latexToInteractivePills(currentHtml);
          if (converted !== currentHtml) {
            e.currentTarget.innerHTML = converted;
            onTextChange(cell.id, converted);
          } else {
            onTextChange(cell.id, currentHtml);
          }
        }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={saveCurrentSelection}
        onMouseUp={saveCurrentSelection}
        onPointerUp={saveCurrentSelection}
        onSelect={saveCurrentSelection}
        onClick={handleClick}
        onPaste={handlePaste}
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

      {/* Mention Dropdown Overlay */}
      {mentionState.active && mentionableUsers && (
        <div 
          className="absolute z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl w-64 max-h-64 overflow-y-auto py-2 flex flex-col"
          style={{ top: mentionState.top, left: Math.min(mentionState.left, divRef.current?.clientWidth ? divRef.current.clientWidth - 260 : mentionState.left) }}
        >
          <div className="px-3 pb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800 mb-1">
            Mention User
          </div>
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 text-center">No users found</div>
          ) : (
            filteredUsers.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                className={`w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors ${idx === mentionState.selectedIndex ? 'bg-teal-500/20' : 'hover:bg-slate-800'}`}
                onClick={() => handleMentionSelect(user)}
                onMouseEnter={() => setMentionState(prev => ({ ...prev, selectedIndex: idx }))}
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{user.role?.toLowerCase() || 'Member'}</div>
                </div>
              </button>
            ))
          )}
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
  mentionableUsers,
}) => {
  const [cells, setCells] = useState<EditorCell[]>(() =>
    parseInitialContent(value, codeBlocks)
  );

  const [cellExecutions, setCellExecutions] = useState<Record<string, CellExecutionState>>({});
  const [activeTheme, setActiveTheme] = useState<string>('educode-dark');
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [equationInput, setEquationInput] = useState('O(N \\log N)');
  const [equationMode, setEquationMode] = useState<'inline' | 'block'>('inline');

  const activeEditableRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<{ cellId: string; range: Range; el: HTMLDivElement } | null>(null);
  const editingEquationPillRef = useRef<{ cellId: string; element: HTMLElement } | null>(null);

  const handleOpenEquationModal = (prefillLatex?: string, prefillMode?: 'inline' | 'block') => {
    if (prefillLatex !== undefined) {
      setEquationInput(prefillLatex);
    } else if (savedSelectionRef.current) {
      const selectedText = savedSelectionRef.current.range.toString().trim();
      if (selectedText) {
        setEquationInput(selectedText.replace(/^\$+|\$+$/g, ''));
      } else {
        setEquationInput('r');
      }
    } else {
      setEquationInput('r');
    }

    if (prefillMode !== undefined) {
      setEquationMode(prefillMode);
    } else {
      setEquationMode('inline');
    }

    setIsEquationModalOpen(true);
  };

  const handleEditExistingEquation = (cellId: string, element: HTMLElement, latex: string, mode: 'inline' | 'block') => {
    editingEquationPillRef.current = { cellId, element };
    handleOpenEquationModal(latex, mode);
  };

  const handleDeleteExistingEquation = () => {
    if (editingEquationPillRef.current) {
      const { cellId, element } = editingEquationPillRef.current;
      const parent = element.parentElement;
      element.remove();
      if (parent) {
        const editableRoot = (parent.closest('[contenteditable="true"]') || parent) as HTMLDivElement;
        if (editableRoot) {
          handleTextChange(cellId, editableRoot.innerHTML);
        }
      }
      editingEquationPillRef.current = null;
      setIsEquationModalOpen(false);
    }
  };

  const handleInsertEquationSubmit = () => {
    if (!equationInput.trim()) return;
    const latex = equationInput.trim();
    const isBlock = equationMode === 'block';

    // Case 1: Updating an existing equation pill
    if (editingEquationPillRef.current) {
      const { cellId, element } = editingEquationPillRef.current;
      const parent = element.parentElement;
      if (parent) {
        const tempWrapper = document.createElement('div');
        tempWrapper.innerHTML = createInteractiveEquationHtml(latex, equationMode);
        const newPill = tempWrapper.firstElementChild;
        if (newPill) {
          element.replaceWith(newPill);
          const editableRoot = (parent.closest('[contenteditable="true"]') || parent) as HTMLDivElement;
          if (editableRoot) {
            handleTextChange(cellId, editableRoot.innerHTML);
          }
        }
      }
      editingEquationPillRef.current = null;
      setIsEquationModalOpen(false);
      return;
    }

    // Case 2: Inserting a new equation at saved cursor position
    if (savedSelectionRef.current) {
      const { cellId, range, el } = savedSelectionRef.current;
      
      // Focus target element and restore selection
      el.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }

      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = createInteractiveEquationHtml(latex, equationMode);
      const pill = tempWrapper.firstElementChild as HTMLElement;

      if (pill) {
        range.deleteContents();
        range.insertNode(pill);

        if (isBlock) {
          const pNode = document.createElement('p');
          pNode.innerHTML = '<br/>';
          if (pill.nextSibling) {
            pill.parentNode?.insertBefore(pNode, pill.nextSibling);
          } else {
            pill.parentNode?.appendChild(pNode);
          }
          
          const newRange = document.createRange();
          newRange.setStart(pNode, 0);
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
          savedSelectionRef.current = { cellId, range: newRange.cloneRange(), el };
        } else {
          const spaceNode = document.createTextNode('\u00A0');
          pill.after(spaceNode);
          
          const newRange = document.createRange();
          newRange.setStartAfter(spaceNode);
          newRange.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(newRange);
          savedSelectionRef.current = { cellId, range: newRange.cloneRange(), el };
        }

        handleTextChange(cellId, el.innerHTML);
      }
    } else {
      // Fallback: Append to first text cell
      const firstTextCell = cells.find((c) => c.type === 'text');
      if (firstTextCell) {
        const pillHtml = createInteractiveEquationHtml(latex, equationMode);
        const updatedContent = (firstTextCell.content || '') + (isBlock ? `\n${pillHtml}\n` : ` ${pillHtml} `);
        handleTextChange(firstTextCell.id, updatedContent);
      }
    }

    setIsEquationModalOpen(false);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              ...(current || { isRunning: false, stdin: '', result: null, showOutput: false }),
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
          hasInput: isChecked,
          stdin: isChecked ? currentVal : undefined,
        };
      }
      return c;
    });
    setCells(updated);
    syncCellsToParent(updated);
  };

  const handleClearOutput = (cellId: string) => {
    setCellExecutions((prev) => {
      const curr = prev[cellId];
      if (!curr) return prev;
      return {
        ...prev,
        [cellId]: {
          ...curr,
          result: null,
        },
      };
    });
  };

  const handleToggleStdin = (cellId: string) => {
    setCellExecutions((prev) => {
      const curr = prev[cellId];
      const show = !curr?.showStdin;
      return {
        ...prev,
        [cellId]: {
          ...(curr || { isRunning: false, stdin: '', result: null, showOutput: false }),
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

  return (
    <div className="w-full space-y-4 font-sans select-text text-left" dir="ltr">
      {/* Clean Toolbar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20 backdrop-blur-md" dir="ltr">
        {/* Rich Text Controls */}
        <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('formatBlock', '<h1>')}
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-black transition-colors"
              title="Heading 1"
            >
              H1
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('formatBlock', '<h2>')}
              className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors"
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('bold')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors font-bold"
              title="Bold"
            >
              <FontAwesomeIcon icon={faBold} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('italic')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors italic"
              title="Italic"
            >
              <FontAwesomeIcon icon={faItalic} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('underline')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors underline"
              title="Underline"
            >
              <FontAwesomeIcon icon={faUnderline} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('insertUnorderedList')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Bullet List"
            >
              <FontAwesomeIcon icon={faListUl} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execFormat('insertOrderedList')}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Numbered List"
            >
              <FontAwesomeIcon icon={faListOl} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertTable}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Insert Table"
            >
              <FontAwesomeIcon icon={faTable} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertLink}
              className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
              title="Insert Link"
            >
              <FontAwesomeIcon icon={faLink} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleOpenEquationModal()}
              className="p-1.5 px-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg text-xs transition-colors font-serif font-bold flex items-center space-x-1 border border-emerald-500/30 bg-emerald-500/10"
              title="Insert Mathematical Equation / Formula at cursor ($...$)"
            >
              <span className="italic">f(x)</span>
              <span className="text-[11px] font-sans font-medium">Math</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleRenderAllFormulasInActiveCell}
              className="p-1.5 px-2 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg text-xs transition-colors font-sans"
              title="Auto-format / Render all raw LaTeX expressions in text"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-400 text-[11px]" />
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
      <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-xl space-y-2 w-full text-left" dir="ltr">
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
                onSaveSelection={(cellId, range, el) => {
                  savedSelectionRef.current = { cellId, range, el };
                  activeEditableRef.current = el;
                }}
                onEditEquation={handleEditExistingEquation}
                onRemoveCell={handleRemoveCell}
                canRemove={cells.filter((c) => c.type === 'text').length > 1}
                mentionableUsers={mentionableUsers}
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
                          onClick={() => handleToggleStdin(cell.id)}
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
                          onClick={() => handleHideOutput(cell.id)}
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
      </div>

      {/* LaTeX Equation Builder Modal */}
      {isEquationModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="font-serif italic text-emerald-400 font-bold text-base">f(x)</span>
                <h3 className="text-sm font-bold text-white">
                  {editingEquationPillRef.current ? 'Edit Mathematical Equation' : 'Insert LaTeX Math Equation'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  editingEquationPillRef.current = null;
                  setIsEquationModalOpen(false);
                }}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Mode Selection */}
            <div className="flex items-center space-x-4 text-xs text-slate-300">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="eqMode"
                  checked={equationMode === 'inline'}
                  onChange={() => setEquationMode('inline')}
                  className="text-emerald-500"
                />
                <span>Inline Equation (<code className="text-emerald-400 font-mono">$...$</code>)</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="eqMode"
                  checked={equationMode === 'block'}
                  onChange={() => setEquationMode('block')}
                  className="text-emerald-500"
                />
                <span>Block Equation (<code className="text-emerald-400 font-mono">$$...$$</code>)</span>
              </label>
            </div>

            {/* LaTeX Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                LaTeX Formula:
              </label>
              <textarea
                rows={3}
                value={equationInput}
                onChange={(e) => setEquationInput(e.target.value)}
                placeholder="e.g. O(N \log N) or \sum_{i=1}^{n} x_i"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs font-mono text-white outline-none"
              />
            </div>

            {/* Quick Math Symbols */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                Quick Symbols & Patterns:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {[
                  { label: 'r', val: 'r' },
                  { label: 'p = 2\\pi r', val: 'p = 2\\pi r' },
                  { label: 'O(N log N)', val: 'O(N \\log N)' },
                  { label: 'O(N²)', val: 'O(N^2)' },
                  { label: 'O(1)', val: 'O(1)' },
                  { label: 'a/b', val: '\\frac{a}{b}' },
                  { label: '√x', val: '\\sqrt{x}' },
                  { label: '∑', val: '\\sum_{i=1}^{n} ' },
                  { label: '∏', val: '\\prod_{i=1}^{n} ' },
                  { label: '∫', val: '\\int_{a}^{b} ' },
                  { label: '≤', val: '\\le ' },
                  { label: '≥', val: '\\ge ' },
                  { label: '≠', val: '\\ne ' },
                  { label: '≈', val: '\\approx ' },
                  { label: '±', val: '\\pm ' },
                  { label: '∞', val: '\\infty ' },
                  { label: '∈', val: '\\in ' },
                  { label: '⊂', val: '\\subset ' },
                  { label: '∪', val: '\\cup ' },
                  { label: '∩', val: '\\cap ' },
                  { label: 'α', val: '\\alpha ' },
                  { label: 'β', val: '\\beta ' },
                  { label: 'θ', val: '\\theta ' },
                  { label: 'π', val: '\\pi ' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setEquationInput((prev) => prev + item.val)}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 min-h-[60px] flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                Live Rendered Equation
              </span>
              <div
                className="text-white text-sm"
                dangerouslySetInnerHTML={{
                  __html: renderLatex(equationInput || 'f(x) = O(N \\log N)', equationMode === 'block'),
                }}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between space-x-2 pt-2 border-t border-slate-800">
              <div>
                {editingEquationPillRef.current && (
                  <button
                    type="button"
                    onClick={handleDeleteExistingEquation}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold"
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-1" />
                    Delete Formula
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    editingEquationPillRef.current = null;
                    setIsEquationModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertEquationSubmit}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <span>{editingEquationPillRef.current ? 'Update Equation' : 'Insert Equation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
