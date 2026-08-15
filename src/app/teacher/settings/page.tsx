'use client';

import React, { useState } from 'react';
import { NotificationSettingsView } from '@/components/NotificationSettingsView';
import { GoogleDriveSettingsView } from '@/components/GoogleDriveSettingsView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faBell, faGear } from '@fortawesome/free-solid-svg-icons';

export default function TeacherSettingsPage() {
  const [activeTab, setActiveTab] = useState<'drive' | 'notifications'>('drive');

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2.5">
            <FontAwesomeIcon icon={faGear} className="text-brand-400" />
            <span>Faculty Settings & Integrations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure cloud storage sync, classroom notifications, and system integrations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('drive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'drive'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={faCloud} className="text-xs" />
            <span>Google Drive Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={faBell} className="text-xs" />
            <span>Notifications</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'drive' && <GoogleDriveSettingsView />}
        {activeTab === 'notifications' && <NotificationSettingsView />}
      </div>
    </div>
  );
}
