'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSliders,
  faTerminal,
  faFont,
  faPalette,
  faCheck,
  faUpload,
  faUndo,
  faGlobe,
  faBriefcase,
  faBookOpen,
  faComments,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { PRESET_THEMES, parseVSCodeThemeJSON } from './themes';
import { useIdeStore, IdeContext, IdeSettings } from '@/store/useIdeStore';
import type { editor } from 'monaco-editor';

export function IdeSettingsView() {
  const [activeTab, setActiveTab] = useState<'compilers' | 'font' | 'theme'>('theme');
  const [activeContext, setActiveContext] = useState<IdeContext>('global');
  const [themeJsonInput, setThemeJsonInput] = useState<string>('');
  const [themeImportStatus, setThemeImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { 
    globalSettings, 
    overrides, 
    setGlobalSetting, 
    setOverrideSetting, 
    removeOverride 
  } = useIdeStore();

  const currentSettings = activeContext === 'global' 
    ? globalSettings 
    : { ...globalSettings, ...(overrides[activeContext] || {}) };

  const handleChange = <K extends keyof IdeSettings>(key: K, value: IdeSettings[K]) => {
    if (activeContext === 'global') {
      setGlobalSetting(key, value);
    } else {
      setOverrideSetting(activeContext, key, value);
    }
  };

  const handleResetContext = () => {
    if (activeContext !== 'global') {
      removeOverride(activeContext);
    }
  };

  const handleResetCompilers = () => {
    if (activeContext === 'global') {
      setGlobalSetting('gccPath', 'gcc');
      setGlobalSetting('gppPath', 'g++');
      setGlobalSetting('pythonPath', 'python3');
      setGlobalSetting('javacPath', 'javac');
      setGlobalSetting('javaPath', 'java');
    } else {
      setOverrideSetting(activeContext, 'gccPath', 'gcc');
      setOverrideSetting(activeContext, 'gppPath', 'g++');
      setOverrideSetting(activeContext, 'pythonPath', 'python3');
      setOverrideSetting(activeContext, 'javacPath', 'javac');
      setOverrideSetting(activeContext, 'javaPath', 'java');
    }
  };

  const handleImportVSCodeTheme = () => {
    setThemeImportStatus(null);
    if (!themeJsonInput.trim()) {
      setThemeImportStatus({ type: 'error', message: 'Please paste VS Code theme JSON or upload a file.' });
      return;
    }

    const parsed = parseVSCodeThemeJSON(themeJsonInput);
    if (!parsed) {
      setThemeImportStatus({ type: 'error', message: 'Invalid JSON format. Make sure it is a valid VS Code theme file.' });
      return;
    }

    // Save into customThemes
    const updatedCustom = {
      ...globalSettings.customThemes,
      [parsed.id]: { name: parsed.name, data: parsed.data },
    };

    setGlobalSetting('customThemes', updatedCustom);
    handleChange('theme', parsed.id);

    setThemeImportStatus({ type: 'success', message: `Theme "${parsed.name}" successfully imported and applied!` });
    setThemeJsonInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setThemeJsonInput(content);
      }
    };
    reader.readAsText(file);
  };

  const isOverrideActive = activeContext !== 'global' && !!overrides[activeContext];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden mt-6">
      {/* Header & Context Selector */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
            <FontAwesomeIcon icon={faSliders} className="text-sm" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Global IDE Settings</h2>
            <p className="text-[11px] text-slate-400">Configure environments across the platform</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400">Target Context:</span>
          <select 
            value={activeContext}
            onChange={(e) => setActiveContext(e.target.value as IdeContext)}
            className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none"
          >
            <option value="global">🌍 Global Defaults</option>
            <option value="exams">📝 Exams</option>
            <option value="assignments">💼 Assignments</option>
            <option value="posts">📰 Posts</option>
            <option value="comments">💬 Comments</option>
          </select>
          {isOverrideActive && (
             <button onClick={handleResetContext} className="ml-2 text-[10px] bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 px-2 py-1 rounded">Reset Override</button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('theme')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'theme'
              ? 'border-brand-500 text-white bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FontAwesomeIcon icon={faPalette} />
          <span>Themes & VS Code Importer</span>
        </button>

        <button
          onClick={() => setActiveTab('font')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'font'
              ? 'border-brand-500 text-white bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FontAwesomeIcon icon={faFont} />
          <span>Fonts & Editor</span>
        </button>

        <button
          onClick={() => setActiveTab('compilers')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'compilers'
              ? 'border-brand-500 text-white bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FontAwesomeIcon icon={faTerminal} />
          <span>Compiler Paths</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-6 flex-1 space-y-6 text-xs bg-slate-900/50">
        {activeTab === 'compilers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Custom Compiler & Runtime Executables</h3>
                <p className="text-[11px] text-slate-400">Specify absolute paths if tools are not registered on your system PATH.</p>
              </div>
              <button
                onClick={handleResetCompilers}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <FontAwesomeIcon icon={faUndo} className="text-[10px]" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">GCC C Compiler (`gcc`)</label>
                <input
                  type="text"
                  value={currentSettings.gccPath}
                  onChange={(e) => handleChange('gccPath', e.target.value)}
                  placeholder="e.g. /usr/bin/gcc or C:\\MinGW\\bin\\gcc.exe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">G++ C++ Compiler (`g++`)</label>
                <input
                  type="text"
                  value={currentSettings.gppPath}
                  onChange={(e) => handleChange('gppPath', e.target.value)}
                  placeholder="e.g. /usr/bin/g++ or C:\\MinGW\\bin\\g++.exe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Python 3 Interpreter (`python3`)</label>
                <input
                  type="text"
                  value={currentSettings.pythonPath}
                  onChange={(e) => handleChange('pythonPath', e.target.value)}
                  placeholder="e.g. /usr/bin/python3 or C:\\Python310\\python.exe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Java Compiler (`javac`)</label>
                <input
                  type="text"
                  value={currentSettings.javacPath}
                  onChange={(e) => handleChange('javacPath', e.target.value)}
                  placeholder="e.g. /usr/bin/javac or C:\\Program Files\\Java\\jdk-17\\bin\\javac.exe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Java Runtime (`java`)</label>
                <input
                  type="text"
                  value={currentSettings.javaPath}
                  onChange={(e) => handleChange('javaPath', e.target.value)}
                  placeholder="e.g. /usr/bin/java or C:\\Program Files\\Java\\jdk-17\\bin\\java.exe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'font' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Typography & Visual Editor Settings</h3>
              <p className="text-[11px] text-slate-400">Customize editor font families, line heights, and tab indentations.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Font Family</label>
                <select
                  value={currentSettings.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="'Fira Code', monospace">Fira Code (Ligatures)</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                  <option value="Consolas, monospace">Consolas</option>
                  <option value="'Source Code Pro', monospace">Source Code Pro</option>
                  <option value="'Cascadia Code', monospace">Cascadia Code</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Font Size: {currentSettings.fontSize}px</label>
                <input
                  type="range"
                  min={11}
                  max={24}
                  value={currentSettings.fontSize}
                  onChange={(e) => handleChange('fontSize', parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer mt-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Line Height: {currentSettings.lineHeight}px</label>
                <input
                  type="range"
                  min={16}
                  max={36}
                  value={currentSettings.lineHeight}
                  onChange={(e) => handleChange('lineHeight', parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer mt-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Tab Indent Size</label>
                <select
                  value={currentSettings.tabSize}
                  onChange={(e) => handleChange('tabSize', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value={2}>2 Spaces</option>
                  <option value={4}>4 Spaces</option>
                  <option value={8}>8 Spaces</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Word Wrap</label>
                <select
                  value={currentSettings.wordWrap}
                  onChange={(e) => handleChange('wordWrap', e.target.value as 'on' | 'off')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="off">Off (Horizontal Scroll)</option>
                  <option value="on">On (Wrap to Window)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Cursor Style</label>
                <select
                  value={currentSettings.cursorStyle}
                  onChange={(e) => handleChange('cursorStyle', e.target.value as 'line' | 'block' | 'underline')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-brand-500 font-semibold"
                >
                  <option value="line">Line (Default)</option>
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <p className="font-bold text-slate-200">Editor Minimap</p>
                <p className="text-[11px] text-slate-400">Display mini code preview on the right edge of editor.</p>
              </div>
              <button
                onClick={() => handleChange('minimap', !currentSettings.minimap)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  currentSettings.minimap ? 'bg-brand-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    currentSettings.minimap ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Editor Theme & Presets</h3>
              <p className="text-[11px] text-slate-400">Select built-in themes or install any VS Code theme JSON.</p>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Builtin Defaults */}
              <button
                onClick={() => handleChange('theme', 'vs-dark')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentSettings.theme === 'vs-dark'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>VS Dark</span>
                  {currentSettings.theme === 'vs-dark' && <FontAwesomeIcon icon={faCheck} className="text-brand-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Default dark theme</p>
              </button>

              <button
                onClick={() => handleChange('theme', 'vs-light')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentSettings.theme === 'vs-light'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>VS Light</span>
                  {currentSettings.theme === 'vs-light' && <FontAwesomeIcon icon={faCheck} className="text-brand-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Default light theme</p>
              </button>

              <button
                onClick={() => handleChange('theme', 'hc-black')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currentSettings.theme === 'hc-black'
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>High Contrast</span>
                  {currentSettings.theme === 'hc-black' && <FontAwesomeIcon icon={faCheck} className="text-brand-400" />}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">High contrast black</p>
              </button>

              {/* Popular Presets */}
              {PRESET_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleChange('theme', t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentSettings.theme === t.id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{t.name}</span>
                    {currentSettings.theme === t.id && <FontAwesomeIcon icon={faCheck} className="text-brand-400" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Preset VS Code theme</p>
                </button>
              ))}

              {/* Custom User Installed Themes */}
              {Object.entries(currentSettings.customThemes || {}).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => handleChange('theme', id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentSettings.theme === id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="truncate">{t.name}</span>
                    {currentSettings.theme === id && <FontAwesomeIcon icon={faCheck} className="text-brand-400" />}
                  </div>
                  <p className="text-[10px] text-emerald-400 mt-1 font-semibold">User Installed</p>
                </button>
              ))}
            </div>

            {/* Install Custom VS Code Theme Section */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faUpload} className="text-brand-400" />
                  <h4 className="font-bold text-white text-xs">Install Custom VS Code Theme</h4>
                </div>
                <label className="cursor-pointer px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded transition-colors flex items-center space-x-1">
                  <span>Upload JSON File</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                value={themeJsonInput}
                onChange={(e) => setThemeJsonInput(e.target.value)}
                placeholder="Paste VS Code theme JSON content here (e.g. from any VS Code .json theme extension)..."
                className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-tealAccent-300 placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none"
              />

              {themeImportStatus && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] font-semibold ${
                    themeImportStatus.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {themeImportStatus.message}
                </div>
              )}

              <button
                onClick={handleImportVSCodeTheme}
                className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-brand-600/30 transition-all"
              >
                Parse & Install VS Code Theme
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
