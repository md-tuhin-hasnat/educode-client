'use client';

import React from 'react';
import { useParams } from 'next/navigation';

export default function TeacherTaskEditPage() {
  const { id } = useParams();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Edit Task {id}</h1>
      <p className="text-slate-400">The edit functionality is coming soon.</p>
    </div>
  );
}
