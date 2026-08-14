'use client';

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTerminal, faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useIdeStore, IdeContext } from '@/store/useIdeStore';
import XtermTerminal from '@/components/XtermTerminal';
import '@/lib/monacoInit';

interface EduCodeEditorProps {
  context?: IdeContext;
  value: string;
  onChange?: (value: string | undefined) => void;
  language: string;
  className?: string;
  readOnly?: boolean;
}

export function EduCodeEditor({
  context = 'global',
  value,
  onChange,
  language,
  className = '',
  readOnly = false,
}: EduCodeEditorProps) {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const settings = useIdeStore((state) => state.getSettingsForContext(context));

  const themeId = settings.theme;

  return (
    <div className={`flex flex-col h-full w-full bg-[#1e1e1e] border border-gray-700 overflow-hidden ${className}`}>
      {/* Editor Section */}
      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          language={language}
          theme={themeId}
          value={value}
          onChange={onChange}
          options={{
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap,
            cursorStyle: settings.cursorStyle,
            minimap: { enabled: settings.minimap },
            suggestOnTriggerCharacters: settings.autocomplete,
            scrollBeyondLastLine: false,
            roundedSelection: false,
            padding: { top: 16 },
            readOnly,
          }}
        />
      </div>

      {/* Terminal Toggle Bar */}
      <div 
        className="h-8 bg-gray-800 border-t border-gray-700 flex items-center px-4 cursor-pointer hover:bg-gray-700 transition-colors shrink-0"
        onClick={() => setIsTerminalOpen(!isTerminalOpen)}
      >
        <div className="flex items-center space-x-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
          <FontAwesomeIcon icon={faTerminal} />
          <span>Terminal</span>
        </div>
        <div className="flex-1" />
        <FontAwesomeIcon icon={isTerminalOpen ? faChevronDown : faChevronUp} className="text-gray-500 text-xs" />
      </div>

      {/* Terminal Section */}
      {isTerminalOpen && (
        <div className="h-64 border-t border-gray-700 bg-[#0e131f] shrink-0">
          <XtermTerminal height={256} />
        </div>
      )}
    </div>
  );
}
