export type IntegrityEventType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'PASTE_LARGE'
  | 'FULLSCREEN_EXIT'
  | 'DEVTOOLS_OPEN'
  | 'MULTIPLE_MONITORS'
  | 'SUSPICIOUS_TYPING';

export type IntegritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IntegrityEvent {
  id: string;
  type: IntegrityEventType;
  timestamp: string;
  details?: string;
  severity: IntegritySeverity;
  payload?: Record<string, any>;
}

export interface IntegritySessionState {
  isMonitoringActive: boolean;
  violationCount: number;
  lastViolation?: IntegrityEvent;
  isFullscreen: boolean;
  riskScore: number; // 0.0 to 1.0
  events: IntegrityEvent[];
}

export interface IntegrityMonitorOptions {
  submissionId?: string;
  taskId?: string;
  enableFullscreenLock?: boolean;
  enablePasteDetection?: boolean;
  pasteCharThreshold?: number;
  onViolation?: (event: IntegrityEvent) => void;
  syncIntervalMs?: number;
}
