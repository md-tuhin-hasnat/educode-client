import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase } from './sqlite';
import { initAuthStore, registerAuthIPC } from './ipc/auth.ipc';
import { registerExecutorIPC } from './ipc/executor.ipc';
import { registerOfflineIPC } from './ipc/offline.ipc';
import { registerIntegrityIPC } from './ipc/integrity.ipc';
import { registerPtyIPC } from './ipc/pty.ipc';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const userDataPath = app.getPath('userData');

  // Initialize sqlite and auth store
  initDatabase(userDataPath);
  initAuthStore(userDataPath);

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    frame: false, // Frameless window for EduCode custom titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    backgroundColor: '#0F172A', // Slate 900 background matching EduCode design tokens
    show: false,
  });

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Register all feature IPC handlers
  registerAuthIPC();
  registerExecutorIPC();
  registerOfflineIPC();
  registerIntegrityIPC(mainWindow);
  registerPtyIPC(mainWindow);

  // Ready to show without white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    const port = process.env.PORT || 3000;
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
