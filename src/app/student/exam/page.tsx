'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function StudentExamRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');

  useEffect(() => {
    if (taskId) {
      router.replace(`/student/exam/${taskId}`);
    } else {
      router.replace('/student/dashboard');
    }
  }, [taskId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
      <div className="flex items-center space-x-2">
        <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
        <span>Loading IDE Solver...</span>
      </div>
    </div>
  );
}

export default function StudentExamRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Loading IDE Solver...</div>}>
      <StudentExamRedirectContent />
    </Suspense>
  );
}
