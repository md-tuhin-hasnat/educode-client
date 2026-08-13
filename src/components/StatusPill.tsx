import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
  faClock,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

export type StatusType = 'success' | 'warning' | 'error' | 'pending' | 'running';

interface StatusConfig {
  icon: IconDefinition;
  bg: string;
  text: string;
  border: string;
  defaultLabel: string;
  spin?: boolean;
}

interface StatusPillProps {
  status: StatusType;
  label?: string;
}

export default function StatusPill({ status, label }: StatusPillProps) {
  const configs: Record<StatusType, StatusConfig> = {
    success: {
      icon: faCheckCircle,
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-400',
      border: 'border-emerald-800',
      defaultLabel: 'Passed',
    },
    warning: {
      icon: faExclamationTriangle,
      bg: 'bg-amber-950/80',
      text: 'text-amber-400',
      border: 'border-amber-800',
      defaultLabel: 'Flagged',
    },
    error: {
      icon: faTimesCircle,
      bg: 'bg-rose-950/80',
      text: 'text-rose-400',
      border: 'border-rose-800',
      defaultLabel: 'Failed',
    },
    pending: {
      icon: faClock,
      bg: 'bg-slate-900',
      text: 'text-slate-400',
      border: 'border-slate-800',
      defaultLabel: 'Queued',
    },
    running: {
      icon: faSpinner,
      bg: 'bg-brand-950/80',
      text: 'text-brand-400',
      border: 'border-brand-800',
      defaultLabel: 'Executing',
      spin: true,
    },
  };

  const config = configs[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
      data-testid={`status-pill-${status}`}
    >
      <FontAwesomeIcon icon={config.icon} spin={config.spin} className="text-[11px]" />
      <span>{displayLabel}</span>
    </span>
  );
}
