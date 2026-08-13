'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faExclamationTriangle,
  faBug,
  faInfoCircle,
  faCheckCircle,
  faCheckDouble,
  faSearch,
  faSync,
  faTasks,
  faComments,
  faGraduationCap,
  faExternalLinkAlt,
  faTrash,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';

interface NotificationItem {
  id: string;
  userId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  category: 'SUBMISSION' | 'COMMENT' | 'EXAM_ALERT' | 'SYSTEM_NOTICE' | string;
  metadata?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function TeacherNotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      let query = `${API_URL}/notifications?limit=100`;
      if (user?.id) {
        query += `&userId=${user.id}`;
      }
      if (selectedCategory !== 'ALL') {
        query += `&category=${selectedCategory}`;
      }
      const res = await fetch(query);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching teacher notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, user?.id, selectedCategory]);

  useEffect(() => {
    fetchNotifications();

    // SSE Connection for live real-time notifications
    const eventSource = new EventSource(`${API_URL}/notifications/stream`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'NOTIFICATION' && parsed.payload) {
          const payload = parsed.payload;
          // Filter if belongs to this teacher or global
          if (!payload.userId || payload.userId === user?.id) {
            setNotifications((prev) => [payload, ...prev]);
          }
        }
      } catch {
        // SSE Heartbeat
      }
    };

    return () => {
      eventSource.close();
    };
  }, [API_URL, fetchNotifications, user?.id]);

  const handleMarkAsRead = async (id: string, currentIsRead: boolean) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: !currentIsRead } : n)),
      );
    } catch (err) {
      console.error('Failed to update notification read status:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Filtered notifications logic
  const filteredNotifications = notifications.filter((item) => {
    if (selectedStatus === 'UNREAD' && item.isRead) return false;
    if (selectedStatus === 'READ' && !item.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBody = item.body ? item.body.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchBody) return false;
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const submissionsCount = notifications.filter((n) => n.category === 'SUBMISSION').length;
  const commentsCount = notifications.filter((n) => n.category === 'COMMENT').length;
  const examAlertsCount = notifications.filter((n) => n.category === 'EXAM_ALERT').length;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          icon: faBug,
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: faExclamationTriangle,
        };
      default:
        return {
          bg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
          icon: faInfoCircle,
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SUBMISSION':
        return { icon: faTasks, color: 'text-indigo-400', label: 'Submission' };
      case 'COMMENT':
        return { icon: faComments, color: 'text-teal-400', label: 'Comment' };
      case 'EXAM_ALERT':
        return { icon: faGraduationCap, color: 'text-amber-400', label: 'Exam Alert' };
      default:
        return { icon: faBell, color: 'text-sky-400', label: 'System' };
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <FontAwesomeIcon icon={faBell} className="text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Teacher Notification Center
              </h1>
              <p className="text-xs text-slate-400">
                Real-time updates on student task submissions, classroom stream comments, and exam alerts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchNotifications}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-900/30 transition-all flex items-center space-x-2"
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Notifications
          </p>
          <p className="text-2xl font-black text-white mt-1">{notifications.length}</p>
        </div>
        <div className="bg-slate-900/60 border border-rose-500/30 p-4 rounded-2xl bg-rose-950/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
            Unread
          </p>
          <p className="text-2xl font-black text-rose-400 mt-1">{unreadCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-indigo-500/30 p-4 rounded-2xl bg-indigo-950/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            Submissions
          </p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{submissionsCount}</p>
        </div>
        <div className="bg-slate-900/60 border border-teal-500/30 p-4 rounded-2xl bg-teal-950/10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
            Comments & Alerts
          </p>
          <p className="text-2xl font-black text-teal-400 mt-1">
            {commentsCount + examAlertsCount}
          </p>
        </div>
      </div>

      {/* Control Filters & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3.5 top-3 text-xs text-slate-500"
          />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 border border-slate-800 rounded-xl">
            <FontAwesomeIcon icon={faFilter} className="text-[10px] text-slate-500 ml-2 mr-1" />
            {['ALL', 'SUBMISSION', 'COMMENT', 'EXAM_ALERT'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'All Types' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 border border-slate-800 rounded-xl">
            {['ALL', 'UNREAD', 'READ'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === status
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <FontAwesomeIcon icon={faSync} className="text-2xl text-teal-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-teal-500/50" />
            <p className="text-sm font-bold text-slate-300">All caught up!</p>
            <p className="text-xs text-slate-500">No notifications matching your criteria.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const sevBadge = getSeverityBadge(n.severity);
            const catInfo = getCategoryIcon(n.category);

            return (
              <div
                key={n.id}
                className={`group border rounded-2xl p-4 transition-all backdrop-blur-md flex items-start justify-between gap-4 ${
                  n.isRead
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    : 'bg-slate-900/90 border-slate-700/80 shadow-lg shadow-teal-950/20'
                }`}
              >
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  {/* Category Badge Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                    <FontAwesomeIcon icon={catInfo.icon} className={`text-sm ${catInfo.color}`} />
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                        {n.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${sevBadge.bg}`}
                      >
                        {n.severity}
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {catInfo.label}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      )}
                    </div>

                    {n.body && (
                      <p className="text-xs text-slate-300 leading-relaxed break-words">
                        {n.body}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-400">
                      <span>
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {(() => {
                        // Derive deep-link: explicit link > metadata-based > none
                        let deepLink = n.link;
                        if (!deepLink && n.metadata) {
                          try {
                            const meta = JSON.parse(n.metadata);
                            if ((n.category === 'COMMENT' || n.category === 'REPLY') && meta.courseId) {
                              deepLink = `/teacher/classrooms/${meta.courseId}?tab=stream&postId=${meta.postId || ''}`;
                            } else if (n.category === 'SUBMISSION' && meta.courseId) {
                              deepLink = `/teacher/classrooms/${meta.courseId}?tab=classwork`;
                            }
                          } catch { /* ignore parse errors */ }
                        }
                        return deepLink ? (
                          <Link
                            href={deepLink}
                            className="text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center space-x-1"
                          >
                            <span>View in Classroom</span>
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
                          </Link>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleMarkAsRead(n.id, n.isRead)}
                    title={n.isRead ? 'Mark as unread' : 'Mark as read'}
                    className={`p-2 rounded-xl text-xs transition-colors ${
                      n.isRead
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        : 'text-teal-400 hover:bg-teal-500/10'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </button>

                  <button
                    onClick={() => handleDeleteNotification(n.id)}
                    title="Delete notification"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
