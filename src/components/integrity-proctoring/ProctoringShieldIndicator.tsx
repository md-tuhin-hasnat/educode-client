'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faShieldVirus,
  faCircleCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { IntegritySessionState } from './types';

interface ProctoringShieldIndicatorProps {
  state: IntegritySessionState;
  showDetails?: boolean;
}

export function ProctoringShieldIndicator({
  state,
  showDetails = false,
}: ProctoringShieldIndicatorProps) {
  const { isMonitoringActive, violationCount, riskScore } = state;

  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let icon = faShieldHalved;
  let statusText = 'Integrity Active';

  if (riskScore >= 0.6 || violationCount >= 3) {
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    icon = faShieldVirus;
    statusText = 'Alert Logged';
  } else if (violationCount > 0) {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    icon = faTriangleExclamation;
    statusText = 'Events Logged';
  }

  return (
    <div
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${badgeColor}`}
      title={
        isMonitoringActive
          ? `Academic integrity monitoring is active. ${violationCount} event(s) logged.`
          : 'Monitoring standby'
      }
    >
      <FontAwesomeIcon icon={icon} className="text-xs" />
      <span>{statusText}</span>
      {showDetails && violationCount > 0 && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-bold">
          {violationCount}
        </span>
      )}
    </div>
  );
}
