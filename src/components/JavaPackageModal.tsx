'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faTimes, faFileCode, faCheck } from '@fortawesome/free-solid-svg-icons';

interface JavaPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (pkgName: string, className: string, elementType: 'class' | 'interface' | 'enum', includeMain: boolean) => void;
}

export default function JavaPackageModal({ isOpen, onClose, onCreate }: JavaPackageModalProps) {
  const [packageName, setPackageName] = useState('com.educode.model');
  const [className, setClassName] = useState('MainClass');
  const [elementType, setElementType] = useState<'class' | 'interface' | 'enum'>('class');
  const [includeMain, setIncludeMain] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    onCreate(packageName.trim(), className.trim(), elementType, includeMain);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e2e] border border-gray-700/60 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#181825] border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <FontAwesomeIcon icon={faCube} className="text-base" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">NetBeans Java Package Helper</h3>
              <p className="text-xs text-gray-400">Create structured Java packages & classes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Package Name (dot separated)
            </label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. com.educode.exam"
              className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors font-mono text-xs"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Folder path: {packageName ? packageName.replace(/\./g, '/') : '.'}/
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Class / File Name
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Student"
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Type
              </label>
              <select
                value={elementType}
                onChange={(e) => setElementType(e.target.value as 'class' | 'interface' | 'enum')}
                className="w-full bg-[#11111b] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors text-xs"
              >
                <option value="class">Class</option>
                <option value="interface">Interface</option>
                <option value="enum">Enum</option>
              </select>
            </div>
          </div>

          {elementType === 'class' && (
            <label className="flex items-center gap-2 pt-1 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMain}
                onChange={(e) => setIncludeMain(e.target.checked)}
                className="w-4 h-4 rounded bg-[#11111b] border-gray-700 text-orange-500 focus:ring-orange-500 accent-orange-500"
              />
              Generate <code className="text-orange-300 bg-[#11111b] px-1 py-0.5 rounded">public static void main(String[] args)</code>
            </label>
          )}

          {/* Generated File Preview */}
          <div className="p-3 bg-[#11111b] border border-gray-800 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1">
              <FontAwesomeIcon icon={faFileCode} className="text-orange-400" />
              <span>
                Target: {packageName ? `${packageName.replace(/\./g, '/')}/` : ''}{className}.java
              </span>
            </div>
            <pre className="text-[11px] font-mono text-gray-300 opacity-80 leading-relaxed overflow-x-auto">
{packageName ? `package ${packageName};\n\n` : ''}public {elementType} {className} {'{\n'}
{includeMain && elementType === 'class' ? '    public static void main(String[] args) {\n        // Code here\n    }\n' : ''}{'}'}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors shadow-lg shadow-orange-600/20 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faCheck} />
              Create Java Package File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
