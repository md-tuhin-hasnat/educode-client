'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IntegrityEvent,
  IntegrityEventType,
  IntegrityMonitorOptions,
  IntegritySessionState,
} from './types';
import { apiClient } from '@/config/api';

export function useIntegrityMonitor(options: IntegrityMonitorOptions = {}) {
  const {
    submissionId,
    taskId,
    enableFullscreenLock = false,
    enablePasteDetection = true,
    pasteCharThreshold = 50,
    onViolation,
    syncIntervalMs = 30000,
  } = options;

  const [state, setState] = useState<IntegritySessionState>({
    isMonitoringActive: false,
    violationCount: 0,
    isFullscreen: false,
    riskScore: 0,
    events: [],
  });

  const eventQueueRef = useRef<IntegrityEvent[]>([]);

  const recordEvent = useCallback(
    (
      type: IntegrityEventType,
      details: string,
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
      payload?: Record<string, any>
    ) => {
      const newEvent: IntegrityEvent = {
        id: `int_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        type,
        timestamp: new Date().toISOString(),
        details,
        severity,
        payload,
      };

      eventQueueRef.current.push(newEvent);

      setState((prev) => {
        const nextEvents = [...prev.events, newEvent];
        const count = nextEvents.length;
        // Calculate dynamic risk score (0.0 to 1.0)
        const score = Math.min(
          1.0,
          nextEvents.reduce((acc, ev) => {
            if (ev.severity === 'CRITICAL') return acc + 0.35;
            if (ev.severity === 'HIGH') return acc + 0.2;
            if (ev.severity === 'MEDIUM') return acc + 0.1;
            return acc + 0.05;
          }, 0)
        );

        return {
          ...prev,
          violationCount: count,
          lastViolation: newEvent,
          riskScore: score,
          events: nextEvents,
        };
      });

      if (onViolation) {
        onViolation(newEvent);
      }
    },
    [onViolation]
  );

  // Sync event queue to backend server
  const flushEventQueue = useCallback(async () => {
    if (eventQueueRef.current.length === 0 || !submissionId) return;

    const eventsToSend = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      await apiClient.post(`/submissions/${submissionId}/integrity-event`, {
        events: eventsToSend,
        taskId,
      });
    } catch (err) {
      console.warn('Failed to sync integrity events to server, requeuing:', err);
      eventQueueRef.current = [...eventsToSend, ...eventQueueRef.current];
    }
  }, [submissionId, taskId]);

  useEffect(() => {
    const timer = setInterval(() => {
      flushEventQueue();
    }, syncIntervalMs);

    return () => clearInterval(timer);
  }, [flushEventQueue, syncIntervalMs]);

  // Window Focus / Blur & Visibility Change Listeners
  useEffect(() => {
    let isWindowBlurred = false;

    const handleBlur = () => {
      isWindowBlurred = true;
      recordEvent(
        'WINDOW_BLUR',
        'Window lost focus (student may have switched to another window/app)',
        'HIGH'
      );
    };

    const handleFocus = () => {
      if (isWindowBlurred) {
        isWindowBlurred = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordEvent(
          'TAB_SWITCH',
          'Document hidden (browser tab or application switched)',
          'HIGH'
        );
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    setState((prev) => ({ ...prev, isMonitoringActive: true }));

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setState((prev) => ({ ...prev, isMonitoringActive: false }));
    };
  }, [recordEvent]);

  // Fullscreen Change Listeners
  useEffect(() => {
    if (!enableFullscreenLock) return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setState((prev) => ({ ...prev, isFullscreen: isFull }));
      if (!isFull) {
        recordEvent(
          'FULLSCREEN_EXIT',
          'Exited full screen examination mode',
          'HIGH'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enableFullscreenLock, recordEvent]);

  // Clipboard Paste Detection
  useEffect(() => {
    if (!enablePasteDetection) return;

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      if (text.length >= pasteCharThreshold) {
        recordEvent(
          'PASTE_LARGE',
          `Large text burst pasted (${text.length} characters)`,
          text.length > 200 ? 'HIGH' : 'MEDIUM',
          { length: text.length, snippet: text.substring(0, 100) }
        );
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [enablePasteDetection, pasteCharThreshold, recordEvent]);

  return {
    state,
    recordEvent,
    flushEventQueue,
  };
}
