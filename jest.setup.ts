import '@testing-library/jest-dom';

// Mock electronAPI IPC bridge for Jest tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    runCode: jest.fn().mockResolvedValue({ stdout: 'Hello World\n', stderr: '', exitCode: 0, timeMs: 42 }),
    killProcess: jest.fn().mockResolvedValue({ success: true }),
    saveDraft: jest.fn().mockResolvedValue(true),
    loadDraft: jest.fn().mockResolvedValue({ code: 'print("Hello")', language: 'python' }),
    deleteDraft: jest.fn().mockResolvedValue(true),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    getQueuedEvents: jest.fn().mockResolvedValue([]),
    onTermData: jest.fn(),
    sendTermInput: jest.fn(),
    resizeTerm: jest.fn(),
  },
  writable: true,
});
