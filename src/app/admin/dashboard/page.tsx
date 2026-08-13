'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faServer,
  faShieldAlt,
  faSync,
  faGraduationCap,
  faChalkboardTeacher,
  faUserShield,
  faUserCog,
  faClock,
  faSliders,
  faMemory,
  faMicrochip,
  faChartPie,
  faCheck,
  faExclamationTriangle,
  faChartLine,
  faLayerGroup,
  faHdd,
  faBolt,
  faPlay,
  faPause,
  faVial,
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/config/api';

interface SystemStatsResponse {
  system: {
    cpuUsage: number;
    cpuCores: number;
    memory: {
      totalBytes: number;
      freeBytes: number;
      usedBytes: number;
      usedPercent: number;
      heapUsedBytes: number;
      heapTotalBytes: number;
      rssBytes: number;
    };
    loadAvg: number[];
    uptimeSeconds: number;
    nodeVersion: string;
  };
  database: {
    totalUsers: number;
    totalCourses: number;
    totalTasks: number;
    totalSubmissions: number;
    roles: {
      student: number;
      teacher: number;
      ta: number;
      admin: number;
    };
  };
  telemetry: {
    totalRequests: number;
    serverErrors: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRatio: number;
    avgResponseTimeMs: number;
    requestsPerSecond?: number;
  };
  timeframe: '24h' | '7d' | '30d';
  history: Array<{
    label: string;
    cpu: number;
    memory: number;
    errors: number;
    cacheHits: number;
    requests: number;
    avgLatency: number;
  }>;
  recentErrors: Array<{
    id: string;
    timestamp: string;
    statusCode: number;
    method: string;
    path: string;
    message: string;
  }>;
}

