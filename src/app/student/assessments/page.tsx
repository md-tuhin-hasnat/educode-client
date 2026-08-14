"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faFileAlt, faPlay, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export default function StudentAssessmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.token) {
      fetchAssessments();
    }
  }, [user]);

  const fetchAssessments = async () => {
    try {
      setIsLoading(true);
      // Fetch user's courses
      const coursesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (!coursesRes.ok) throw new Error('Failed to fetch courses');
      const coursesData = await coursesRes.json();
      const courses = coursesData.data?.items || coursesData.items || coursesData;

      let allAssessments: any[] = [];
      
      // Fetch assessments for each course
      for (const course of courses) {
        const assRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/course/${course.id}`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        if (assRes.ok) {
          const assData = await assRes.json();
          const items = assData.data?.items || assData.items || assData;
          allAssessments = [...allAssessments, ...items];
        }
      }

      setAssessments(allAssessments);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (assessment: any) => {
    if (assessment.isManualStart) {
      router.push(`/student/assessments/${assessment.id}/arena`);
    } else {
      router.push(`/student/assessments/${assessment.id}/solve`);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-8">
            My Assessments
          </h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {assessments.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <FontAwesomeIcon icon={faCheckCircle} className="mx-auto text-gray-500 mb-4 text-5xl" />
              <h2 className="text-xl font-medium text-white mb-2">No active assessments</h2>
              <p className="text-gray-400">You're all caught up! There are no exams or assignments currently available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((assessment: any) => {
                const isRunning = assessment.status === 'RUNNING';
                const isFinished = assessment.status === 'FINISHED';
                const isDraft = assessment.status === 'DRAFT';

                return (
                  <div key={assessment.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors flex flex-col">
                    <div className={`h-2 w-full ${
                      isRunning ? 'bg-green-500' : 
                      isFinished ? 'bg-gray-600' : 'bg-blue-500'
                    }`}></div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-gray-900 rounded-full text-xs font-medium text-gray-300 border border-gray-700">
                          {assessment.type}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          isRunning ? 'bg-green-500/20 text-green-400' :
                          isFinished ? 'bg-gray-700 text-gray-400' :
                          isDraft ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {assessment.status}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">{assessment.title}</h3>
                      <p className="text-gray-400 text-sm mb-6 flex-1 line-clamp-2">
                        {assessment.description || 'No description provided.'}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-300 mb-6 bg-gray-900/50 p-3 rounded-lg">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-400" />
                          <span>{assessment.durationMin} mins</span>
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-purple-400" />
                          <span>{assessment._count?.tasks || 0} Problems</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoin(assessment)}
                        disabled={isFinished || isDraft}
                        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${
                          isFinished || isDraft
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20'
                        }`}
                      >
                        {isFinished ? (
                          <span>Completed</span>
                        ) : assessment.isManualStart ? (
                          <>
                            <FontAwesomeIcon icon={faPlay} />
                            <span>Join Arena</span>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPlay} />
                            <span>Start Solving</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
