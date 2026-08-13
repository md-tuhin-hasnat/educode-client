'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faExclamationTriangle,
  faBug,
  faMicrochip,
  faInfoCircle,
  faCheckCircle,
  faCheckDouble,
  faChevronDown,
  faChevronUp,
  faSearch,
  faSync,
  faTerminal,
} from '@fortawesome/free-solid-svg-icons';

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  severity: 'CRITICAL' | 'WARNING' | 'HARDWARE' | 'INFO' | string;
  category: string;
  isRead: boolean;
  resolved: boolean;
  createdAt: string;
  errorLog?: {
    id: string;
    statusCode: number;
    errorType: string;
    message: string;
    stackTrace?: string;
    path: string;
    method: string;
    userEmail?: string;
    createdAt: string;
  } | null;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = `${API_URL}/notifications?limit=50`;
      if (selectedSeverity !== 'ALL') {
        query += `&severity=${selectedSeverity}`;
      }
      const res = await fetch(query);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, selectedSeverity]);

  useEffect(() => {
    fetchNotifications();

    // SSE Connection for live updates
    const eventSource = new EventSource(`${API_URL}/notifications/stream`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'NOTIFICATION' && parsed.payload) {
          setNotifications((prev) => [parsed.payload, ...prev]);
        }
      } catch {
        // SSE Heartbeat
      }
    };

    return () => {
      eventSource.close();
    };
  }, [API_URL, fetchNotifications]);

  const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: !currentStatus } : n)),
      );
    } catch (err) {
      console.error('Error toggling read status:', err);
    }
  };

  const handleToggleResolve = async (id: string, currentResolved: boolean) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/resolve`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, resolved: !currentResolved } : n)),
      );
    } catch (err) {
      console.error('Error toggling resolve status:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Filtered Notifications
  const filteredNotifications = notifications.filter((n) => {
    if (selectedStatus === 'UNREAD' && n.isRead) return false;
    if (selectedStatus === 'RESOLVED' && !n.resolved) return false;
    if (selectedStatus === 'UNRESOLVED' && n.resolved) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchBody = n.body?.toLowerCase().includes(q) || false;
      const matchPath = n.errorLog?.path?.toLowerCase().includes(q) || false;
      const matchMessage = n.errorLog?.message?.toLowerCase().includes(q) || false;
      return matchTitle || matchBody || matchPath || matchMessage;
    }

    return true;
  });

  const criticalCount = notifications.filter((n) => n.severity === 'CRITICAL').length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const unresolvedCount = notifications.filter((n) => !n.resolved).length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
          cardBorder: 'border-rose-500/40 hover:border-rose-500/80',
          icon: faBug,
          color: 'text-rose-400',
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
          cardBorder: 'border-amber-500/40 hover:border-amber-500/80',
          icon: faExclamationTriangle,
          color: 'text-amber-400',
        };
      case 'HARDWARE':
        return {
          bg: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
          cardBorder: 'border-purple-500/40 hover:border-purple-500/80',
          icon: faMicrochip,
          color: 'text-purple-400',
        };
      default:
        return {
          bg: 'bg-teal-500/10 border-teal-500/40 text-teal-400',
          cardBorder: 'border-teal-500/40 hover:border-teal-500/80',
          icon: faInfoCircle,
          color: 'text-teal-400',
        };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <FontAwesomeIcon icon={faBell} className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Notification & Error Observability Center
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time incident tracking, telemetry alerts, and backend exception audit log.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-colors flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faCheckDouble} className="text-brand-400" />
            <span>Mark All as Read</span>
          </button>

          <button
            onClick={fetchNotifications}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/60 transition-colors"
            title="Refresh Feed"
          >
            <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Events</p>
          <p className="text-2xl font-extrabold text-white mt-1">{notifications.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 backdrop-blur-md">
          <p className="text-[11px] font-bold uppercase text-rose-400 tracking-wider">Critical Exceptions</p>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">{criticalCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 backdrop-blur-md">
          <p className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">Unread Alerts</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">{unreadCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-500/30 backdrop-blur-md">
          <p className="text-[11px] font-bold uppercase text-teal-400 tracking-wider">Open Incidents</p>
          <p className="text-2xl font-extrabold text-teal-400 mt-1">{unresolvedCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'CRITICAL', 'WARNING', 'HARDWARE', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSeverity === sev
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filter Tabs & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-2.5 text-xs text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search errors or stack trace..."
              className="pl-8 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 w-56"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNREAD">Unread Only</option>
            <option value="UNRESOLVED">Unresolved Incidents</option>
            <option value="RESOLVED">Resolved Incidents</option>
          </select>
        </div>
      </div>

      {/* Notifications / Errors Feed */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <FontAwesomeIcon icon={faSync} className="animate-spin text-lg mr-2 text-brand-400" />
            Loading real-time error observability logs...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800/80 text-slate-400 text-sm">
            No notification logs match your filter criteria.
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const style = getSeverityBadge(item.severity);
            const isTraceExpanded = expandedTraceId === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl bg-slate-900/90 border ${style.cardBorder} backdrop-blur-md transition-all space-y-3 ${
                  !item.isRead ? 'ring-1 ring-brand-500/30' : 'opacity-90'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <FontAwesomeIcon icon={style.icon} className={`text-sm ${style.color}`} />
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${style.bg}`}
                    >
                      {item.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                      {item.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{item.title}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-[11px] text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>

                    {/* Action Controls */}
                    <button
                      onClick={() => handleMarkAsRead(item.id, item.isRead)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        item.isRead
                          ? 'text-slate-500 hover:text-slate-300'
                          : 'bg-brand-500/20 text-brand-400 border border-brand-500/30 hover:bg-brand-500/30'
                      }`}
                    >
                      {item.isRead ? 'Mark Unread' : 'Mark Read'}
                    </button>

                    <button
                      onClick={() => handleToggleResolve(item.id, item.resolved)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center space-x-1 ${
                        item.resolved
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                      <span>{item.resolved ? 'Resolved' : 'Resolve'}</span>
                    </button>
                  </div>
                </div>

                {/* Body / Description */}
                {item.body && <p className="text-xs text-slate-300 leading-relaxed">{item.body}</p>}

                {/* Associated Error Log & Stack Trace Panel */}
                {item.errorLog && (
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faTerminal} className="text-rose-400 text-xs" />
                        <span className="font-mono text-rose-400 font-bold">
                          HTTP {item.errorLog.statusCode} ({item.errorLog.errorType})
                        </span>
                        <span className="font-mono text-slate-400">
                          {item.errorLog.method} {item.errorLog.path}
                        </span>
                      </div>

                      {item.errorLog.stackTrace && (
                        <button
                          onClick={() =>
                            setExpandedTraceId(isTraceExpanded ? null : item.id)
                          }
                          className="text-[11px] text-brand-400 hover:text-brand-300 font-medium flex items-center space-x-1"
                        >
                          <span>{isTraceExpanded ? 'Hide Stack Trace' : 'View Stack Trace'}</span>
                          <FontAwesomeIcon icon={isTraceExpanded ? faChevronUp : faChevronDown} />
                        </button>
                      )}
                    </div>

                    <p className="text-xs font-mono text-slate-300">{item.errorLog.message}</p>

                    {/* Expandable Stack Trace */}
                    {isTraceExpanded && item.errorLog.stackTrace && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
                        <pre className="text-[11px] font-mono text-rose-300/90 whitespace-pre-wrap leading-relaxed">
                          {item.errorLog.stackTrace}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
