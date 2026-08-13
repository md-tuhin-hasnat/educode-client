'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFileUpload,
  faPaste,
  faCheckCircle,
  faExclamationTriangle,
  faDownload,
  faTimes,
  faCheck,
  faSpinner,
  faUsers,
  faListCheck,
  faTrashAlt,
  faArrowRight,
  faTable,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';

export interface SystemStudent {
  id: string;
  fullName: string;
  email: string;
  role: string;
  studentProfile?: {
    studentId?: string;
    sectionId?: number;
    section?: {
      name: string;
    };
  };
}

interface EnrollStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  classroomTitle: string;
  subjectCode: string;
  onSuccess?: () => void;
}

export const EnrollStudentsModal: React.FC<EnrollStudentsModalProps> = ({
  isOpen,
  onClose,
  courseId,
  classroomTitle,
  subjectCode,
  onSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'search' | 'csv' | 'paste'>('search');
  const [allStudents, setAllStudents] = useState<SystemStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // CSV Engine State
  const [csvStep, setCsvStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    studentId: '',
    email: '',
    fullName: '',
  });

  // Grid validation items
  interface ValidatedEnrollmentItem {
    id: string; // temp row key
    rawRecord: Record<string, string>;
    studentIdVal: string;
    emailVal: string;
    matchedStudent: SystemStudent | null;
    isMatched: boolean;
    errorMsg: string;
  }
  const [gridItems, setGridItems] = useState<ValidatedEnrollmentItem[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'matched' | 'unmatched'>('all');

  // Paste State
  const [pasteText, setPasteText] = useState<string>('');
  const [parsedPasteMatches, setParsedPasteMatches] = useState<{
    matched: SystemStudent[];
    unmatched: string[];
  }>({ matched: [], unmatched: [] });

  // Load existing members and all system students
  const fetchData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const [membersRes, usersRes] = await Promise.all([
        api.get(`/courses/${courseId}/members`),
        api.get('/users', { params: { role: 'student', limit: 10000 } }),
      ]);

      // Currently enrolled student IDs
      const currentEnrolled: { id: string }[] = membersRes.data.students || [];
      setSelectedStudentIds(new Set(currentEnrolled.map((s) => s.id)));

      // All students in database
      const rawData = usersRes.data?.data || usersRes.data || {};
      const userList: SystemStudent[] = Array.isArray(rawData) ? rawData : (rawData.items || []);
      setAllStudents(userList.filter((u) => (u.role || '').toLowerCase() === 'student'));
    } catch (err) {
      console.error('Failed to load enrollment modal data:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setCsvStep('upload');
      setFileName('');
      setCsvRawRows([]);
      setGridItems([]);
    }
  }, [isOpen, fetchData]);

  // Index students for rapid multi-column lookup
  const studentLookup = useMemo(() => {
    const byId = new Map<string, SystemStudent>();
    const byEmail = new Map<string, SystemStudent>();
    const byStudentId = new Map<string, SystemStudent>();

    allStudents.forEach((s) => {
      if (s.id) byId.set(s.id.toLowerCase(), s);
      if (s.email) byEmail.set(s.email.toLowerCase().trim(), s);
      if (s.studentProfile?.studentId) {
        byStudentId.set(s.studentProfile.studentId.toLowerCase().trim(), s);
      }
    });

    return { byId, byEmail, byStudentId };
  }, [allStudents]);

  // Interactive search filter
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return allStudents;
    const q = searchQuery.toLowerCase().trim();
    return allStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.studentProfile?.studentId && s.studentProfile.studentId.toLowerCase().includes(q))
    );
  }, [allStudents, searchQuery]);

  // Toggle selection
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.delete(s.id));
      return next;
    });
  };

  const clearAllSelected = () => {
    setSelectedStudentIds(new Set());
  };

  // Simple CSV Parser
  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string) => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const vals = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx] || '';
      });
      return row;
    });

    return { headers, rows };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { headers, rows } = parseCSV(content);
      setCsvHeaders(headers);
      setCsvRawRows(rows);

      // Auto-detect column mapping
      const initialMap: Record<string, string> = {
        studentId: '',
        email: '',
        fullName: '',
      };

      headers.forEach((h) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lower.includes('studentid') || lower === 'id' || lower.includes('roll') || lower.includes('reg')) {
          initialMap.studentId = h;
        } else if (lower.includes('mail')) {
          initialMap.email = h;
        } else if (lower.includes('name')) {
          initialMap.fullName = h;
        }
      });

      setColumnMapping(initialMap);
      setCsvStep('mapping');
    };
    reader.readAsText(file);
  };

  // Run validation and match against studentLookup
  const processCsvMapping = () => {
    const items: ValidatedEnrollmentItem[] = csvRawRows.map((row, idx) => {
      const sId = columnMapping.studentId ? (row[columnMapping.studentId] || '').trim() : '';
      const email = columnMapping.email ? (row[columnMapping.email] || '').trim() : '';

      let matched: SystemStudent | null = null;

      if (sId) matched = studentLookup.byStudentId.get(sId.toLowerCase()) || null;
      if (!matched && email) matched = studentLookup.byEmail.get(email.toLowerCase()) || null;
      if (!matched && sId) matched = studentLookup.byId.get(sId.toLowerCase()) || null;

      const isMatched = !!matched;
      const errorMsg = isMatched
        ? ''
        : !sId && !email
        ? 'No Student ID or Email mapped/provided for lookup'
        : `No student in database matches ID "${sId}" or Email "${email}"`;

      return {
        id: `row-${idx}`,
        rawRecord: row,
        studentIdVal: sId,
        emailVal: email,
        matchedStudent: matched,
        isMatched,
        errorMsg,
      };
    });

    setGridItems(items);
    setCsvStep('preview');
  };

  // Inline correction for cell values
  const handleCellEdit = (rowId: string, field: 'studentIdVal' | 'emailVal', val: string) => {
    setGridItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        const updated = { ...item, [field]: val };

        const sId = updated.studentIdVal.trim();
        const email = updated.emailVal.trim();

        let matched: SystemStudent | null = null;
        if (sId) matched = studentLookup.byStudentId.get(sId.toLowerCase()) || null;
        if (!matched && email) matched = studentLookup.byEmail.get(email.toLowerCase()) || null;

        const isMatched = !!matched;
        const errorMsg = isMatched
          ? ''
          : `No student matches ID "${sId}" or Email "${email}"`;

        return {
          ...updated,
          matchedStudent: matched,
          isMatched,
          errorMsg,
        };
      })
    );
  };

  // Apply matched students to enrollment selection
  const handleApplyCsvMatches = () => {
    const matchedStudents = gridItems.filter((i) => i.isMatched && i.matchedStudent).map((i) => i.matchedStudent!.id);
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      matchedStudents.forEach((id) => next.add(id));
      return next;
    });
    setActiveMode('search');
  };

  // Direct manual paste processing
  const handleProcessPaste = () => {
    const tokens = pasteText
      .split(/[\r\n,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const matchedMap = new Map<string, SystemStudent>();
    const unmatchedSet = new Set<string>();

    tokens.forEach((tok) => {
      const lower = tok.toLowerCase().replace(/["']/g, '').trim();
      if (!lower) return;

      const match =
        studentLookup.byStudentId.get(lower) ||
        studentLookup.byEmail.get(lower) ||
        studentLookup.byId.get(lower);

      if (match) {
        matchedMap.set(match.id, match);
      } else {
        unmatchedSet.add(tok);
      }
    });

    setParsedPasteMatches({
      matched: Array.from(matchedMap.values()),
      unmatched: Array.from(unmatchedSet),
    });
  };

  const handleApplyPasteMatches = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      parsedPasteMatches.matched.forEach((s) => next.add(s.id));
      return next;
    });
    setActiveMode('search');
  };

  // Submit enrollment update to backend
  const handleSaveMembership = async () => {
    try {
      setSaving(true);
      await api.post(`/courses/${courseId}/members`, {
        studentIds: Array.from(selectedStudentIds),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save classroom membership.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const matchedCount = gridItems.filter((i) => i.isMatched).length;
  const unmatchedCount = gridItems.filter((i) => !i.isMatched).length;

  const filteredGridItems = gridItems.filter((i) => {
    if (filterMode === 'matched') return i.isMatched;
    if (filterMode === 'unmatched') return !i.isMatched;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {subjectCode}
              </span>
              <h2 className="text-lg font-black text-white">{classroomTitle}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bulk Classroom Student Enrollment & Institutional Roster Management
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-3 space-x-2">
          <button
            onClick={() => setActiveMode('search')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center space-x-2 border-t border-x ${
              activeMode === 'search'
                ? 'bg-slate-900 text-purple-400 border-slate-800 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <FontAwesomeIcon icon={faListCheck} />
            <span>Interactive Select ({allStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveMode('csv')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center space-x-2 border-t border-x ${
              activeMode === 'csv'
                ? 'bg-slate-900 text-purple-400 border-slate-800 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <FontAwesomeIcon icon={faFileUpload} />
            <span>Advanced CSV Enrollment</span>
          </button>

          <button
            onClick={() => setActiveMode('paste')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center space-x-2 border-t border-x ${
              activeMode === 'paste'
                ? 'bg-slate-900 text-purple-400 border-slate-800 shadow-lg'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <FontAwesomeIcon icon={faPaste} />
            <span>Quick Manual Paste</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-900/40 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <FontAwesomeIcon icon={faSpinner} className="text-3xl text-purple-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Fetching institutional roster database...</p>
            </div>
          ) : (
            <>
              {/* MODE 1: SEARCH & INTERACTIVE SELECT */}
              {activeMode === 'search' && (
                <div className="space-y-4">
                  {/* Search Bar & Action Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <FontAwesomeIcon
                        icon={faSearch}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student by Name, Email, or Student ID..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition-all"
                      >
                        Select All ({filteredStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllFiltered}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                      >
                        Deselect Filtered
                      </button>
                    </div>
                  </div>

                  {/* Student List */}
                  <div className="max-h-96 overflow-y-auto pr-1 space-y-2 custom-scrollbar border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2">
                    {filteredStudents.length === 0 ? (
                      <p className="text-center py-10 text-xs text-slate-500 font-medium">
                        No student match found for &quot;{searchQuery}&quot;.
                      </p>
                    ) : (
                      filteredStudents.map((student) => {
                        const isEnrolled = selectedStudentIds.has(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => toggleStudent(student.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isEnrolled
                                ? 'bg-purple-600/15 border-purple-500/50 text-white shadow-md'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isEnrolled
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {student.fullName.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-bold text-slate-100">{student.fullName}</p>
                                  {student.studentProfile?.studentId && (
                                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-teal-400 border border-slate-700">
                                      {student.studentProfile.studentId}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{student.email}</p>
                              </div>
                            </div>

                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${
                                isEnrolled
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-800 text-slate-600 border border-slate-700'
                              }`}
                            >
                              {isEnrolled && <FontAwesomeIcon icon={faCheck} />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: ADVANCED CSV ENROLLMENT WITH STEPPER */}
              {activeMode === 'csv' && (
                <div className="space-y-4">
                  {/* CSV Stepper Header */}
                  <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          csvStep === 'upload' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        1. Upload CSV
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="text-slate-600 text-[10px]" />
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          csvStep === 'mapping' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        2. Map Column Headers
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="text-slate-600 text-[10px]" />
                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold ${
                          csvStep === 'preview' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        3. Roster Validation Grid
                      </span>
                    </div>

                    <a
                      href="/samples/classroom_enrollment_100.csv"
                      download
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      <span>Download Sample CSV (100 Students)</span>
                    </a>
                  </div>

                  {/* STEP 1: FILE UPLOAD */}
                  {csvStep === 'upload' && (
                    <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 bg-slate-950/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group text-center space-y-2">
                      <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="hidden" />
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faFileUpload} />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        {fileName ? fileName : 'Click or Drag CSV Roster File Here'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Upload CSV file containing student identifiers (Student ID, Email, or Full Name)
                      </p>
                    </label>
                  )}

                  {/* STEP 2: COLUMN MAPPING */}
                  {csvStep === 'mapping' && (
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Match CSV Headers to Database Fields
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            You only need Student ID OR Email to uniquely identify students. Additional columns are optional.
                          </p>
                        </div>
                        <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30">
                          {csvRawRows.length} Rows Detected
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                          <label className="block text-slate-300 font-semibold">Student ID Column</label>
                          <select
                            value={columnMapping.studentId}
                            onChange={(e) => setColumnMapping({ ...columnMapping, studentId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="">-- None / Skip --</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500">e.g. 2026-STU-001, STU-101</p>
                        </div>

                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                          <label className="block text-slate-300 font-semibold">Email Address Column</label>
                          <select
                            value={columnMapping.email}
                            onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="">-- None / Skip --</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500">e.g. student@university.edu</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <button
                          type="button"
                          onClick={() => setCsvStep('upload')}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          Change File
                        </button>

                        <button
                          type="button"
                          onClick={processCsvMapping}
                          disabled={!columnMapping.studentId && !columnMapping.email}
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center space-x-2"
                        >
                          <FontAwesomeIcon icon={faTable} />
                          <span>Process & Validate Grid</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PREVIEW & INLINE VALIDATION GRID */}
                  {csvStep === 'preview' && (
                    <div className="space-y-3">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold">Total Rows</span>
                          <span className="text-sm font-bold text-white font-mono">{gridItems.length}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                          <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                            <FontAwesomeIcon icon={faCheckCircle} />
                            <span>Matched</span>
                          </span>
                          <span className="text-sm font-bold text-emerald-300 font-mono">{matchedCount}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                          <span className="text-xs text-amber-400 font-semibold flex items-center space-x-1">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            <span>Unmatched</span>
                          </span>
                          <span className="text-sm font-bold text-amber-300 font-mono">{unmatchedCount}</span>
                        </div>
                      </div>

                      {/* Filter Bar */}
                      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center space-x-2">
                          <FontAwesomeIcon icon={faFilter} className="text-slate-500" />
                          <span className="text-slate-400 font-semibold">Show:</span>
                          <button
                            type="button"
                            onClick={() => setFilterMode('all')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                              filterMode === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            All ({gridItems.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterMode('matched')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                              filterMode === 'matched'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            Matched ({matchedCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterMode('unmatched')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                              filterMode === 'unmatched'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            Unmatched ({unmatchedCount})
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCsvStep('mapping')}
                          className="text-[11px] text-purple-400 hover:underline font-semibold"
                        >
                          Re-map Columns
                        </button>
                      </div>

                      {/* Data Grid Table */}
                      <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px]">
                            <tr>
                              <th className="p-3">Status</th>
                              <th className="p-3">Student ID (Editable)</th>
                              <th className="p-3">Email (Editable)</th>
                              <th className="p-3">Database Match</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {filteredGridItems.map((item) => (
                              <tr
                                key={item.id}
                                className={`transition-colors ${
                                  item.isMatched ? 'hover:bg-purple-950/20' : 'bg-amber-950/10 hover:bg-amber-950/20'
                                }`}
                              >
                                <td className="p-3">
                                  {item.isMatched ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 w-max">
                                      <FontAwesomeIcon icon={faCheckCircle} />
                                      <span>Matched</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1 w-max" title={item.errorMsg}>
                                      <FontAwesomeIcon icon={faExclamationTriangle} />
                                      <span>Unmatched</span>
                                    </span>
                                  )}
                                </td>

                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={item.studentIdVal}
                                    onChange={(e) => handleCellEdit(item.id, 'studentIdVal', e.target.value)}
                                    placeholder="Enter Student ID"
                                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs font-mono focus:border-purple-500"
                                  />
                                </td>

                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={item.emailVal}
                                    onChange={(e) => handleCellEdit(item.id, 'emailVal', e.target.value)}
                                    placeholder="Enter Email"
                                    className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs focus:border-purple-500"
                                  />
                                </td>

                                <td className="p-3">
                                  {item.matchedStudent ? (
                                    <div>
                                      <p className="font-bold text-white">{item.matchedStudent.fullName}</p>
                                      <p className="text-[10px] text-purple-300 font-mono">{item.matchedStudent.email}</p>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-amber-400 font-mono italic">
                                      {item.errorMsg}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Action Bar */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleApplyCsvMatches}
                          disabled={matchedCount === 0}
                          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50 transition-all flex items-center space-x-2 shadow-lg shadow-purple-600/30"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                          <span>Apply Matched Roster Selection (+{matchedCount})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: DIRECT MANUAL PASTE */}
              {activeMode === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Paste List of Student Identifiers
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Paste Student IDs or Emails separated by commas, tabs, or newlines.
                    </p>
                  </div>

                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Example:&#10;2026-STU-001&#10;student.john@university.edu&#10;2026-STU-002, 2026-STU-003"
                    rows={6}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-500 custom-scrollbar"
                  />

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={handleProcessPaste}
                      disabled={!pasteText.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
                    >
                      Process & Match Identifiers
                    </button>

                    {parsedPasteMatches.matched.length > 0 && (
                      <button
                        type="button"
                        onClick={handleApplyPasteMatches}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center space-x-2"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        <span>Apply Pasted Selection (+{parsedPasteMatches.matched.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Processed Results Report */}
                  {parsedPasteMatches.matched.length > 0 && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">
                          ✓ Matched {parsedPasteMatches.matched.length} system student records.
                        </span>
                        {parsedPasteMatches.unmatched.length > 0 && (
                          <span className="text-xs font-semibold text-amber-400">
                            ⚠ {parsedPasteMatches.unmatched.length} unrecognized tokens
                          </span>
                        )}
                      </div>

                      {parsedPasteMatches.unmatched.length > 0 && (
                        <p className="text-[11px] font-mono text-slate-400">
                          Unrecognized: {parsedPasteMatches.unmatched.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Summary & Action Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-semibold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <FontAwesomeIcon icon={faUsers} className="text-purple-400" />
              <span>
                Total Selected: <strong className="text-purple-300 font-bold">{selectedStudentIds.size}</strong> / {allStudents.length}
              </span>
            </div>

            {selectedStudentIds.size > 0 && (
              <button
                type="button"
                onClick={clearAllSelected}
                className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center space-x-1 transition-all"
              >
                <FontAwesomeIcon icon={faTrashAlt} />
                <span>Clear Selection</span>
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveMembership}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all"
            >
              {saving && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
              <span>Save & Sync Membership</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
