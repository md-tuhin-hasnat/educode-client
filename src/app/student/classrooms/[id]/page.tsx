'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ClassroomHub } from '@/components/ClassroomHub';

export default function StudentClassroomPage() {
  const params = useParams();
  const courseId = params?.id as string;

  if (!courseId) return null;

  return <ClassroomHub courseId={courseId} />;
}
