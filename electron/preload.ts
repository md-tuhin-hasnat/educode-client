import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('educode', {
  // Window controls for frameless window
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // Auth persistence
  auth: {
    saveSession: (session: unknown) => ipcRenderer.invoke('auth:saveSession', session),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    clearSession: () => ipcRenderer.invoke('auth:clearSession'),
  },

  // Code Executor Engine
  executor: {
    runCode: (request: {
      code?: string;
      language: string;
      stdin?: string;
      timeoutMs?: number;
      files?: Array<{ path: string; content: string }>;
      activeFilePath?: string;
      compilerPaths?: any;
    }) => ipcRenderer.invoke('executor:runCode', request),
  },

  // Real System PTY Terminal IPC Bridge
  pty: {
    init: () => ipcRenderer.invoke('pty:init'),
    write: (data: string) => ipcRenderer.send('pty:write', data),
    resize: (cols: number, rows: number) => ipcRenderer.send('pty:resize', cols, rows),
    runCode: (request: { code?: string; language: string; files?: Array<{ path: string; content: string }>; activeFilePath?: string }) =>
      ipcRenderer.invoke('pty:runCode', request),
    onData: (callback: (data: string) => void) => {
      const listener = (_: unknown, data: string) => callback(data);
      ipcRenderer.on('pty:data', listener);
      return () => {
        ipcRenderer.removeListener('pty:data', listener);
      };
    },
  },

  // Offline SQLite Store
  offline: {
    saveSubmission: (data: { taskId: string; studentId: string; code?: string; codeSnapshot?: string; language: string; timestamp?: number }) =>
      ipcRenderer.invoke('offline:saveSubmission', {
        ...data,
        codeSnapshot: data.codeSnapshot || data.code || '',
      }),
    getPendingSubmissions: () => ipcRenderer.invoke('offline:getPendingSubmissions'),
    markSynced: (ids: string[]) => ipcRenderer.invoke('offline:markSynced', ids),
  },

  // Academic Integrity Proctoring Engine
  integrity: {
    startMonitoring: (submissionId: string) => ipcRenderer.invoke('integrity:startMonitoring', submissionId),
    stopMonitoring: () => ipcRenderer.invoke('integrity:stopMonitoring'),
    getQueuedEvents: () => ipcRenderer.invoke('integrity:getQueuedEvents'),
    logEvent: (event: { submissionId?: string; eventType: string; details: string; severity: string; timestamp?: number; durationMs?: number }) =>
      ipcRenderer.invoke('integrity:logEvent', event),
    captureScreenshot: () => ipcRenderer.invoke('integrity:captureScreenshot'),
    onFocusLost: (callback: (data: { warnings: number; timestamp: number; eventType: string; details: string; durationMs?: number }) => void) => {
      const listener = (_: unknown, data: { warnings: number; timestamp: number; eventType: string; details: string; durationMs?: number }) => callback(data);
      ipcRenderer.on('integrity:event', listener);
      return () => {
        ipcRenderer.removeListener('integrity:event', listener);
      };
    },
  },
});
