'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faVolumeMute,
  faVolumeUp,
  faComment,
  faAt,
  faNewspaper,
  faUsersSlash,
  faSearch,
  faPlus,
  faTrash,
  faSpinner,
  faCog,
  faSave,
  faUser,
  faUserCircle,
  faCheckCircle,
  faExclamationCircle,
  faCode,
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { apiClient } from '@/config/api';
import { IdeSettingsView } from './IdeSettingsView';

type Topic = 'general' | 'mutes' | 'ide';

interface GlobalSettings {
  muteSound: boolean;
  mutePost: boolean;
  muteComment: boolean;
  muteMention: boolean;
}

interface MutedUser {
  mutedUserId: string;
  mutedUser: {
    id: string;
    fullName: string;
    email: string;
  };
  mutePost: boolean;
  muteComment: boolean;
  muteMention: boolean;
}

interface SearchUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export const NotificationSettingsView: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTopic, setActiveTopic] = useState<Topic>('general');
  const [loading, setLoading] = useState(true);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    muteSound: false,
    mutePost: false,
    muteComment: false,
    muteMention: false,
  });
  
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserToMute, setSelectedUserToMute] = useState<SearchUser | null>(null);
  
  // Mute specific settings for modal
  const [newMutePost, setNewMutePost] = useState(true);
  const [newMuteComment, setNewMuteComment] = useState(true);
  const [newMuteMention, setNewMuteMention] = useState(true);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchSettingsData = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const [settingsRes, mutesRes] = await Promise.all([
        apiClient.get('/notifications/settings').catch(() => null),
        apiClient.get('/notifications/settings/mutes').catch(() => null)
      ]);

      if (settingsRes?.data) {
        setGlobalSettings({
          muteSound: settingsRes.data.data?.muteSound || false,
          mutePost: settingsRes.data.data?.mutePost || false,
          muteComment: settingsRes.data.data?.muteComment || false,
          muteMention: settingsRes.data.data?.muteMention || false,
        });
      }

      if (mutesRes?.data) {
        setMutedUsers(mutesRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const handleGlobalSettingChange = (field: keyof GlobalSettings, value: boolean) => {
    setGlobalSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveGlobalSettings = async () => {
    if (!user?.token) return;
    setSaveStatus('saving');
    try {
      await apiClient.patch('/notifications/settings', globalSettings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving global settings', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Search logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get(`/users/search/basic?q=${encodeURIComponent(searchQuery)}`);
        const json = res.data;
        setSearchResults(Array.isArray(json) ? json : (json.data || []));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, API_URL, user?.token]);

  const handleAddMute = async () => {
    if (!user?.token || !selectedUserToMute) return;
    try {
      await apiClient.post(`/notifications/settings/mutes/${selectedUserToMute.id}`, {
        mutePost: newMutePost,
        muteComment: newMuteComment,
        muteMention: newMuteMention
      });
      
      // Refresh mutes
      const mutesRes = await apiClient.get('/notifications/settings/mutes').catch(() => null);
      if (mutesRes?.data) {
        setMutedUsers(mutesRes.data.data || []);
      }
      setSelectedUserToMute(null);
      setSearchQuery('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnmute = async (mutedUserId: string) => {
    if (!user?.token) return;
    try {
      await apiClient.delete(`/notifications/settings/mutes/${mutedUserId}`);
      setMutedUsers(prev => prev.filter(m => m.mutedUserId !== mutedUserId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <FontAwesomeIcon icon={faSpinner} className="text-3xl text-brand-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col md:flex-row glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-slate-900/80 border-r border-slate-800 flex flex-col p-4 shrink-0 overflow-y-auto">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 px-2">Settings</h2>
        
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTopic('general')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTopic === 'general'
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faBell} className={`text-sm ${activeTopic === 'general' ? 'text-brand-400' : 'text-slate-500'}`} />
            <span>Global Notifications</span>
          </button>
          
          <button
            onClick={() => setActiveTopic('mutes')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTopic === 'mutes'
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faUsersSlash} className={`text-sm ${activeTopic === 'mutes' ? 'text-brand-400' : 'text-slate-500'}`} />
            <span>Muted Users</span>
          </button>

          <button
            onClick={() => setActiveTopic('ide')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTopic === 'ide'
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faCode} className={`text-sm ${activeTopic === 'ide' ? 'text-brand-400' : 'text-slate-500'}`} />
            <span>IDE Settings</span>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-slate-900/40 p-6 md:p-8 overflow-y-auto relative">
        {activeTopic === 'ide' ? (
          <IdeSettingsView />
        ) : (
          <div className="max-w-3xl space-y-8">
            
            {/* Header */}
          <div className="border-b border-slate-800/80 pb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {activeTopic === 'general' ? 'Global Notifications' : 'Muted Users'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {activeTopic === 'general' 
                  ? 'Manage your overall notification preferences.'
                  : 'Manage specific users you wish to ignore notifications from.'}
              </p>
            </div>
            
            {activeTopic === 'general' && (
              <button
                onClick={saveGlobalSettings}
                disabled={saveStatus === 'saving'}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {saveStatus === 'saving' ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : saveStatus === 'saved' ? (
                  <FontAwesomeIcon icon={faCheckCircle} />
                ) : (
                  <FontAwesomeIcon icon={faSave} />
                )}
                <span>{saveStatus === 'saved' ? 'Saved' : 'Save Changes'}</span>
              </button>
            )}
          </div>

          {/* Error Notice */}
          {saveStatus === 'error' && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center space-x-3">
              <FontAwesomeIcon icon={faExclamationCircle} />
              <span>Failed to save settings. Please try again.</span>
            </div>
          )}

          {activeTopic === 'general' && (
            <div className="space-y-6">
              
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 transition-colors hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <FontAwesomeIcon icon={globalSettings.muteSound ? faVolumeMute : faVolumeUp} className="text-brand-400 w-5" />
                      Notification Sounds
                    </h3>
                    <p className="text-xs text-slate-400">Play an alert sound when a new notification is received.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={!globalSettings.muteSound} 
                      onChange={(e) => handleGlobalSettingChange('muteSound', !e.target.checked)} 
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                  </label>
                </div>
              </div>

              <h2 className="text-sm font-semibold text-slate-300 pt-4 px-1 uppercase tracking-wider">Avoid Categories</h2>
              <p className="text-xs text-slate-500 px-1 mb-4">Toggle to mute entirely. Muted notifications will not be recorded in your history.</p>

              <div className="space-y-3">
                {[
                  { id: 'mutePost', label: 'Posts & Announcements', desc: 'Alerts when a new stream post is created.', icon: faNewspaper },
                  { id: 'muteComment', label: 'Comments & Replies', desc: 'Alerts for comments on posts you follow.', icon: faComment },
                  { id: 'muteMention', label: 'Mentions (@)', desc: 'Alerts when someone mentions you directly.', icon: faAt },
                ].map(item => (
                  <div key={item.id} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 border border-slate-700/50 mt-0.5">
                        <FontAwesomeIcon icon={item.icon} className="text-sm" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-white font-semibold text-sm">{item.label}</h3>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={globalSettings[item.id as keyof GlobalSettings] as boolean} 
                        onChange={(e) => handleGlobalSettingChange(item.id as keyof GlobalSettings, e.target.checked)} 
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>
                ))}
              </div>

            </div>
          )}

          {activeTopic === 'mutes' && (
            <div className="space-y-8">
              
              {/* Add New Mute Panel */}
              <div className="bg-slate-900/60 p-6 rounded-3xl border border-brand-500/30 relative">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full"></div>
                </div>
                <h3 className="text-white font-bold mb-4 relative z-10 flex items-center gap-2">
                  <FontAwesomeIcon icon={faPlus} className="text-brand-400" />
                  Mute a New User
                </h3>
                
                <div className="space-y-4 relative z-10">
                  <div className="relative w-full">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-3 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search for a user by name or email..."
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        if (!e.target.value) setSelectedUserToMute(null);
                      }}
                      className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                    {isSearching && (
                      <FontAwesomeIcon icon={faSpinner} className="absolute right-4 top-3 animate-spin text-brand-500" />
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && !selectedUserToMute && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto absolute w-full z-20 shadow-xl shadow-black/50 mt-1">
                      {searchResults.map(sUser => (
                        <button
                          key={sUser.id}
                          onClick={() => {
                            setSelectedUserToMute(sUser);
                            setSearchResults([]);
                            setSearchQuery(sUser.fullName);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/80 transition-colors text-left border-b border-slate-800/50 last:border-0"
                        >
                          <div className="flex items-center space-x-3">
                            <FontAwesomeIcon icon={faUserCircle} className="text-slate-400 text-lg" />
                            <div>
                              <p className="text-white text-sm font-semibold">{sUser.fullName}</p>
                              <p className="text-slate-500 text-xs">{sUser.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-md">{sUser.role}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedUserToMute && (
                    <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-4 mt-4 animate-fadeIn">
                      <p className="text-xs font-semibold text-brand-300">Select what to ignore from {selectedUserToMute.fullName}:</p>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input type="checkbox" checked={newMutePost} onChange={e => setNewMutePost(e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-brand-500 focus:ring-brand-500/20 bg-slate-900 cursor-pointer" />
                          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Posts</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input type="checkbox" checked={newMuteComment} onChange={e => setNewMuteComment(e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-brand-500 focus:ring-brand-500/20 bg-slate-900 cursor-pointer" />
                          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Comments</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input type="checkbox" checked={newMuteMention} onChange={e => setNewMuteMention(e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-brand-500 focus:ring-brand-500/20 bg-slate-900 cursor-pointer" />
                          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Mentions</span>
                        </label>
                      </div>
                      
                      <div className="flex justify-end space-x-3 pt-2">
                        <button 
                          onClick={() => { setSelectedUserToMute(null); setSearchQuery(''); }}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleAddMute}
                          className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/30"
                        >
                          Confirm Mute
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* List of Muted Users */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
                  <span>Currently Muted Users</span>
                  <span className="bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full text-xs">{mutedUsers.length}</span>
                </h3>
                
                {mutedUsers.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl border-dashed">
                    <FontAwesomeIcon icon={faUsersSlash} className="text-3xl text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-400">No users muted</p>
                    <p className="text-xs text-slate-500 mt-1">You will receive all their notifications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mutedUsers.map(m => (
                      <div key={m.mutedUserId} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-slate-700 transition-all">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-lg">
                            <FontAwesomeIcon icon={faUser} />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-sm">{m.mutedUser.fullName}</h4>
                            <p className="text-xs text-slate-500">{m.mutedUser.email}</p>
                            
                            <div className="flex items-center space-x-2 mt-2">
                              {m.mutePost && <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">Posts</span>}
                              {m.muteComment && <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">Comments</span>}
                              {m.muteMention && <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">Mentions</span>}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleUnmute(m.mutedUserId)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 text-xs font-semibold transition-colors flex items-center justify-center space-x-2 border border-slate-700 hover:border-rose-500/30 w-full sm:w-auto"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          <span>Unmute</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          </div>
        )}
      </div>
    </div>
  );
};
