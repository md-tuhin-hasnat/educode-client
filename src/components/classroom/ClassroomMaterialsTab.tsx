'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloud,
  faPlus,
  faFileAlt,
  faExternalLinkAlt,
  faTrash,
  faPaperclip,
} from '@fortawesome/free-solid-svg-icons';
import { CourseMaterialItem } from './types';

interface MaterialItemWithUploader extends CourseMaterialItem {
  postId?: string | null;
  uploader?: { id: string; fullName: string; role: string };
}

interface ClassroomMaterialsTabProps {
  materials?: MaterialItemWithUploader[];
  isTeacherOrAdmin: boolean;
  onOpenDrivePicker: () => void;
  onOpenMaterialModal: () => void;
  onDeleteMaterial: (id: string) => void;
}

export function ClassroomMaterialsTab({
  materials = [],
  isTeacherOrAdmin,
  onOpenDrivePicker,
  onOpenMaterialModal,
  onDeleteMaterial,
}: ClassroomMaterialsTabProps) {
  const directMaterials = materials.filter((m) => !m.postId);
  const postAttachedMaterials = materials.filter((m) => !!m.postId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-white">Course Materials & References Hub</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated course slides, PDFs, Google Drive files, and post-linked attachments
          </p>
        </div>
        {isTeacherOrAdmin && (
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenDrivePicker}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <FontAwesomeIcon icon={faCloud} />
              <span>Google Drive Upload & Fetch</span>
            </button>
            <button
              onClick={onOpenMaterialModal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all"
              title="Upload via direct link or custom URL"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Manual Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Section 1: Direct Course Materials */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-brand-400 uppercase tracking-wider border-b border-brand-500/30 pb-2">
          📁 Institutional Course Documents ({directMaterials.length})
        </h4>

        {directMaterials.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-950/40">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mx-auto">
              <FontAwesomeIcon icon={faCloud} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">No course materials added yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload slides or link documents directly from your synced Google Drive.
              </p>
            </div>
            {isTeacherOrAdmin && (
              <button
                onClick={onOpenDrivePicker}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
              >
                Open Google Drive Hub
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {directMaterials.map((mat) => {
              const isGDrive =
                mat.fileUrl.includes('drive.google.com') || mat.fileUrl.includes('docs.google.com');
              return (
                <div
                  key={mat.id}
                  className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${
                        isGDrive
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                      }`}
                    >
                      <FontAwesomeIcon icon={isGDrive ? faCloud : faFileAlt} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-slate-200">{mat.title}</h4>
                        {isGDrive && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                            Google Drive
                          </span>
                        )}
                      </div>
                      {mat.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{mat.description}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Uploaded by {mat.uploader?.fullName} • {new Date(mat.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                      <span>{isGDrive ? 'Open in Drive' : 'View / Download'}</span>
                    </a>
                    {isTeacherOrAdmin && (
                      <button
                        onClick={() => onDeleteMaterial(mat.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors text-xs"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Post Attachments & Aggregated Resources */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-teal-400 uppercase tracking-wider border-b border-teal-500/30 pb-2">
          📌 Stream Post Attachments & Shared Resources ({postAttachedMaterials.length})
        </h4>

        {postAttachedMaterials.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No attachments shared in stream posts yet.</p>
        ) : (
          <div className="space-y-3">
            {postAttachedMaterials.map((mat) => (
              <div
                key={mat.id}
                className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 text-lg">
                    <FontAwesomeIcon icon={faPaperclip} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{mat.title}</h4>
                    {mat.description && <p className="text-[11px] text-slate-400">{mat.description}</p>}
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Stream Attachment • {new Date(mat.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <a
                  href={mat.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-brand-400 rounded-lg text-xs font-medium flex items-center space-x-1.5"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  <span>Open Link</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