type MetricType = 'cpu' | 'memory' | 'requests' | 'cacheHits' | 'errors';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStatsResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [activeMetric, setActiveMetric] = useState<MetricType>('cpu');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);

  const fetchStats = useCallback(async (selectedTf: '24h' | '7d' | '30d', silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await apiClient.get<SystemStatsResponse>('/system-stats', {
        params: { timeframe: selectedTf },
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error loading real system stats:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and Real-time SSE / Polling Stream (2-second interval)
  useEffect(() => {
    fetchStats(timeframe, false);

    if (!isLiveStreaming) return;

    // Fast 2-second auto-poll interval for continuous real-time telemetry stream
    const pollInterval = setInterval(() => {
      fetchStats(timeframe, true);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [fetchStats, timeframe, isLiveStreaming]);

  const handleTimeframeChange = (tf: '24h' | '7d' | '30d') => {
    setTimeframe(tf);
    setHoveredIndex(null);
  };

  const handleSimulateEvent = async (type: 'request' | 'error') => {
    setIsSimulating(true);
    try {
      await apiClient.post('/system-stats/test-event', { type });
      await fetchStats(timeframe, true);
    } catch (err) {
      console.error('Failed to trigger simulation event:', err);
    } finally {
      setTimeout(() => setIsSimulating(false), 500);
    }
  };

  // Helper formatting functions
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  // Data processing for Chart rendering
  const history = stats?.history || [];
  const historyCount = history.length;

  const getMetricValue = (item: (typeof history)[0]) => {
    switch (activeMetric) {
      case 'cpu':
        return item.cpu;
      case 'memory':
        return item.memory;
      case 'requests':
        return item.requests;
      case 'cacheHits':
        return item.cacheHits;
      case 'errors':
        return item.errors;
      default:
        return item.cpu;
    }
  };

  const values = history.map(getMetricValue);
  const maxVal = Math.max(...values, activeMetric === 'errors' ? 5 : 10);
  const minVal = 0;

  // Chart dimensions & scaling
  const chartWidth = 760;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const getX = (idx: number) => {
    if (historyCount <= 1) return paddingX + usableWidth / 2;
    return paddingX + (idx / (historyCount - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    const norm = (val - minVal) / range;
    return paddingY + usableHeight * (1 - norm);
  };

  // Build SVG Path
  let linePath = '';
  let areaPath = '';
  if (historyCount > 0) {
    const pointsStr = history
      .map((pt, idx) => `${getX(idx)},${getY(getMetricValue(pt))}`)
      .join(' L ');
    linePath = `M ${pointsStr}`;
    const lastX = getX(historyCount - 1);
    const firstX = getX(0);
    const bottomY = chartHeight - paddingY;
    areaPath = `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }

  // Metric color configuration
  const metricConfigs = {
    cpu: {
      label: 'CPU Usage',
      unit: '%',
      color: '#38bdf8', // sky-400
      gradientId: 'gradient-cpu',
      textColor: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      currentVal: `${stats?.system.cpuUsage ?? 0}%`,
    },
    memory: {
      label: 'Memory Usage',
      unit: '%',
      color: '#a855f7', // purple-500
      gradientId: 'gradient-memory',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      currentVal: `${stats?.system.memory.usedPercent ?? 0}%`,
    },
    requests: {
      label: 'HTTP Requests',
      unit: 'req',
      color: '#10b981', // emerald-500
      gradientId: 'gradient-requests',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      currentVal: `${stats?.telemetry.totalRequests ?? 0}`,
    },
    cacheHits: {
      label: 'Cache Hits',
      unit: 'hits',
      color: '#f59e0b', // amber-500
      gradientId: 'gradient-cache',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      currentVal: `${stats?.telemetry.cacheHitRatio ?? 0}%`,
    },
    errors: {
      label: 'Server 5xx Errors',
      unit: 'err',
      color: '#f43f5e', // rose-500
      gradientId: 'gradient-errors',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      currentVal: `${stats?.telemetry.serverErrors ?? 0}`,
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  // User distribution statistics for Donut chart
  const roles = stats?.database.roles || { student: 0, teacher: 0, ta: 0, admin: 0 };
  const totalUsers = stats?.database.totalUsers || 0;
  const roleSum = totalUsers || 1;

  const roleSegments = [
    { key: 'student', label: 'Students', count: roles.student, color: '#38bdf8', icon: faGraduationCap },
    { key: 'teacher', label: 'Teachers', count: roles.teacher, color: '#a855f7', icon: faChalkboardTeacher },
    { key: 'ta', label: 'Teaching Assistants', count: roles.ta, color: '#f59e0b', icon: faUserShield },
    { key: 'admin', label: 'Admins', count: roles.admin, color: '#10b981', icon: faUserCog },
  ];

  let accumulatedPercent = 0;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto min-h-screen text-slate-100">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              System Telemetry & Real-Time Diagnostics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {stats?.system.nodeVersion || 'Node.js'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Live hardware performance metrics, HTTP request throughput, and real-time database health monitoring.
          </p>
        </div>

        {/* Live Stream Controls & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Live Streaming Pulsing Status Badge */}
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              isLiveStreaming
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isLiveStreaming && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveStreaming ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </span>
            <span>{isLiveStreaming ? 'LIVE TELEMETRY (2s)' : 'PAUSED'}</span>
            <FontAwesomeIcon icon={isLiveStreaming ? faPause : faPlay} className="ml-1 text-[10px]" />
          </button>

          {/* Test Traffic Simulator Buttons */}
          <button
            onClick={() => handleSimulateEvent('request')}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-teal-500/40 text-xs font-medium text-slate-200 transition-all hover:bg-slate-800"
            title="Send test API request to verify real-time metric update"
          >
            <FontAwesomeIcon icon={faVial} className="text-teal-400" />
            <span>Test Traffic</span>
          </button>

          <button
            onClick={() => handleSimulateEvent('error')}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-medium text-rose-300 transition-all"
            title="Trigger simulated 500 error to test exception logging"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-rose-400" />
            <span>Simulate 500</span>
          </button>

          {/* DB Telemetry Storage Optimization Button */}
          <button
            onClick={async () => {
              try {
                await apiClient.post('/system-stats/optimize-storage');
                await fetchStats(timeframe, false);
                alert('Database telemetry storage optimized! Expired logs pruned successfully.');
              } catch (err) {
                console.error('Storage optimization failed:', err);
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-xs font-medium text-purple-300 transition-all"
            title="Prune expired logs and run downsampling storage optimization"
          >
            <FontAwesomeIcon icon={faHdd} className="text-purple-400" />
            <span>Optimize Storage</span>
          </button>

          <button
            onClick={() => fetchStats(timeframe, false)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 transition-all"
            title="Manual Refresh"
          >
            <FontAwesomeIcon icon={faSync} className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/settings"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-900/30"
          >
            <FontAwesomeIcon icon={faSliders} />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: CPU Hardware Load */}
        <div
          onClick={() => setActiveMetric('cpu')}
          className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'cpu'
              ? 'border-sky-500/50 bg-sky-950/20 shadow-lg shadow-sky-950/30'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CPU Usage</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <FontAwesomeIcon icon={faMicrochip} className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats?.system.cpuUsage ?? 0}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              {stats?.system.cpuCores ?? 1} Cores
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <span>Load Avg (1m)</span>
            <span className="text-sky-300 font-bold">{stats?.system.loadAvg[0] ?? '0.00'}</span>
          </div>
        </div>

        {/* Card 2: Memory (RAM) */}
        <div
          onClick={() => setActiveMetric('memory')}
          className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'memory'
              ? 'border-purple-500/50 bg-purple-950/20 shadow-lg shadow-purple-950/30'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Memory (RAM)</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <FontAwesomeIcon icon={faMemory} className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats?.system.memory.usedPercent ?? 0}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              {formatBytes(stats?.system.memory.usedBytes || 0)} / {formatBytes(stats?.system.memory.totalBytes || 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <span>Process Heap</span>
            <span className="text-purple-300 font-bold">{formatBytes(stats?.system.memory.heapUsedBytes || 0)}</span>
          </div>
        </div>

        {/* Card 3: Total Requests & RPS */}
        <div
          onClick={() => setActiveMetric('requests')}
          className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'requests'
              ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">API Requests</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FontAwesomeIcon icon={faBolt} className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats?.telemetry.totalRequests ?? 0}
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {stats?.telemetry.requestsPerSecond ?? 0} req/s
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <span>Avg Response Latency</span>
            <span className="text-emerald-300 font-bold">{stats?.telemetry.avgResponseTimeMs ?? 0} ms</span>
          </div>
        </div>

        {/* Card 4: Cache Hit Ratio & Errors */}
        <div
          onClick={() => setActiveMetric('cacheHits')}
          className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
            activeMetric === 'cacheHits' || activeMetric === 'errors'
              ? 'border-amber-500/50 bg-amber-950/20 shadow-lg shadow-amber-950/30'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cache Performance</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FontAwesomeIcon icon={faHdd} className="text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {stats?.telemetry.cacheHitRatio ?? 0}%
            </span>
            <span className="text-xs font-mono text-amber-300">
              {stats?.telemetry.cacheHits ?? 0} Hits
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <span>5xx Server Errors</span>
            <span className={`font-bold ${stats?.telemetry.serverErrors ? 'text-rose-400' : 'text-emerald-400'}`}>
              {stats?.telemetry.serverErrors ?? 0} Errors
            </span>
          </div>
        </div>

      </div>

      {/* Main Interactive Telemetry Graph & DB Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Responsive SVG Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
          
          {/* Graph Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faChartLine} className={currentConfig.textColor} />
                <h2 className="text-base font-bold text-white tracking-tight">
                  {currentConfig.label} Real-Time Stream
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic telemetry trends captured by backend interceptors over time.
              </p>
            </div>

            {/* Timeframe selector pills */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['24h', '7d', '30d'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-3 py-1 rounded-lg font-mono font-bold uppercase transition-all ${
                    timeframe === tf
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(metricConfigs) as MetricType[]).map((key) => {
              const cfg = metricConfigs[key];
              const isActive = activeMetric === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all border ${
                    isActive
                      ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} font-bold shadow-sm`
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* SVG Chart Rendering */}
          <div className="relative w-full h-56 bg-slate-950/60 rounded-xl p-4 border border-slate-900 overflow-hidden flex flex-col justify-between">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={currentConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#1e293b" strokeDasharray="3 3" />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#1e293b" strokeDasharray="3 3" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#1e293b" />

              {/* Area & Line */}
              {areaPath && <path d={areaPath} fill={`url(#${currentConfig.gradientId})`} />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={currentConfig.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {history.map((pt, idx) => {
                const cx = getX(idx);
                const cy = getY(getMetricValue(pt));
                const isHovered = hoveredIndex === idx;

                return (
                  <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? '7' : '4'}
                      fill={isHovered ? '#ffffff' : currentConfig.color}
                      stroke={currentConfig.color}
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                    {/* Hover vertical guide line */}
                    {isHovered && (
                      <line
                        x1={cx}
                        y1={paddingY}
                        x2={cx}
                        y2={chartHeight - paddingY}
                        stroke={currentConfig.color}
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between items-center px-4 pt-2 text-[10px] font-mono text-slate-500 border-t border-slate-900">
              {history.map((pt, idx) => (
                <span
                  key={idx}
                  className={`transition-colors ${hoveredIndex === idx ? 'text-white font-bold' : ''}`}
                >
                  {pt.label}
                </span>
              ))}
            </div>

            {/* Floating Interactive Tooltip */}
            {hoveredIndex !== null && history[hoveredIndex] && (
              <div className="absolute top-4 left-6 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1 z-10 font-mono">
                <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>{history[hoveredIndex].label}</span>
                  <span className={currentConfig.textColor}>
                    {getMetricValue(history[hoveredIndex])} {currentConfig.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300 pt-1">
                  <div>CPU: <span className="text-sky-400 font-bold">{history[hoveredIndex].cpu}%</span></div>
                  <div>RAM: <span className="text-purple-400 font-bold">{history[hoveredIndex].memory}%</span></div>
                  <div>Requests: <span className="text-emerald-400 font-bold">{history[hoveredIndex].requests}</span></div>
                  <div>Latency: <span className="text-amber-400 font-bold">{history[hoveredIndex].avgLatency}ms</span></div>
                  <div className="col-span-2">
                    5xx Errors:{' '}
                    <span className={`font-semibold ${history[hoveredIndex].errors > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {history[hoveredIndex].errors}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: User Distribution Donut Chart (Real Database Records) */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <FontAwesomeIcon icon={faChartPie} className="text-teal-400" />
              <span>Real DB User Records</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live role counts from PostgreSQL database.
            </p>
          </div>

          {/* SVG Donut */}
          <div className="relative flex items-center justify-center my-2">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              <circle cx="90" cy="90" r={radius} fill="transparent" stroke="#1e293b" strokeWidth="22" />

              {roleSegments.map((seg) => {
                const percent = seg.count / roleSum;
                const strokeDasharray = `${percent * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                const isSelected = selectedRoleKey === seg.key;

                return (
                  <circle
                    key={seg.key}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isSelected ? '28' : '22'}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer hover:opacity-90"
                    onMouseEnter={() => setSelectedRoleKey(seg.key)}
                    onMouseLeave={() => setSelectedRoleKey(null)}
                  />
                );
              })}
            </svg>

            {/* Central Donut Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-black text-white tracking-tight">
                {selectedRoleKey ? roles[selectedRoleKey as keyof typeof roles] : totalUsers}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {selectedRoleKey ? selectedRoleKey.toUpperCase() : 'DB Accounts'}
              </span>
            </div>
          </div>

          {/* Role Legend */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {roleSegments.map((seg) => {
              const pct = ((seg.count / roleSum) * 100).toFixed(1);
              const isSelected = selectedRoleKey === seg.key;
              return (
                <div
                  key={seg.key}
                  onMouseEnter={() => setSelectedRoleKey(seg.key)}
                  onMouseLeave={() => setSelectedRoleKey(null)}
                  className={`p-2 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    isSelected ? 'bg-slate-800/80 border border-slate-700' : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    <FontAwesomeIcon icon={seg.icon} className="text-slate-400 text-xs" />
                    <span className="font-medium text-slate-200">{seg.label}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-white">{seg.count}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Real System Exception Log & Runtime Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Runtime Diagnostics */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faServer} className="text-teal-400" />
              <span>Node.js Process & Hardware Telemetry</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>NestJS Engine Live</span>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faClock} className="text-purple-400 text-sm" />
                <div>
                  <span className="font-bold text-slate-200 block">Process Uptime</span>
                  <span className="text-[11px] text-slate-400">Node runtime instance lifetime</span>
                </div>
              </div>
              <span className="font-mono font-bold text-purple-300 text-sm">
                {formatUptime(stats?.system.uptimeSeconds || 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faLayerGroup} className="text-teal-400 text-sm" />
                <div>
                  <span className="font-bold text-slate-200 block">Engine Runtime & Environment</span>
                  <span className="text-[11px] text-slate-400">Backend framework details</span>
                </div>
              </div>
              <span className="font-mono font-bold text-teal-300 text-xs">
                {stats?.system.nodeVersion || 'v20.x'} (Linux x64)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Total DB Courses</span>
                <span className="text-lg font-bold text-white">{stats?.database.totalCourses ?? 0} Classrooms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Total Submissions</span>
                <span className="text-lg font-bold text-white">{stats?.database.totalSubmissions ?? 0} Submitted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Server Errors Log Buffer */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <FontAwesomeIcon icon={faShieldAlt} className="text-rose-400" />
              <span>Real 5xx Server Error Logs</span>
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
              (stats?.recentErrors.length || 0) > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {stats?.recentErrors.length || 0} Exceptions Recorded
            </span>
          </div>

          <div className="space-y-3 text-xs overflow-y-auto max-h-60 pr-1">
            {(!stats?.recentErrors || stats.recentErrors.length === 0) ? (
              <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-sm">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
                <p className="font-bold text-slate-200 text-xs">No Server Errors Recorded</p>
                <p className="text-[11px] text-slate-500">
                  All NestJS HTTP endpoints are responding with 2xx/3xx status codes.
                </p>
              </div>
            ) : (
              stats.recentErrors.map((err) => (
                <div key={err.id} className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-400 text-xs">
                      [{err.method}] {err.path}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono bg-slate-950/60 p-1.5 rounded border border-rose-900/30">
                    {err.message}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-800 flex items-center justify-between">
            <span>Real-time telemetry captured by TelemetryInterceptor.</span>
            <Link
              href="/admin/notifications"
              className="text-brand-400 hover:text-brand-300 font-semibold text-[11px] transition-colors"
            >
              Open Notification Center &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
