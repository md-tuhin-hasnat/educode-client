import { ipcMain } from 'electron';
import { getDatabase } from '../sqlite';
import crypto from 'crypto';

export interface OfflineSubmissionData {
  taskId: string;
  studentId: string;
  codeSnapshot?: string;
  code?: string;
  language: string;
}

export function registerOfflineIPC() {
  ipcMain.handle('offline:saveSubmission', async (_event, data: OfflineSubmissionData) => {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = Date.now();
    const codeContent = data.codeSnapshot ?? data.code ?? '';

    const stmt = db.prepare(`
      INSERT INTO offline_submissions (id, taskId, studentId, codeSnapshot, language, updatedAt, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    stmt.run(id, data.taskId, data.studentId, codeContent, data.language, now);
    return { success: true, id };
  });

  ipcMain.handle('offline:getPendingSubmissions', async () => {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM offline_submissions WHERE syncStatus = 'PENDING'`);
    return stmt.all();
  });

  ipcMain.handle('offline:markSynced', async (_event, ids: string[]) => {
    const db = getDatabase();
    const stmt = db.prepare(`UPDATE offline_submissions SET syncStatus = 'SYNCED' WHERE id = ?`);
    const transaction = db.transaction((idList: string[]) => {
      for (const id of idList) {
        stmt.run(id);
      }
    });
    transaction(ids);
    return { success: true };
  });
}
