'use client';

import React from 'react';
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
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

interface EditorToolbarProps {
  onExecFormat: (cmd: string, value?: string) => void;
  onInsertTable: () => void;
  onInsertLink: () => void;
  onOpenEquationModal: () => void;
  onRenderAllFormulas: () => void;
  onAddTextCell: () => void;
  onAddCodeCell: () => void;
}

export function EditorToolbar({
  onExecFormat,
  onInsertTable,
  onInsertLink,
  onOpenEquationModal,
  onRenderAllFormulas,
  onAddTextCell,
  onAddCodeCell,
}: EditorToolbarProps) {
  return (
    <div
      className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20 backdrop-blur-md"
      dir="ltr"
    >
      {/* Rich Text Controls */}
      <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
        <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExecFormat('formatBlock', '<h1>')}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-black transition-colors"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExecFormat('formatBlock', '<h2>')}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExecFormat('formatBlock', '<p>')}
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
            onClick={() => onExecFormat('bold')}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors font-bold"
            title="Bold"
          >
            <FontAwesomeIcon icon={faBold} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExecFormat('italic')}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors italic"
            title="Italic"
          >
            <FontAwesomeIcon icon={faItalic} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExecFormat('underline')}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors underline"
            title="Underline"
          >
            <FontAwesomeIcon icon={faUnderline} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              onExecFormat(
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
            onClick={() => onExecFormat('insertUnorderedList')}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
            title="Bullet List"
          >
            <FontAwesomeIcon icon={faListUl} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onExecFormat('insertOrderedList')}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
            title="Numbered List"
          >
            <FontAwesomeIcon icon={faListOl} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onInsertTable}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
            title="Insert Table"
          >
            <FontAwesomeIcon icon={faTable} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onInsertLink}
            className="p-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
            title="Insert Link"
          >
            <FontAwesomeIcon icon={faLink} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onOpenEquationModal}
            className="p-1.5 px-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg text-xs transition-colors font-serif font-bold flex items-center space-x-1 border border-emerald-500/30 bg-emerald-500/10"
            title="Insert Mathematical Equation / Formula at cursor ($...$)"
          >
            <span className="italic">f(x)</span>
            <span className="text-[11px] font-sans font-medium">Math</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRenderAllFormulas}
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
          onClick={onAddTextCell}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
          <span>Text Cell</span>
        </button>
        <button
          type="button"
          onClick={onAddCodeCell}
          className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-teal-200 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
        >
          <FontAwesomeIcon icon={faCode} className="text-[10px]" />
          <span>Code Cell</span>
        </button>
      </div>
    </div>
  );
}
