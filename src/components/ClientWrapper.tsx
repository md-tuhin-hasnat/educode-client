'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import '@/lib/monacoInit';

export const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initSession, isLoading, user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initSession();
  }, [initSession]);

  const isPublicPage = pathname === '/login' || pathname.startsWith('/docs');

  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push('/login');
    }
  }, [isLoading, user, isPublicPage, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wide">Launching EduCode Environment...</p>
        </div>
      </div>
    );
  }

  const isDocsPage = pathname.startsWith('/docs');
  const hideAppSidebar = isPublicPage;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        {!hideAppSidebar && <Sidebar />}
        <main className={`flex-1 overflow-y-auto ${isDocsPage ? 'p-0 bg-slate-950' : 'bg-slate-950/40 p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};
