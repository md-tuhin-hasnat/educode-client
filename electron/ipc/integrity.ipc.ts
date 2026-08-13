import { ipcMain, BrowserWindow, desktopCapturer } from 'electron';
import { getDatabase } from '../sqlite';
import crypto from 'crypto';

export interface IntegrityLogEvent {
  submissionId?: string;
  eventType: 'FOCUS_LOST' | 'FOCUS_GAINED' | 'PASTE_EXTERNAL' | 'PASTE_INTERNAL' | 'RAPID_ENTRY' | 'SCREENSHOT_CAPTURED' | 'MULTIPLE_MONITORS_DETECTED';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp?: number;
  durationMs?: number;
}

let activeSubmissionId: string | null = null;
let focusLostTimestamp: number | null = null;
const eventQueue: IntegrityLogEvent[] = [];

export function registerIntegrityIPC(mainWindow: BrowserWindow) {
  // Focus lost listener
  const handleBlur = () => {
    if (!activeSubmissionId) return;
    focusLostTimestamp = Date.now();

    const event: IntegrityLogEvent = {
      submissionId: activeSubmissionId,
      eventType: 'FOCUS_LOST',
      details: 'Window lost focus (student switched app or navigated away)',
      severity: 'MEDIUM',
      timestamp: focusLostTimestamp,
    };

    eventQueue.push(event);
    saveEventToDb(event);

    mainWindow.webContents.send('integrity:event', {
      ...event,
      warnings: eventQueue.filter((e) => e.eventType === 'FOCUS_LOST').length,
    });
  };

  // Focus gained listener
  const handleFocus = () => {
    if (!activeSubmissionId || !focusLostTimestamp) return;
    const now = Date.now();
    const durationMs = now - focusLostTimestamp;
    focusLostTimestamp = null;

    const event: IntegrityLogEvent = {
      submissionId: activeSubmissionId,
      eventType: 'FOCUS_GAINED',
      details: `Window regained focus after ${(durationMs / 1000).toFixed(1)}s`,
      severity: durationMs > 5000 ? 'HIGH' : 'LOW',
      timestamp: now,
      durationMs,
    };

    eventQueue.push(event);
    saveEventToDb(event);

    mainWindow.webContents.send('integrity:event', event);
  };

  mainWindow.on('blur', handleBlur);
  mainWindow.on('focus', handleFocus);

  // Start monitoring session
  ipcMain.handle('integrity:startMonitoring', async (_event, submissionId: string) => {
    activeSubmissionId = submissionId;
    focusLostTimestamp = null;
    eventQueue.length = 0; // Reset queue
    console.log(`[IntegrityIPC] Monitoring started for submission: ${submissionId}`);
    return { success: true, submissionId };
  });

  // Stop monitoring session
  ipcMain.handle('integrity:stopMonitoring', async () => {
    console.log(`[IntegrityIPC] Monitoring stopped for submission: ${activeSubmissionId}`);
    const finalQueue = [...eventQueue];
    activeSubmissionId = null;
    focusLostTimestamp = null;
    eventQueue.length = 0;
    return { success: true, events: finalQueue };
  });

  // Get queued events
  ipcMain.handle('integrity:getQueuedEvents', async () => {
    return [...eventQueue];
  });

  // Explicit event logging handler
  ipcMain.handle('integrity:logEvent', async (_event, eventData: IntegrityLogEvent) => {
    const eventWithSub = {
      ...eventData,
      submissionId: eventData.submissionId || activeSubmissionId || undefined,
      timestamp: eventData.timestamp || Date.now(),
    };
    eventQueue.push(eventWithSub);
    const id = saveEventToDb(eventWithSub);
    return { success: true, id };
  });

  // Screenshot capture handler
  ipcMain.handle('integrity:captureScreenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
      if (sources.length > 0) {
        return sources[0].thumbnail.toDataURL();
      }
      return null;
    } catch (err) {
      console.error('[IntegrityIPC] Screenshot capture error:', err);
      return null;
    }
  });
}

function saveEventToDb(eventData: IntegrityLogEvent): string {
  try {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = eventData.timestamp || Date.now();

    const stmt = db.prepare(`
      INSERT INTO offline_logs (id, submissionId, eventType, details, severity, occurredAt, syncStatus)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `);

    stmt.run(
      id,
      eventData.submissionId || null,
      eventData.eventType,
      eventData.details,
      eventData.severity,
      now
    );

    return id;
  } catch (err) {
    console.error('[IntegrityIPC] DB save error:', err);
    return '';
  }
}
