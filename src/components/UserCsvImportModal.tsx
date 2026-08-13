'use client';

import React, { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileUpload,
  faTimes,
  faCheckCircle,
  faExclamationTriangle,
  faArrowRight,
  faSpinner,
  faTable,
  faListCheck,
  faCheck,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';
import {
  getProvisioningSettings,
  generateUsernameFromName,
  generateUsernameFromId
} from '@/utils/userAutoFillSettings';

interface UserCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Database fields available for mapping
const DB_USER_FIELDS = [
  { key: 'fullName', label: 'Full Name', required: true, example: 'John Doe' },
  { key: 'role', label: 'Role', required: true, example: 'student | teacher | ta | admin' },
  { key: 'studentId', label: 'Institutional / Student ID', required: false, example: '2026-CSE-001' },
  { key: 'email', label: 'Email Address', required: false, example: 'john@university.edu' },
  { key: 'password', label: 'Password', required: false, example: 'Pass12345!' },
  { key: 'department', label: 'Department', required: false, example: 'Computer Science' },
];

interface GridRow {
  id: number;
  fullName: string;
  role: string;
  studentId: string;
  email: string;
  password: string;
  department: string;
  errors: Record<string, string>; // field -> error message
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cur.replace(/^["']|["']$/g, '').trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.replace(/^["']|["']$/g, '').trim());
  return result;
}

export default function UserCsvImportModal({
  isOpen,
  onClose,
  onSuccess
}: UserCsvImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [rawText, setRawText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  
  // Mapping state: dbFieldKey -> selectedCsvHeaderIndex (or -1 for none)
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  
  // Grid Data for Preview
  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'errors' | 'valid'>('all');

  // Import Execution state
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    errors?: Array<{ email: string; reason: string }>;
  } | null>(null);

  // Reset state when closing
  const handleReset = () => {
    setStep('upload');
    setRawText('');
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setGridData([]);
    setImportResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Step 1: Handle File Upload or Paste
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        processRawCsv(content);
      }
    };
    reader.readAsText(file);
  };

  const processRawCsv = (text: string) => {
    setRawText(text);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      alert('CSV file must contain a header row and at least one data row.');
      return;
    }

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(parseCSVLine);

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Smart Auto-Mapping Guess
    const autoMap: Record<string, number> = {};
    DB_USER_FIELDS.forEach((field) => {
      const lowerKey = field.key.toLowerCase();

      const matchedIdx = headers.findIndex((h) => {
        const lowerH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          lowerH === lowerKey ||
          lowerH.includes(lowerKey) ||
          lowerH.includes(field.label.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
          (field.key === 'fullName' && (lowerH.includes('name') || lowerH === 'user')) ||
          (field.key === 'studentId' && (lowerH.includes('id') || lowerH.includes('code'))) ||
          (field.key === 'email' && lowerH.includes('mail')) ||
          (field.key === 'department' && (lowerH.includes('dept') || lowerH.includes('department')))
        );
      });

      autoMap[field.key] = matchedIdx !== -1 ? matchedIdx : -1;
    });

    setColumnMapping(autoMap);
    setStep('mapping');
  };

  // Step 2 -> Step 3: Generate Grid Data & Validation
  const handleProceedToPreview = () => {
    const rows: GridRow[] = csvRows.map((rawRow, idx) => {
      const getVal = (key: string) => {
        const headerIdx = columnMapping[key];
        return headerIdx !== undefined && headerIdx !== -1 && rawRow[headerIdx]
          ? rawRow[headerIdx].trim()
          : '';
      };

      const fullName = getVal('fullName');
      const role = getVal('role').toLowerCase() || 'student';
      const studentId = getVal('studentId');
      const email = getVal('email');
      const password = getVal('password');
      const department = getVal('department');

      const errors: Record<string, string> = {};

      if (!fullName) {
        errors.fullName = 'Full Name is required';
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Invalid email format';
      }

      return {
        id: idx + 1,
        fullName,
        role: ['admin', 'teacher', 'ta', 'student'].includes(role) ? role : 'student',
        studentId,
        email,
        password,
        department,
        errors
      };
    });

    setGridData(rows);
    setStep('preview');
  };

  // Auto-Fix Missing Fields using Admin Provisioning Settings
  const handleAutoFix = () => {
    const settings = getProvisioningSettings();
    setGridData((prev) =>
      prev.map((row) => {
        const roleKey = (row.role as keyof typeof settings) || 'student';
        const roleCfg = settings[roleKey] || settings.student;

        let updatedEmail = row.email;
        let updatedPassword = row.password;
        let updatedId = row.studentId;

        // Auto ID if missing
        if (!updatedId) {
          const prefix = roleCfg.idPrefixPattern || 'STU-2026-';
          updatedId = `${prefix}${String(row.id).padStart(3, '0')}`;
        }

        // Auto Email if missing
        if (!updatedEmail) {
          const username =
            roleCfg.autoFillSource === 'id' && updatedId
              ? generateUsernameFromId(updatedId)
              : generateUsernameFromName(row.fullName);
          if (username) {
            updatedEmail = `${username}@${roleCfg.emailDomain || 'university.edu'}`;
          }
        }

        // Auto Password if missing
        if (!updatedPassword) {
          updatedPassword = roleCfg.defaultPassword || 'EduCode2026!';
        }

        // Re-validate row
        const errors: Record<string, string> = {};
        if (!row.fullName) errors.fullName = 'Full Name is required';
        if (updatedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedEmail)) {
          errors.email = 'Invalid email format';
        }

        return {
          ...row,
          studentId: updatedId,
          email: updatedEmail,
          password: updatedPassword,
          errors
        };
      })
    );
  };

  // Edit grid cell inline
  const handleCellEdit = (id: number, field: keyof GridRow, value: string) => {
    setGridData((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };
        const errors = { ...row.errors };

        // Recheck validations for field
        if (field === 'fullName') {
          if (!value.trim()) errors.fullName = 'Full Name is required';
          else delete errors.fullName;
        }

        if (field === 'email') {
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.email = 'Invalid email format';
          } else {
            delete errors.email;
          }
        }

        return { ...updated, errors };
      })
    );
  };

  // Final Submit
  const handleFinalImport = async () => {
    const validRows = gridData.filter((r) => Object.keys(r.errors).length === 0);
    if (validRows.length === 0) {
      alert('No valid rows available to import. Please resolve errors in the grid first.');
      return;
    }

    setLoading(true);
    try {
      const payload = validRows.map((r) => ({
        fullName: r.fullName,
        role: r.role,
        email: r.email,
        password: r.password || undefined,
        studentId: r.role === 'student' || r.role === 'ta' ? r.studentId : undefined,
        employeeId: r.role === 'teacher' ? r.studentId : undefined,
        department: r.department || undefined
      }));

      const res = await api.post('/users/bulk-import', { users: payload });
      setImportResult({
        importedCount: res.data.importedCount,
        skippedCount: res.data.skippedCount,
        errors: res.data.errors
      });
      setStep('result');
      onSuccess();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to execute bulk user import.';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Computed Grid Filtering
  const filteredGridData = useMemo(() => {
    if (filterMode === 'errors') return gridData.filter((r) => Object.keys(r.errors).length > 0);
    if (filterMode === 'valid') return gridData.filter((r) => Object.keys(r.errors).length === 0);
    return gridData;
  }, [gridData, filterMode]);

  const totalErrors = useMemo(() => {
    return gridData.filter((r) => Object.keys(r.errors).length > 0).length;
  }, [gridData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FontAwesomeIcon icon={faTable} className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                CSV Ingestion Engine
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'upload' && 'Step 1: Upload or paste raw CSV data'}
                {step === 'mapping' && 'Step 2: Admin Header to Database Field Mapping'}
                {step === 'preview' && 'Step 3: Real-time validation & inline data editing'}
                {step === 'result' && 'Step 4: Import Summary & Results'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-8 text-center bg-slate-800/30 transition-all group">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="p-4 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                    <FontAwesomeIcon icon={faFileUpload} className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">
                      Click to upload CSV or drag and drop
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports arbitrary CSV columns (Headers will be mapped in the next step)
                    </p>
                  </div>
                </label>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-xs text-slate-500 font-medium">OR PASTE RAW CSV</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Paste CSV Text Content
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Full Name,Role,Institutional ID,Email,Department&#10;John Doe,student,2026-CSE-001,john@university.edu,Computer Science"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="/samples/users_directory_sample_100.csv"
                  download
                  className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <FontAwesomeIcon icon={faDownload} className="w-4 h-4" /> Download 100+ User Sample Template CSV
                </a>
                <button
                  disabled={!rawText.trim()}
                  onClick={() => processRawCsv(rawText)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
                >
                  Parse & Map Columns <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                <FontAwesomeIcon icon={faListCheck} className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-indigo-200 leading-relaxed">
                  Map your CSV column headers to the corresponding system database fields below. Unmapped optional fields can be auto-filled using your institutional settings.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DB_USER_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {field.label}
                          {field.required && (
                            <span className="text-xs font-bold text-red-400">*Required</span>
                          )}
                        </span>
                        <p className="text-xs text-slate-400">Ex: {field.example}</p>
                      </div>
                      {columnMapping[field.key] !== undefined && columnMapping[field.key] !== -1 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                          <FontAwesomeIcon icon={faCheck} className="w-3 h-3" /> Mapped
                        </span>
                      )}
                    </div>

                    <select
                      value={columnMapping[field.key] ?? -1}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          [field.key]: parseInt(e.target.value, 10)
                        })
                      }
                      className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value={-1}>-- Don&apos;t Map / Optional --</option>
                      {csvHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          CSV Header: &quot;{header}&quot;
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Back to Upload
                </button>
                <button
                  onClick={handleProceedToPreview}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
                >
                  Preview & Validate Data Grid <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & INLINE GRID EDITING */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Stats & Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
                    <FontAwesomeIcon icon={faTable} className="w-4 h-4 text-indigo-400" />
                    Total Rows: <span className="text-white">{gridData.length}</span>
                  </div>
                  {totalErrors > 0 ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
                      Flagged Errors: <span>{totalErrors}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                      <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" />
                      All Rows Valid
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        filterMode === 'all'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({gridData.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('errors')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        filterMode === 'errors'
                          ? 'bg-red-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Errors Only ({totalErrors})
                    </button>
                    <button
                      onClick={() => setFilterMode('valid')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        filterMode === 'valid'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Valid ({gridData.length - totalErrors})
                    </button>
                  </div>

                  <button
                    onClick={handleAutoFix}
                    className="px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="w-3.5 h-3.5" /> Auto-Fix Defaults
                  </button>
                </div>
              </div>

              {/* Interactive Data Grid */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3 min-w-[150px]">Full Name *</th>
                      <th className="p-3 min-w-[110px]">Role</th>
                      <th className="p-3 min-w-[130px]">ID</th>
                      <th className="p-3 min-w-[180px]">Email</th>
                      <th className="p-3 min-w-[130px]">Password</th>
                      <th className="p-3 min-w-[130px]">Department</th>
                      <th className="p-3 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredGridData.map((row) => {
                      const hasErr = Object.keys(row.errors).length > 0;
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            hasErr ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="p-3 text-center text-slate-500 font-mono">{row.id}</td>
                          
                          {/* Full Name Cell */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.fullName}
                              onChange={(e) => handleCellEdit(row.id, 'fullName', e.target.value)}
                              className={`w-full bg-slate-950/80 border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 ${
                                row.errors.fullName
                                  ? 'border-red-500/80 focus:border-red-400'
                                  : 'border-slate-800'
                              }`}
                              placeholder="Full name"
                            />
                            {row.errors.fullName && (
                              <span className="text-[10px] text-red-400 block mt-0.5">
                                {row.errors.fullName}
                              </span>
                            )}
                          </td>

                          {/* Role Cell */}
                          <td className="p-2">
                            <select
                              value={row.role}
                              onChange={(e) => handleCellEdit(row.id, 'role', e.target.value)}
                              className="w-full bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
                            >
                              <option value="student">student</option>
                              <option value="teacher">teacher</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>

                          {/* ID Cell */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.studentId}
                              onChange={(e) => handleCellEdit(row.id, 'studentId', e.target.value)}
                              className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="Auto/ID"
                            />
                          </td>

                          {/* Email Cell */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.email}
                              onChange={(e) => handleCellEdit(row.id, 'email', e.target.value)}
                              className={`w-full bg-slate-950/80 border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 ${
                                row.errors.email
                                  ? 'border-red-500/80 focus:border-red-400'
                                  : 'border-slate-800'
                              }`}
                              placeholder="Email address"
                            />
                            {row.errors.email && (
                              <span className="text-[10px] text-red-400 block mt-0.5">
                                {row.errors.email}
                              </span>
                            )}
                          </td>

                          {/* Password Cell */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.password}
                              onChange={(e) => handleCellEdit(row.id, 'password', e.target.value)}
                              className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 font-mono"
                              placeholder="Auto/Default"
                            />
                          </td>

                          {/* Department Cell */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.department}
                              onChange={(e) => handleCellEdit(row.id, 'department', e.target.value)}
                              className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                              placeholder="Dept code"
                            />
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center">
                            {hasErr ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" /> Error
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheck} className="w-3 h-3" /> Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Back to Mapping
                </button>
                <button
                  disabled={loading || gridData.length - totalErrors === 0}
                  onClick={handleFinalImport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" /> Ingesting Data...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4" /> Ingest {gridData.length - totalErrors} Valid Users
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: RESULT */}
          {step === 'result' && importResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <FontAwesomeIcon icon={faCheckCircle} className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white">Batch Import Completed</h3>
                <p className="text-sm text-slate-400 mt-1">
                  User accounts and institutional profiles have been processed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {importResult.importedCount}
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-1">
                    Users Successfully Imported
                  </div>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="text-2xl font-extrabold text-amber-400">
                    {importResult.skippedCount}
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-1">
                    Skipped (Existing / Invalid)
                  </div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="text-left bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-48 overflow-y-auto max-w-lg mx-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Skipped Details:
                  </span>
                  <div className="space-y-1 text-xs">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="flex justify-between text-slate-400 border-b border-slate-900 pb-1">
                        <span className="font-mono text-slate-300">{err.email}</span>
                        <span className="text-amber-400/90">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Close & Refresh Users List
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
