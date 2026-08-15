'use client';

import React, { useState } from 'react';
import { useAuthStore, UserSession } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCode,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faServer,
  faSignInAlt,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { API_BASE_URL, SERVER_ORIGIN } from '@/config/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Attempt backend API login
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      const { user: userData, accessToken, refreshToken } = response.data;
      const normalizedRole = (userData.role || 'STUDENT').toUpperCase() as 'STUDENT' | 'TEACHER' | 'ADMIN';
      const session: UserSession = {
        id: userData.id,
        email: userData.email,
        name: userData.fullName || userData.name || email,
        role: normalizedRole,
        token: accessToken,
        refreshToken: refreshToken,
        departmentId: userData.departmentId,
      };

      login(session);
      redirectToRoleDashboard(session.role);
    } catch (err: unknown) {
      console.error('[Login Error]', err);
      let message = 'Invalid credentials or server connection failed.';
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.message) {
          const rawMsg = err.response.data.message;
          message = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
        } else if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          message = `Cannot connect to API server at ${SERVER_ORIGIN}. Please ensure the backend is running.`;
        } else if (err.response?.status === 401) {
          message = 'Invalid email or password. Please verify your institutional credentials.';
        }
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectToRoleDashboard = (role: string) => {
    switch ((role || '').toUpperCase()) {
      case 'ADMIN':
        router.push('/admin/dashboard');
        break;
      case 'TEACHER':
        router.push('/teacher/dashboard');
        break;
      default:
        router.push('/student/dashboard');
        break;
    }
  };

  const fillQuickAccount = (demoEmail: string, demoPassword?: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword || 'Student@123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Glassmorphism Login Card */}
        <div className="glass-panel-glow rounded-2xl p-8 border border-brand-500/20 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-600/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-tealAccent-500/20 rounded-full blur-2xl pointer-events-none"></div>

          {/* Header Branding */}
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-tealAccent-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-brand-500/30">
              <FontAwesomeIcon icon={faCode} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">EduCode Portal</h1>
              <p className="text-xs text-slate-400 mt-1">Institutional Examination & Assessment Engine</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-sm shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Institutional Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alan.turing@teacher.university.edu"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 text-xs"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <FontAwesomeIcon icon={faSignInAlt} />
                  <span>Authenticate & Launch Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo / Institutional Account Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[11px] text-center text-slate-400 mb-3 font-medium">Quick Select Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('alan.turing@teacher.university.edu', 'EduCodeFaculty2026!')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-blue-500/50 flex flex-col items-start text-left transition-all group"
                title="Faculty: alan.turing@teacher.university.edu"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">👨‍🏫 Faculty</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">Teacher</span>
                </div>
                <span className="text-[11px] font-medium text-slate-200 truncate w-full">Dr. Alan Turing</span>
                <span className="text-[9px] text-slate-400 truncate w-full">alan.turing@teacher...</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('teaching.assistant.bob@ta.university.edu', 'EduCodeTA2026!')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-amber-500/50 flex flex-col items-start text-left transition-all group"
                title="Teaching Assistant: teaching.assistant.bob@ta.university.edu"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300">🧑‍💻 TA</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">TA</span>
                </div>
                <span className="text-[11px] font-medium text-slate-200 truncate w-full">Bob (Assistant)</span>
                <span className="text-[9px] text-slate-400 truncate w-full">teaching.assistant...</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('stu-2026-001@student.university.edu', 'EduCodeStudent2026!')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-tealAccent-500/50 flex flex-col items-start text-left transition-all group"
                title="Student: stu-2026-001@student.university.edu"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-tealAccent-400 group-hover:text-tealAccent-300">🎓 Student</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-tealAccent-500/10 text-tealAccent-300 font-mono">Student</span>
                </div>
                <span className="text-[11px] font-medium text-slate-200 truncate w-full">John Doe</span>
                <span className="text-[9px] text-slate-400 truncate w-full">stu-2026-001@stud...</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('system.administrator@admin.university.edu', 'EduCodeAdmin2026!')}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-purple-500/50 flex flex-col items-start text-left transition-all group"
                title="Administrator: system.administrator@admin.university.edu"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-purple-400 group-hover:text-purple-300">🛡️ Admin</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">Admin</span>
                </div>
                <span className="text-[11px] font-medium text-slate-200 truncate w-full">Administrator</span>
                <span className="text-[9px] text-slate-400 truncate w-full">system.administrator...</span>
              </button>
            </div>
          </div>
        </div>

        {/* Server Connection Pill */}
        <div className="mt-4 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <FontAwesomeIcon icon={faServer} className="text-slate-500 text-xs" />
          <span>EduCode NestJS API: <strong className="text-emerald-400 font-semibold">{SERVER_ORIGIN}</strong></span>
        </div>
      </div>
    </div>
  );
}
