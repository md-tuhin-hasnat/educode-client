'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faShieldHalved,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { IntegrityEvent } from './types';

interface ProctoringWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: IntegrityEvent;
  violationCount: number;
}

export function ProctoringWarningModal({
  isOpen,
  onClose,
  event,
  violationCount,
}: ProctoringWarningModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl border border-amber-500/30">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Academic Integrity Notice
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {event?.details ||
              'A focus loss or window switch was detected. All activity during examination sessions is logged in the institutional proctoring report.'}
          </p>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1 font-mono">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Event Type:</span>
            <span className="text-amber-400 font-bold">{event?.type || 'WINDOW_BLUR'}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Total Logged Events:</span>
            <span className="text-rose-400 font-bold">{violationCount}</span>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Timestamp:</span>
            <span className="text-slate-300">
              {event?.timestamp
                ? new Date(event.timestamp).toLocaleTimeString()
                : new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition-all active:scale-98"
        >
          I Understand & Return to Exam
        </button>
      </div>
    </div>,
    document.body
  );
}
