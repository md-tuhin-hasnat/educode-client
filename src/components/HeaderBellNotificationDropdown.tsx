'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faExclamationTriangle,
  faBug,
  faMicrochip,
  faInfoCircle,
  faCheckDouble,
  faExternalLinkAlt,
  faTimes,
  faComments,
  faReply,
  faTasks,
} from '@fortawesome/free-solid-svg-icons';

import { useAuthStore } from '@/store/useAuthStore';

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  category: string;
  metadata?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Parse the JSON metadata string from a notification into a typed object. */
function parseMetadata(raw?: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const HeaderBellNotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastAlert, setToastAlert] = useState<NotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuthStore();
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Pre-load notification sound once on mount
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification_alert.wav');
    audioRef.current.volume = 0.6;
  }, []);

  /** Play the notification alert sound (user-gesture gated browsers will silently fail). */
  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked by browser – ignored
      });
    }
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const userQuery = user?.id ? `&userId=${user.id}` : '';
      const res = await fetch(`${API_URL}/notifications?limit=8${userQuery}`);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadCount(json.meta?.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [API_URL, user?.id]);

  useEffect(() => {
    fetchNotifications();

    // Setup SSE Real-Time Stream
    const eventSource = new EventSource(`${API_URL}/notifications/stream`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'NOTIFICATION' && parsed.payload) {
          const newNotif: NotificationItem = parsed.payload;

          setNotifications((prev) => [newNotif, ...prev.slice(0, 15)]);
          setUnreadCount((prev) => prev + 1);

          // 🔔 Play notification sound
          playNotificationSound();

          // Show Toast Popup
          setToastAlert(newNotif);
          setTimeout(() => setToastAlert(null), 5000);
        }
      } catch {
        // Heartbeat or format error
      }
    };

    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };

    return () => {
      eventSource.close();
    };
  }, [API_URL, fetchNotifications, playNotificationSound]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  /**
   * Deep-link navigation: resolve a notification to its target page.
   * For COMMENT / REPLY categories the metadata contains courseId + postId;
   * we navigate to the classroom page with query params so the stream tab
   * opens and scrolls to the relevant post.
   */
  const navigateToNotification = (n: NotificationItem) => {
    // Mark read first
    if (!n.isRead) handleMarkAsRead(n.id);
    setIsOpen(false);

    // If the notification already carries an explicit link, use that
    if (n.link) {
      router.push(n.link);
      return;
    }

    // Derive a deep-link from metadata
    const meta = parseMetadata(n.metadata);
    if (!meta) {
      // Fallback: open the full notification center
      router.push(user?.role === 'TEACHER' ? '/teacher/notifications' : '/admin/notifications');
      return;
    }

    const rolePrefix = user?.role === 'STUDENT' ? '/student' : '/teacher';

    if (
      (n.category === 'COMMENT' || n.category === 'REPLY') &&
      meta.courseId
    ) {
      // Navigate to the classroom hub with the stream tab active and highlight the post
      router.push(
        `${rolePrefix}/classrooms/${meta.courseId}?tab=stream&postId=${meta.postId || ''}`,
      );
      return;
    }

    if (n.category === 'SUBMISSION' && meta.courseId) {
      router.push(`${rolePrefix}/classrooms/${meta.courseId}?tab=classwork`);
      return;
    }

    // Default fallback
    router.push(user?.role === 'TEACHER' ? '/teacher/notifications' : '/admin/notifications');
  };

  /** Return an icon appropriate for the notification category. */
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'COMMENT':
        return faComments;
      case 'REPLY':
        return faReply;
      case 'SUBMISSION':
        return faTasks;
      default:
        return null;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badgeBg: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
          border: 'border-rose-500/40 hover:border-rose-500/80',
          icon: faBug,
          color: 'text-rose-400',
        };
      case 'WARNING':
        return {
          badgeBg: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
          border: 'border-amber-500/40 hover:border-amber-500/80',
          icon: faExclamationTriangle,
          color: 'text-amber-400',
        };
      case 'HARDWARE':
        return {
          badgeBg: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
          border: 'border-purple-500/40 hover:border-purple-500/80',
          icon: faMicrochip,
          color: 'text-purple-400',
        };
      default:
        return {
          badgeBg: 'bg-teal-500/20 border-teal-500/30 text-teal-400',
          border: 'border-teal-500/40 hover:border-teal-500/80',
          icon: faInfoCircle,
          color: 'text-teal-400',
        };
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Header Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications & Error Feed"
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors flex items-center justify-center"
      >
        <FontAwesomeIcon icon={faBell} className="text-sm" />

        {/* Live Pulsing Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 text-[9px] font-bold text-white items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Floating Real-Time Toast Alert (Top-Right Popup) */}
      {toastAlert && (
        <div
          onClick={() => {
            navigateToNotification(toastAlert);
            setToastAlert(null);
          }}
          className="fixed top-12 right-4 z-50 max-w-sm w-full bg-slate-900/95 border border-rose-500/50 rounded-xl p-3.5 shadow-2xl shadow-rose-950/50 backdrop-blur-md animate-bounce cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Live Alert: {toastAlert.severity}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToastAlert(null);
              }}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <p className="text-xs font-semibold text-white mt-1">{toastAlert.title}</p>
          {toastAlert.body && (
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{toastAlert.body}</p>
          )}
          <p className="text-[10px] text-teal-400 mt-1.5 font-medium">Click to open →</p>
        </div>
      )}

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faBell} className="text-xs text-brand-400" />
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                System Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
                className="text-[11px] text-slate-400 hover:text-brand-400 font-medium transition-colors flex items-center space-x-1"
              >
                <FontAwesomeIcon icon={faCheckDouble} />
                <span>Read all</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No notifications logged yet.
              </div>
            ) : (
              notifications.map((n) => {
                const style = getSeverityStyle(n.severity);
                const catIcon = getCategoryIcon(n.category);
                return (
                  <div
                    key={n.id}
                    onClick={() => navigateToNotification(n)}
                    className={`p-3 transition-colors cursor-pointer ${
                      n.isRead ? 'bg-slate-900/40 opacity-75' : 'bg-slate-800/40 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={style.icon} className={`text-xs ${style.color}`} />
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${style.badgeBg}`}
                        >
                          {n.severity}
                        </span>
                        {catIcon && (
                          <span className="text-[9px] text-slate-400 flex items-center space-x-1">
                            <FontAwesomeIcon icon={catIcon} className="text-[9px]" />
                            <span className="capitalize">{n.category.toLowerCase()}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200 mt-1 line-clamp-1">
                      {n.title}
                    </p>

                    {n.body && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                        {n.body}
                      </p>
                    )}

                    {/* Deep-link hint */}
                    {(n.category === 'COMMENT' || n.category === 'REPLY' || n.category === 'SUBMISSION') && (
                      <p className="text-[10px] text-teal-400/70 mt-1 font-medium">
                        Click to view in classroom →
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation Link */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 text-center">
            <Link
              href={user?.role === 'TEACHER' ? '/teacher/notifications' : '/admin/notifications'}
              onClick={() => setIsOpen(false)}
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold inline-flex items-center space-x-1.5 transition-colors"
            >
              <span>View Dedicated Notification Center</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
