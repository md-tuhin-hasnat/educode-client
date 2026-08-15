import { WorkspaceFile } from '@/components/FileExplorer';

export interface CodeDraft {
  taskId: string;
  language: string;
  files: WorkspaceFile[];
  openTabPaths: string[];
  activeFilePath: string;
  code: string;
  updatedAt: string; // ISO string
}

const DRAFT_PREFIX = 'educode_draft_';

/**
 * Save code draft to localStorage and optional electron SQLite offline IPC
 */
export function saveCodeDraft(
  taskId: string,
  draft: {
    language: string;
    files: WorkspaceFile[];
    openTabPaths: string[];
    activeFilePath: string;
    code: string;
  }
): CodeDraft | null {
  if (!taskId) return null;
  try {
    const payload: CodeDraft = {
      taskId,
      language: draft.language,
      files: draft.files,
      openTabPaths: draft.openTabPaths,
      activeFilePath: draft.activeFilePath,
      code: draft.code,
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`${DRAFT_PREFIX}${taskId}`, JSON.stringify(payload));

      // If running inside Electron desktop app with offline SQLite IPC
      const electronEducode = (window as unknown as { educode?: { drafts?: { saveDraft: (d: CodeDraft) => Promise<boolean> } } }).educode;
      if (electronEducode?.drafts?.saveDraft) {
        electronEducode.drafts.saveDraft(payload).catch((e) => console.error('Electron SQLite draft save error:', e));
      }
    }

    return payload;
  } catch (err) {
    console.error('Failed to save code draft:', err);
    return null;
  }
}

/**
 * Load code draft from localStorage
 */
export function loadCodeDraft(taskId: string): CodeDraft | null {
  if (!taskId) return null;
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${taskId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CodeDraft;
        if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load code draft:', err);
  }
  return null;
}

/**
 * Delete / Clear draft for a specific task
 */
export function clearCodeDraft(taskId: string): void {
  if (!taskId) return;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${DRAFT_PREFIX}${taskId}`);

      const electronEducode = (window as unknown as { educode?: { drafts?: { deleteDraft: (id: string) => Promise<boolean> } } }).educode;
      if (electronEducode?.drafts?.deleteDraft) {
        electronEducode.drafts.deleteDraft(taskId).catch((e) => console.error('Electron SQLite draft delete error:', e));
      }
    }
  } catch (err) {
    console.error('Failed to clear code draft:', err);
  }
}
