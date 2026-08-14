"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function StudentAssessmentEntry() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  useEffect(() => {
    if (id) {
      router.replace(`/student/assessments/${id}/arena`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="animate-pulse">Loading Assessment...</div>
    </div>
  );
}
