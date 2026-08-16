'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faTriangleExclamation,
  faCircleExclamation,
  faPaste,
  faExpand,
  faWindowMaximize,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { IntegrityEvent } from './types';

interface ProctoringTelemetryTimelineProps {
  events: IntegrityEvent[];
  riskScore?: number;
}

export function ProctoringTelemetryTimeline({
  events,
  riskScore = 0,
}: ProctoringTelemetryTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
        <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-400 text-2xl" />
        <div className="text-sm font-bold text-white">Clean Integrity Session</div>
        <p className="text-xs text-slate-400">
          No suspicious tab switches, focus losses, or external clipboard paste bursts were logged.
        </p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PASTE_LARGE':
        return faPaste;
      case 'FULLSCREEN_EXIT':
        return faExpand;
      case 'TAB_SWITCH':
      case 'WINDOW_BLUR':
      default:
        return faWindowMaximize;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Risk Summary Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${
              riskScore > 0.5
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            <FontAwesomeIcon
              icon={riskScore > 0.5 ? faCircleExclamation : faTriangleExclamation}
            />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {events.length} Integrity Event(s) Logged
            </div>
            <div className="text-xs text-slate-400">
              Telemetry recorded during the student's active exam session
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Calculated Risk
          </span>
          <span
            className={`text-sm font-extrabold ${
              riskScore > 0.5
                ? 'text-rose-400'
                : riskScore > 0.2
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {Math.round(riskScore * 100)}% Risk
          </span>
        </div>
      </div>

      {/* Events Timeline List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {events.map((ev, idx) => (
          <div
            key={ev.id || idx}
            className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start space-x-3 text-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5 border border-slate-800">
              <FontAwesomeIcon icon={getEventIcon(ev.type)} className="text-[11px]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-200 font-mono">{ev.type}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(
                    ev.severity
                  )}`}
                >
                  {ev.severity}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1 leading-snug">
                {ev.details || 'Suspicious user session activity detected.'}
              </p>
              {ev.payload && ev.payload.snippet && (
                <pre className="mt-1.5 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto">
                  <code>{ev.payload.snippet}</code>
                </pre>
              )}
            </div>

            <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1 flex-shrink-0">
              <FontAwesomeIcon icon={faClock} className="text-[9px]" />
              <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
