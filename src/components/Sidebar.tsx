'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faChartPie,
  faUsers,
  faChalkboardTeacher,
  faTasks,
  faPlusCircle,
  faGraduationCap,
  faShieldAlt,
  faCode,
  faSliders,
  faBell,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

interface NavItem {
  label: string;
  href: string;
  icon: IconDefinition;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user) return null;

  let navItems: NavItem[] = [];
  const userRole = (user.role || '').toUpperCase();

  if (userRole === 'ADMIN') {
    navItems = [
      { label: 'Overview', href: '/admin/dashboard', icon: faChartPie },
      { label: 'Notifications', href: '/admin/notifications', icon: faBell },
      { label: 'Classrooms', href: '/admin/classrooms', icon: faChalkboardTeacher },
      { label: 'User Directory', href: '/admin/users', icon: faUsers },
      { label: 'Settings', href: '/admin/settings', icon: faSliders },
    ];
  } else if (userRole === 'TEACHER') {
    navItems = [
      { label: 'My Classrooms', href: '/teacher/dashboard', icon: faChalkboardTeacher },
      { label: 'Notifications', href: '/teacher/notifications', icon: faBell },
      { label: 'Tasks', href: '/teacher/tasks', icon: faClipboardList },
      { label: 'Submissions', href: '/teacher/submissions', icon: faTasks },
      { label: 'Plagiarism Detector', href: '/teacher/plagiarism', icon: faShieldAlt },
      { label: 'Settings', href: '/teacher/settings', icon: faSliders },
    ];
  } else {
    // STUDENT
    navItems = [
      { label: 'Overview', href: '/student/dashboard', icon: faChartPie },
      { label: 'My Classrooms', href: '/student/classrooms', icon: faGraduationCap },
      { label: 'Notifications', href: '/student/notifications', icon: faBell },
      { label: 'Active Tasks & Exams', href: '/student/dashboard#tasks', icon: faCode },
      { label: 'Settings', href: '/student/settings', icon: faSliders },
    ];
  }

  return (
    <aside className="w-56 h-[calc(100vh-2.5rem)] bg-slate-900/60 border-r border-slate-800 backdrop-blur-md flex flex-col justify-between py-4 px-3 select-none">
      <div className="space-y-6">
        {/* Role Portal Header */}
        <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Portal Context</p>
          <p className="text-sm font-semibold text-brand-500 capitalize">{user.role.toLowerCase()} workspace</p>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Connection Status */}
      <div className="p-3 rounded-xl glass-panel border border-slate-800 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">System Status</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        </div>
        <p className="text-slate-200 font-medium text-[11px] mt-1">Live Backend Connected</p>
      </div>
    </aside>
  );
};
