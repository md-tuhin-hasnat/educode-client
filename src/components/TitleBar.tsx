'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HeaderBellNotificationDropdown } from './HeaderBellNotificationDropdown';
import {
  faCode,
  faMinus,
  faSquare,
  faTimes,
  faUserShield,
  faChalkboardTeacher,
  faUserGraduate,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';

export const TitleBar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleMinimize = () => {
    window.educode?.window?.minimize();
  };

  const handleMaximize = () => {
    window.educode?.window?.maximize();
  };

  const handleClose = () => {
    window.educode?.window?.close();
  };

  const getRoleIcon = () => {
    if (!user) return faUserGraduate;
    switch (user.role) {
      case 'ADMIN':
        return faUserShield;
      case 'TEACHER':
        return faChalkboardTeacher;
      default:
        return faUserGraduate;
    }
  };

  const getRoleBadgeColor = () => {
    if (!user) return 'bg-slate-700 text-slate-300';
    switch (user.role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'TEACHER':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    }
  };

  return (
    <div className="h-10 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-3 select-none app-drag-region z-50">
      {/* Brand Icon & Title */}
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 rounded bg-gradient-to-tr from-brand-600 to-tealAccent-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-brand-500/20">
          <FontAwesomeIcon icon={faCode} />
        </div>
        <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          EduCode
        </span>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700/50">
          Client v1.0
        </span>
      </div>

      {/* User Info & Controls */}
      <div className="flex items-center space-x-3 app-no-drag">
        {user && (
          <div className="flex items-center space-x-2 text-xs">
            <HeaderBellNotificationDropdown />
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRoleBadgeColor()} flex items-center space-x-1`}>
              <FontAwesomeIcon icon={getRoleIcon()} className="text-[10px] mr-1" />
              {user.role}
            </span>
            <span className="text-slate-300 font-medium max-w-[120px] truncate">{user.name}</span>
            <button
              onClick={logout}
              title="Logout"
              className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
          </div>
        )}

        {/* Window Controls */}
        <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
          <button
            onClick={handleMinimize}
            className="w-7 h-7 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center text-xs"
          >
            <FontAwesomeIcon icon={faMinus} />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center text-[10px]"
          >
            <FontAwesomeIcon icon={faSquare} />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded hover:bg-rose-600/80 text-slate-400 hover:text-white transition-colors flex items-center justify-center text-xs"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    </div>
  );
};
