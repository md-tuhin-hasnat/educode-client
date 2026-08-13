import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

let sessionStorePath: string = '';

export function initAuthStore(userDataPath: string) {
  sessionStorePath = path.join(userDataPath, 'session.json');
}

export function registerAuthIPC() {
  ipcMain.handle('auth:saveSession', async (_event, sessionData: any) => {
    try {
      fs.writeFileSync(sessionStorePath, JSON.stringify(sessionData, null, 2), 'utf-8');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('auth:getSession', async () => {
    try {
      if (fs.existsSync(sessionStorePath)) {
        const raw = fs.readFileSync(sessionStorePath, 'utf-8');
        return JSON.parse(raw);
      }
      return null;
    } catch {
      return null;
    }
  });

  ipcMain.handle('auth:clearSession', async () => {
    try {
      if (fs.existsSync(sessionStorePath)) {
        fs.unlinkSync(sessionStorePath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
