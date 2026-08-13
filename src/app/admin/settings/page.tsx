'use client';

// Institutional Provisioning Settings Page
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSliders,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faUserCog,
  faCheckCircle,
  faSave,
  faUndo,
  faAt,
  faIdCard,
  faFont,
  faKeyboard,
  faKey,
  faEye,
  faEyeSlash,
  faWandMagicSparkles,
  faCopy,
  faGlobe,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons';
import {
  getProvisioningSettings,
  saveProvisioningSettings,
  DEFAULT_PROVISIONING_SETTINGS,
  UserProvisioningSettings,
  RoleProvisioningConfig,
  generateUsernameFromName,
  generateUsernameFromId,
} from '@/utils/userAutoFillSettings';

type RoleKey = keyof UserProvisioningSettings;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<UserProvisioningSettings>(DEFAULT_PROVISIONING_SETTINGS);
  const [activeTab, setActiveTab] = useState<'all' | RoleKey>('all');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<RoleKey, boolean>>({
    student: false,
    teacher: false,
    ta: false,
    admin: false,
  });

  useEffect(() => {
    setSettings(getProvisioningSettings());
  }, []);

  const handleRoleConfigChange = <K extends keyof RoleProvisioningConfig>(
    role: RoleKey,
    field: K,
    value: RoleProvisioningConfig[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [field]: value,
      },
    }));
  };

  const togglePasswordVisibility = (role: RoleKey) => {
    setShowPasswords((prev) => ({
      ...prev,
      [role]: !prev[role],
    }));
  };

  const generateRandomPassword = (role: RoleKey) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const prefix = role.charAt(0).toUpperCase() + role.slice(1);
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newPass = `${prefix}-${randomPart}!2026`;
    handleRoleConfigChange(role, 'defaultPassword', newPass);
  };

  const handleSave = () => {
    saveProvisioningSettings(settings);
    setSavedNotice('Institutional provisioning settings saved successfully!');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleReset = () => {
    setSettings(DEFAULT_PROVISIONING_SETTINGS);
    saveProvisioningSettings(DEFAULT_PROVISIONING_SETTINGS);
    setSavedNotice('Reset all role configurations to institutional default templates.');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const copyConfigSummary = () => {
    const summary = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(summary);
    setSavedNotice('Provisioning policy JSON copied to clipboard!');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const rolesMeta: Array<{
    key: RoleKey;
    title: string;
    description: string;
    icon: typeof faUserGraduate;
    badgeColor: string;
    accentBorder: string;
    sampleName: string;
    sampleId: string;
    suggestedDomains: string[];
  }> = [
    {
      key: 'student',
      title: 'Student Provisioning',
      description: 'Configure auto-creation rules, domains, and default credentials for enrolled students.',
      icon: faUserGraduate,
      badgeColor: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
      accentBorder: 'hover:border-teal-500/40',
      sampleName: 'Alex Johnson',
      sampleId: '2026-04821',
      suggestedDomains: ['student.university.edu', 'students.edu', 'cs.university.edu'],
    },
    {
      key: 'teacher',
      title: 'Faculty & Teacher Provisioning',
      description: 'Configure auto-fill strategy, email domain, and credentials for lead instructors.',
      icon: faChalkboardTeacher,
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      accentBorder: 'hover:border-purple-500/40',
      sampleName: 'Dr. Sarah Connor',
      sampleId: 'EMP-9021',
      suggestedDomains: ['teacher.university.edu', 'faculty.university.edu', 'university.edu'],
    },
    {
      key: 'ta',
      title: 'Teaching Assistant (TA)',
      description: 'Set default auto-fill behaviors and password parameters for TAs and lab tutors.',
      icon: faUserCog,
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      accentBorder: 'hover:border-amber-500/40',
      sampleName: 'Marcus Vance',
      sampleId: 'TA-2026-12',
      suggestedDomains: ['ta.university.edu', 'grad.university.edu', 'university.edu'],
    },
    {
      key: 'admin',
      title: 'System Administrator',
      description: 'Define identity parameters and elevated account security rules for administrators.',
      icon: faUserShield,
      badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      accentBorder: 'hover:border-rose-500/40',
      sampleName: 'Admin Desk',
      sampleId: 'ADM-001',
      suggestedDomains: ['admin.university.edu', 'sys.university.edu', 'university.edu'],
    },
  ];

  const visibleRoles = activeTab === 'all' ? rolesMeta : rolesMeta.filter((r) => r.key === activeTab);

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2 text-xs font-semibold text-brand-400">
            <FontAwesomeIcon icon={faSliders} />
            <span>Institutional Governance Control Hub</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Provisioning & Security Settings</h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Configure per-role email domains, auto-fill username prefix generation rules, initial default passwords,
            and password update enforcement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            onClick={copyConfigSummary}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center space-x-1.5"
            title="Copy JSON policy"
          >
            <FontAwesomeIcon icon={faCopy} className="text-slate-400" />
            <span>Copy Policy</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center space-x-1.5"
          >
            <FontAwesomeIcon icon={faUndo} />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 flex items-center space-x-2 transition-all"
          >
            <FontAwesomeIcon icon={faSave} />
            <span>Save All Configurations</span>
          </button>
        </div>
      </div>

      {/* Notice Toast */}
      {savedNotice && (
        <div className="p-3.5 bg-teal-500/10 border border-teal-500/30 text-teal-300 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-teal-400 text-sm" />
            <span className="font-medium">{savedNotice}</span>
          </div>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 gap-2 overflow-x-auto">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
              activeTab === 'all'
                ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            <span>All Roles ({rolesMeta.length})</span>
          </button>

          {rolesMeta.map((role) => (
            <button
              key={role.key}
              onClick={() => setActiveTab(role.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all ${
                activeTab === role.key
                  ? 'bg-brand-500/20 border border-brand-500/50 text-brand-300'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FontAwesomeIcon icon={role.icon} />
              <span>{role.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-500 hidden md:block">
          Click any role tab for focused configuration
        </div>
      </div>

      {/* Role Settings Cards Grid */}
      <div className={`grid grid-cols-1 ${activeTab === 'all' ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {visibleRoles.map((roleItem) => {
          const config = settings[roleItem.key];
          const isShowPass = showPasswords[roleItem.key];

          // Compute dynamic preview username
          let previewUsername = '';
          if (config.autoFillSource === 'name') {
            previewUsername = generateUsernameFromName(roleItem.sampleName);
          } else if (config.autoFillSource === 'id') {
            previewUsername = generateUsernameFromId(roleItem.sampleId);
          } else {
            previewUsername = 'custom.prefix';
          }
          const fullPreviewEmail = `${previewUsername || 'username'}@${config.emailDomain || 'university.edu'}`;

          return (
            <div
              key={roleItem.key}
              className={`glass-panel p-6 rounded-2xl border border-slate-800 space-y-6 transition-all ${roleItem.accentBorder}`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-2xl border ${roleItem.badgeColor}`}>
                    <FontAwesomeIcon icon={roleItem.icon} className="text-lg" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {roleItem.title}
                    </h2>
                    <p className="text-xs text-slate-400">{roleItem.description}</p>
                  </div>
                </div>
              </div>

              {/* Form Controls Section */}
              <div className="space-y-4 pt-2">
                {/* 1. Email Domain Suffix */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faAt} className="text-brand-400" />
                      Institutional Email Domain Suffix
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">e.g. student.university.edu</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">@</span>
                    <input
                      type="text"
                      value={config.emailDomain}
                      onChange={(e) => handleRoleConfigChange(roleItem.key, 'emailDomain', e.target.value.toLowerCase().trim())}
                      placeholder="university.edu"
                      className="w-full pl-7 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono"
                    />
                  </div>
                  {/* Domain Chip Suggestions */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500">Presets:</span>
                    {roleItem.suggestedDomains.map((dom) => (
                      <button
                        key={dom}
                        type="button"
                        onClick={() => handleRoleConfigChange(roleItem.key, 'emailDomain', dom)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-all ${
                          config.emailDomain === dom
                            ? 'bg-brand-500/20 border-brand-500/60 text-brand-300'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        @{dom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Auto-fill Username Strategy */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Email Prefix Auto-fill Strategy</span>
                    <span className="text-[10px] text-slate-400 font-normal">Source for initial @prefix</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleConfigChange(roleItem.key, 'autoFillSource', 'id')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all border ${
                        config.autoFillSource === 'id'
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faIdCard} className="text-sm" />
                      <span>From ID</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleConfigChange(roleItem.key, 'autoFillSource', 'name')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all border ${
                        config.autoFillSource === 'name'
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faFont} className="text-sm" />
                      <span>From Name</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleConfigChange(roleItem.key, 'autoFillSource', 'manual')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all border ${
                        config.autoFillSource === 'manual'
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                      <span>Manual</span>
                    </button>
                  </div>
                </div>

                {/* 3. Default Password & Security Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faKey} className="text-amber-400" />
                        Default Initial Password
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={isShowPass ? 'text' : 'password'}
                        value={config.defaultPassword}
                        onChange={(e) => handleRoleConfigChange(roleItem.key, 'defaultPassword', e.target.value)}
                        className="w-full pl-3 pr-16 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(roleItem.key)}
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                          title={isShowPass ? 'Hide Password' : 'Show Password'}
                        >
                          <FontAwesomeIcon icon={isShowPass ? faEyeSlash : faEye} className="text-xs" />
                        </button>
                        <button
                          type="button"
                          onClick={() => generateRandomPassword(roleItem.key)}
                          className="p-1 text-brand-400 hover:text-brand-300 transition-colors"
                          title="Generate Random Password"
                        >
                          <FontAwesomeIcon icon={faWandMagicSparkles} className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faIdCard} className="text-indigo-400" />
                        ID Prefix Pattern
                      </span>
                    </label>
                    <input
                      type="text"
                      value={config.idPrefixPattern}
                      onChange={(e) => handleRoleConfigChange(roleItem.key, 'idPrefixPattern', e.target.value)}
                      placeholder="e.g. STU-2026-"
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* 4. Password Reset Policy Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={config.requirePasswordReset}
                      onChange={(e) => handleRoleConfigChange(roleItem.key, 'requirePasswordReset', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-brand-500 focus:ring-brand-500/20 bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                      Require mandatory password change upon first user sign-in
                    </span>
                  </label>
                </div>
              </div>

              {/* Live Provisioning Simulator Preview Box */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faGlobe} className="text-brand-400" />
                    Live Provisioning Simulation
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                    Active Rule: {config.autoFillSource.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sample Profile</span>
                    <span className="text-slate-300 font-medium">{roleItem.sampleName}</span>
                    <span className="text-slate-500 text-[11px] block font-mono">ID: {roleItem.sampleId}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Generated Institutional Email</span>
                    <span className="text-teal-300 font-mono font-medium truncate block" title={fullPreviewEmail}>
                      {fullPreviewEmail}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Default Initial Credential</span>
                    <span className="text-slate-300 font-mono">
                      {isShowPass ? config.defaultPassword : '••••••••••••'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Security Requirement</span>
                    <span className="text-slate-300 font-medium">
                      {config.requirePasswordReset ? (
                        <span className="text-amber-400">Must reset on login</span>
                      ) : (
                        <span className="text-slate-400">Standard password</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
