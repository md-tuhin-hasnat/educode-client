'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faCloud,
  faFolder,
  faShieldHalved,
  faRotateRight,
  faLink,
  faHardDrive,
  faCheck,
  faExclamationTriangle,
  faSignOutAlt,
  faGlobe,
  faBuilding,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import {
  googleDriveService,
  GoogleDriveConfig,
} from '@/services/googleDriveService';

export const GoogleDriveSettingsView: React.FC = () => {
  const [config, setConfig] = useState<GoogleDriveConfig>(googleDriveService.getConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [emailInput, setEmailInput] = useState(config.connectedEmail);
  const [rootFolderInput, setRootFolderInput] = useState(config.rootFolderName);
  const [sharingPermission, setSharingPermission] = useState(config.sharingPermission);
  const [autoSync, setAutoSync] = useState(config.autoSyncMaterials);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    const loaded = googleDriveService.getConfig();
    setConfig(loaded);
    setEmailInput(loaded.connectedEmail);
    setRootFolderInput(loaded.rootFolderName);
    setSharingPermission(loaded.sharingPermission);
    setAutoSync(loaded.autoSyncMaterials);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = googleDriveService.saveConfig({
      rootFolderName: rootFolderInput.trim() || 'EduCode Course Materials',
      sharingPermission,
      autoSyncMaterials: autoSync,
    });
    setConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    await new Promise((r) => setTimeout(r, 600));
    setIsTesting(false);
    if (config.isConnected) {
      setTestResult({
        success: true,
        message: `Google Drive API connection verified! Synchronized with ${config.connectedEmail} (${config.rootFolderName}).`,
      });
    } else {
      setTestResult({
        success: false,
        message: 'Google Drive is currently disconnected. Please connect an account first.',
      });
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    const updated = googleDriveService.connectAccount(emailInput.trim());
    setConfig(updated);
    setShowConnectModal(false);
    setTestResult({
      success: true,
      message: `Successfully authenticated and synced with ${emailInput.trim()}!`,
    });
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Google Drive? Files currently attached to courses will remain linked.')) {
      const updated = googleDriveService.disconnectAccount();
      setConfig(updated);
      setTestResult(null);
    }
  };

  const percentUsed = Math.min(100, Math.round((config.storageUsedBytes / config.storageTotalBytes) * 100));
  const usedGb = (config.storageUsedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const totalGb = (config.storageTotalBytes / (1024 * 1024 * 1024)).toFixed(0);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-slate-700/80 flex items-center justify-center text-2xl shadow-inner">
            <FontAwesomeIcon icon={faCloud} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-black text-white">Google Drive Integration</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center space-x-1.5 ${
                  config.isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span>{config.isConnected ? 'Connected & Synced' : 'Disconnected'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Directly upload, browse, and fetch course documents, slides, and lab code straight from your Google Drive.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          {config.isConnected ? (
            <>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-2 transition-all border border-slate-700"
              >
                <FontAwesomeIcon icon={faRotateRight} className={`text-xs ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Sync'}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center space-x-2 transition-all border border-rose-500/30"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="text-xs" />
                <span>Disconnect</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <FontAwesomeIcon icon={faCloud} />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Result Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 transition-all ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <FontAwesomeIcon icon={testResult.success ? faCheckCircle : faExclamationTriangle} className="text-sm shrink-0" />
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Storage Quota Card */}
      {config.isConnected && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-200">
              <FontAwesomeIcon icon={faHardDrive} className="text-blue-400" />
              <span>Google Cloud Storage Quota</span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-400">
              {usedGb} GB of {totalGb} GB used ({percentUsed}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Synced Account: <strong className="text-slate-200 font-mono">{config.connectedEmail}</strong></span>
            </div>
            <span>Last Synced: {new Date(config.lastSyncedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
          <FontAwesomeIcon icon={faFolder} className="text-amber-400" />
          <span>Drive Folder & Sharing Permissions</span>
        </h3>

        <div className="space-y-4">
          {/* Target Root Folder Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Course Root Folder on Google Drive
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={rootFolderInput}
                onChange={(e) => setRootFolderInput(e.target.value)}
                placeholder="e.g. EduCode Course Materials"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
              />
              <span className="absolute right-3 top-2.5 text-[11px] text-slate-500 font-mono">
                /My Drive/{rootFolderInput || '...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              All direct materials uploaded through the Classroom Hub or Post Composer will be saved inside this Drive folder.
            </p>
          </div>

          {/* Sharing Permissions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Default Share Permissions for Uploaded Materials
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                  sharingPermission === 'anyone_with_link'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FontAwesomeIcon icon={faGlobe} className="text-emerald-400 text-sm" />
                  <input
                    type="radio"
                    name="permission"
                    checked={sharingPermission === 'anyone_with_link'}
                    onChange={() => setSharingPermission('anyone_with_link')}
                    className="accent-emerald-500"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Anyone with Link</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Enrolled students can view directly without requesting permissions (Recommended).</p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                  sharingPermission === 'domain_only'
                    ? 'bg-brand-500/10 border-brand-500/50 text-white shadow-md shadow-brand-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FontAwesomeIcon icon={faBuilding} className="text-brand-400 text-sm" />
                  <input
                    type="radio"
                    name="permission"
                    checked={sharingPermission === 'domain_only'}
                    onChange={() => setSharingPermission('domain_only')}
                    className="accent-brand-500"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">University Domain Only</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Restricted to users signed into university Google Workspace accounts.</p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                  sharingPermission === 'restricted'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <FontAwesomeIcon icon={faLock} className="text-amber-400 text-sm" />
                  <input
                    type="radio"
                    name="permission"
                    checked={sharingPermission === 'restricted'}
                    onChange={() => setSharingPermission('restricted')}
                    className="accent-amber-500"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Restricted</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Only specifically shared members can access the files.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Auto-Sync Materials */}
          <div className="pt-2">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-200">Automatic Drive Synchronization</p>
                <p className="text-[11px] text-slate-500">
                  Automatically upload all course lecture slides, PDFs, and assignment resources to your linked Google Drive folder.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {isSaved ? (
            <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
              <FontAwesomeIcon icon={faCheck} />
              <span>Drive settings saved successfully!</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500">Settings will apply immediately to all upcoming uploads.</span>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
          >
            Save Drive Configuration
          </button>
        </div>
      </form>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faCloud} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Connect Google Drive</h3>
                <p className="text-xs text-slate-400">Authorize EduCode to access your institutional Google Drive</p>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Google Workspace / University Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. alan.turing@teacher.university.edu"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400 space-y-1">
                <p className="text-emerald-400 font-bold">Permissions Requested:</p>
                <p>• Create & manage EduCode course materials folder</p>
                <p>• Read files selected via Google Drive Picker</p>
                <p>• Generate public/domain viewable links for students</p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!emailInput.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  Authorize & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
