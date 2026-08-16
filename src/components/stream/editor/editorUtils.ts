import { CodeBlockItem } from '../PostContentRenderer';
import { doesCodeRequireStdin } from '@/utils/syntaxValidator';
import { latexToInteractivePills } from '@/utils/mathRenderer';
import { EditorCell } from './types';

export function parseInitialContent(val: string, initialCodeBlocks?: CodeBlockItem[]): EditorCell[] {
  if (!val && (!initialCodeBlocks || initialCodeBlocks.length === 0)) {
    return [{ id: 'cell_txt_init', type: 'text', content: '' }];
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
