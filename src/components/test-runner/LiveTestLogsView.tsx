'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTerminal,
  faCopy,
  faCheck,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { TestSuiteSummary } from '@/utils/testCaseRunner';

interface LiveTestLogsViewProps {
  summary: TestSuiteSummary | null;
  isRunning: boolean;
  passPercent: number;
  className?: string;
}

export function LiveTestLogsView({
  summary,
  isRunning,
  passPercent,
  className,
}: LiveTestLogsViewProps) {
  const [copiedLog, setCopiedLog] = useState(false);

  const handleCopyLogs = () => {
    if (!summary?.logs?.length) return;
    navigator.clipboard.writeText(summary.logs.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className={`bg-[#0f0f0f] flex flex-col ${className || 'w-full md:w-80 border-r border-slate-800 shrink-0'}`}>
      <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <FontAwesomeIcon icon={faTerminal} className="text-slate-500" />
          <span>Live Test Logs</span>
        </span>
        {summary?.logs && summary.logs.length > 0 && (
          <button
            onClick={handleCopyLogs}
            className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
            title="Copy all test output logs"
          >
            <FontAwesomeIcon icon={copiedLog ? faCheck : faCopy} />
            <span>{copiedLog ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5">
        {summary?.logs && summary.logs.length > 0 ? (
          summary.logs.map((log, idx) => {
            const isPass = log.includes('Passed') || log.includes('(AC)') || log.includes('✅');
            const isFail =
              log.includes('Wrong Answer') ||
              log.includes('(WA)') ||
              log.includes('Time Limit') ||
              log.includes('(TLE)') ||
              log.includes('Runtime Error') ||
              log.includes('(RTE)') ||
              log.includes('Compilation Error') ||
              log.includes('(CE)') ||
              log.includes('❌');
            const isSummary = log.includes('🏁');

            return (
              <div
                key={idx}
                className={`py-0.5 px-1.5 rounded transition-colors ${
                  isPass
                    ? 'text-emerald-400 bg-emerald-950/20'
                    : isFail
                    ? 'text-rose-400 bg-rose-950/20 font-bold'
                    : isSummary
                    ? 'text-brand-300 font-bold bg-brand-950/30 border border-brand-800/40 mt-2'
                    : 'text-slate-400'
                }`}
              >
                {log}
              </div>
            );
          })
        ) : isRunning ? (
          <div className="flex items-center space-x-2 text-amber-400 animate-pulse">
            <FontAwesomeIcon icon={faRotateRight} className="animate-spin text-xs" />
            <span>Executing test cases sequentially...</span>
          </div>
        ) : (
          <div className="text-slate-600 italic text-[11px] py-4 text-center">
            Click &quot;Run Samples&quot; or &quot;Run Pretests&quot; to begin evaluation.
          </div>
        )}
      </div>

      {/* Quick Progress Bar */}
      {summary && (
        <div className="p-2.5 bg-slate-900/80 border-t border-slate-800">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Progress</span>
            <span className="font-bold text-white">{passPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                passPercent === 100
                  ? 'bg-emerald-500'
                  : passPercent > 0
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${passPercent}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
