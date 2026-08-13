export {};

export interface CodeExecutionRequest {
  code?: string;
  language: 'c' | 'cpp' | 'python' | 'java';
  stdin?: string;
  timeoutMs?: number;
  files?: Array<{ path: string; content: string }>;
  activeFilePath?: string;
  compilerPaths?: {
    gcc?: string;
    gpp?: string;
    python?: string;
    javac?: string;
    java?: string;
  };
}

export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  compilationError?: string;
  timedOut?: boolean;
}

export interface IntegrityLogEvent {
  submissionId?: string;
  eventType: 'FOCUS_LOST' | 'FOCUS_GAINED' | 'PASTE_EXTERNAL' | 'PASTE_INTERNAL' | 'RAPID_ENTRY' | 'SCREENSHOT_CAPTURED' | 'MULTIPLE_MONITORS_DETECTED';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp?: number;
  durationMs?: number;
}

export interface EducodeAPI {
  window?: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  executor: {
    runCode: (params: CodeExecutionRequest) => Promise<CodeExecutionResult>;
  };
  pty?: {
    init: () => Promise<{ success: boolean }>;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    runCode: (params: {
      code?: string;
      language: string;
      files?: Array<{ path: string; content: string }>;
      activeFilePath?: string;
    }) => Promise<{ status: string; command?: string }>;
    onData: (callback: (data: string) => void) => () => void;
  };
  offline: {
    saveSubmission: (data: {
      taskId: string;
      studentId: string;
      code?: string;
      codeSnapshot?: string;
      language: string;
      timestamp?: number;
    }) => Promise<{ success: boolean; id: string }>;
    getPendingSubmissions: () => Promise<unknown[]>;
    markSynced: (ids: string[]) => Promise<{ success: boolean }>;
  };
  integrity: {
    startMonitoring: (submissionId: string) => Promise<{ success: boolean; submissionId: string }>;
    stopMonitoring: () => Promise<{ success: boolean; events: IntegrityLogEvent[] }>;
    getQueuedEvents: () => Promise<IntegrityLogEvent[]>;
    logEvent: (event: IntegrityLogEvent) => Promise<{ success: boolean; id: string }>;
    captureScreenshot: () => Promise<string | null>;
    onFocusLost: (
      callback: (data: { warnings: number; timestamp: number; eventType: string; details: string; durationMs?: number }) => void
    ) => () => void;
  };
  auth: {
    saveSession: (session: unknown) => Promise<boolean>;
    getSession: () => Promise<unknown>;
    clearSession: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    educode?: EducodeAPI;
  }
}
