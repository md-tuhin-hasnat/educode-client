import { create } from 'zustand';

export interface IntegrityAlert {
  id: string;
  eventType: string;
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  exitCode: number | null;
}

interface ExamState {
  currentTaskId: string | null;
  code: string;
  language: string;
  executionOutput: ExecutionResult | null;
  isExecuting: boolean;
  integrityAlerts: IntegrityAlert[];
  isSubmitting: boolean;

  setTask: (taskId: string, initialCode: string, language: string) => void;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setExecutionResult: (res: ExecutionResult | null) => void;
  setExecuting: (status: boolean) => void;
  addIntegrityAlert: (alert: IntegrityAlert) => void;
  clearExamState: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  currentTaskId: null,
  code: '',
  language: 'python',
  executionOutput: null,
  isExecuting: false,
  integrityAlerts: [],
  isSubmitting: false,

  setTask: (taskId, initialCode, language) =>
    set({ currentTaskId: taskId, code: initialCode, language, executionOutput: null, integrityAlerts: [] }),

  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),

  setExecutionResult: (executionOutput) => set({ executionOutput, isExecuting: false }),
  setExecuting: (isExecuting) => set({ isExecuting }),

  addIntegrityAlert: (alert) =>
    set((state) => ({ integrityAlerts: [alert, ...state.integrityAlerts] })),

  clearExamState: () =>
    set({
      currentTaskId: null,
      code: '',
      executionOutput: null,
      integrityAlerts: [],
    }),
}));
