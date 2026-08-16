'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { EditorCell } from './types';
import {
  createInteractiveEquationHtml,
  latexToInteractivePills,
} from '@/utils/mathRenderer';

export interface RichTextCellProps {
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

export const RichTextCell: React.FC<RichTextCellProps> = ({
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
    return mentionableUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
    );
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
    span.className =
      'mention inline-flex items-center gap-1 bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md font-medium text-sm mx-1 align-baseline cursor-pointer hover:bg-teal-500/30 transition-colors';
    span.contentEditable = 'false';
    span.dataset.userId = user.id;
    span.innerHTML = `@${user.name}`;

    const space = document.createTextNode('\u00A0');
    range.insertNode(space);
    range.insertNode(span);

    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.setEndAfter(space);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(newRange);
      saveCurrentSelection();
    }

    setMentionState((prev) => ({ ...prev, active: false }));
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
              selectedIndex: 0,
            });
          }
        } else {
          setMentionState((prev) => ({ ...prev, active: false }));
        }
      } else {
        setMentionState((prev) => ({ ...prev, active: false }));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    saveCurrentSelection();
    if (mentionState.active && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, filteredUsers.length - 1),
        }));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers[mentionState.selectedIndex]) {
          handleMentionSelect(filteredUsers[mentionState.selectedIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, active: false }));
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
    <div
      className="relative group p-2 rounded-2xl border border-transparent hover:border-slate-800/80 transition-colors text-left"
      dir="ltr"
    >
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
            setMentionState((prev) => ({ ...prev, active: false }));
          }, 200);

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
          style={{
            top: mentionState.top,
            left: Math.min(
              mentionState.left,
              divRef.current?.clientWidth ? divRef.current.clientWidth - 260 : mentionState.left
            ),
          }}
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
                className={`w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors ${
                  idx === mentionState.selectedIndex ? 'bg-teal-500/20' : 'hover:bg-slate-800'
                }`}
                onClick={() => handleMentionSelect(user)}
                onMouseEnter={() => setMentionState((prev) => ({ ...prev, selectedIndex: idx }))}
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  {user.role && (
                    <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
