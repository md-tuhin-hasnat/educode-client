"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faClock, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function StudentArenaPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [myParticipantStatus, setMyParticipantStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Join Arena on mount
  useEffect(() => {
    const joinArena = async () => {
      if (!user?.token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}/arena/join`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (!res.ok) {
          const err = await res.json();
          setError(err.message || 'Failed to join arena');
        }
      } catch (err) {
        setError('Network error while joining arena');
      }
    };
    joinArena();
  }, [id, user]);

  // 2. Poll for assessment status and my approval status
  useEffect(() => {
    if (!user?.token) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setAssessment(data);
        
        // Find my participant record
        const me = data.participants?.find((p: any) => p.studentId === user.id);
        if (me) setMyParticipantStatus(me);

        // If exam started, redirect to solve page
        if (data.status === 'RUNNING') {
          router.push(`/student/assessments/${id}/solve`);
        }
      } catch (err) {
        // Silent error for polling
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [id, user, router]);

  if (isLoading && !assessment) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Connecting to Arena...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-6 rounded-xl max-w-md text-center">
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => router.push('/student/assessments')}
            className="text-white underline hover:text-blue-400"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  const isApproved = myParticipantStatus?.isApproved;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      <div className="flex-1 flex flex-col">
        <div className="p-8">
          <button
            onClick={() => router.push('/student/assessments')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors w-fit"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Leave Arena</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-gray-800 rounded-3xl p-10 border border-gray-700 shadow-2xl max-w-xl w-full text-center relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className={`absolute top-0 left-0 w-full h-2 transition-colors duration-1000 ${
              isApproved ? 'bg-gradient-to-r from-green-400 to-emerald-600' : 'bg-gradient-to-r from-yellow-400 to-orange-500'
            }`}></div>
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-10 transition-colors duration-1000 ${
              isApproved ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            
            <h1 className="text-3xl font-bold text-white mb-2">{assessment?.title}</h1>
            <p className="text-gray-400 mb-8 flex items-center justify-center space-x-2">
              <span className="px-2 py-1 bg-gray-900 rounded text-xs border border-gray-700">{assessment?.type}</span>
              <span>•</span>
              <span className="flex items-center"><FontAwesomeIcon icon={faClock} className="mr-1" /> {assessment?.durationMin} mins</span>
            </p>

            <div className="py-10">
              {isApproved ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin opacity-20"></div>
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 w-12 h-12 text-5xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Attendance Verified</h2>
                  <p className="text-gray-400 max-w-sm">
                    You have been approved by the instructor. Please wait quietly while other students are verified. The exam will start automatically.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-yellow-500/30 animate-pulse"></div>
                    <FontAwesomeIcon icon={faSpinner} className="text-yellow-500 w-12 h-12 text-5xl animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Waiting for Approval</h2>
                  <p className="text-gray-400 max-w-sm">
                    The instructor is currently verifying physical attendance. Please wait to be approved to take this exam.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 bg-gray-900/50 rounded-xl p-4 border border-gray-800 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
              <span className="text-sm text-gray-400">Live connection to Exam Server</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
