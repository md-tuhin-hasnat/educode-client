import { CodeBlockItem } from '../PostContentRenderer';

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

export type DocumentBlock = EditorCell;
export type JupyterCell = EditorCell;

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
