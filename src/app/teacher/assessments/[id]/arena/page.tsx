"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faUsers, faClock, faExclamationCircle, faPlay } from '@fortawesome/free-solid-svg-icons';

export default function TeacherArenaPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch assessment');
      const data = await res.json();
      setAssessment(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token && id) {
      fetchAssessment();
      
      // Polling for updates every 3 seconds
      const interval = setInterval(fetchAssessment, 3000);
      return () => clearInterval(interval);
    }
  }, [user, id]);

  const handleApprove = async (studentId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}/arena/approve/${studentId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        fetchAssessment();
      }
    } catch (err) {
      console.error('Failed to approve student', err);
    }
  };

  const handleStartExam = async () => {
    if (!confirm('Are you sure you want to start the exam? This will allow all approved students to begin solving.')) {
      return;
    }
    
    setIsStarting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      
      if (res.ok) {
        fetchAssessment();
        alert('Exam started successfully!');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to start exam');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading && !assessment) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading Arena...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500">{error}</div>;
  }

  const participants = assessment?.participants || [];
  const approvedCount = participants.filter((p: any) => p.isApproved).length;
  const isRunning = assessment?.status === 'RUNNING';
  const isFinished = assessment?.status === 'FINISHED';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push(`/teacher/assessments/${id}/builder`)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Builder</span>
          </button>
          
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl relative overflow-hidden mb-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${
                    isRunning ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 
                    isFinished ? 'bg-gray-700 text-gray-400 border border-gray-600' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                  }`}>
                    {isRunning ? 'EXAM IN PROGRESS' : isFinished ? 'FINISHED' : 'WAITING FOR STUDENTS'}
                  </span>
                  <span className="text-gray-400 text-sm flex items-center">
                    <FontAwesomeIcon icon={faClock} className="mr-1" /> {assessment?.durationMin} mins
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-1">Exam Arena: {assessment?.title}</h1>
                <p className="text-gray-400 max-w-2xl">
                  Students must join the arena to participate. Verify their physical attendance before approving them.
                </p>
              </div>
              
              {!isRunning && !isFinished && (
                <button
                  onClick={handleStartExam}
                  disabled={isStarting || participants.length === 0}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                    isStarting || participants.length === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/30'
                  }`}
                >
                  <FontAwesomeIcon icon={faPlay} className="text-xl" />
                  <span>{isStarting ? 'Starting...' : 'START EXAM'}</span>
                </button>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <FontAwesomeIcon icon={faUsers} className="text-2xl" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Joined</div>
                  <div className="text-2xl font-bold text-white">{participants.length}</div>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                  <FontAwesomeIcon icon={faCheck} className="text-2xl" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Approved</div>
                  <div className="text-2xl font-bold text-white">{approvedCount}</div>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-700 flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                  <FontAwesomeIcon icon={faExclamationCircle} className="text-2xl" />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Waiting</div>
                  <div className="text-2xl font-bold text-white">{participants.length - approvedCount}</div>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">Student Roster</h2>
          
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {participants.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FontAwesomeIcon icon={faUsers} className="mx-auto mb-4 opacity-20 text-5xl" />
                <p>No students have joined the arena yet.</p>
                <p className="text-sm mt-2">Waiting for students to connect...</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-900/50 text-gray-400 text-sm uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Join Time</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {participants.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={p.student?.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.student?.fullName || 'S')}&background=random`} 
                            alt={p.student?.fullName} 
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="font-medium text-white">{p.student?.fullName}</div>
                            <div className="text-xs text-gray-400">{p.student?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.isApproved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 animate-pulse">
                            Waiting
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(p.joinedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!p.isApproved && !isRunning && !isFinished && (
                          <button
                            onClick={() => handleApprove(p.studentId)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {p.isApproved && (
                          <span className="text-gray-500 text-sm italic">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
