"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faClock, faUsers, faCog, faPlay } from '@fortawesome/free-solid-svg-icons';


export default function AssessmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hardcode a default courseId for now, normally fetched from context/props
  const defaultCourseId = "course-123"; 

  useEffect(() => {
    if (!user?.token) return;
    
    // In a real app we'd fetch courses, then select one. For this demo we'll fetch all.
    // Wait, our backend expects courseId in GET /api/v1/assessments/course/:courseId
    // Let's just fetch from an endpoint if we had it, but for now we might need to get teacher courses first.
    const fetchAssessments = async () => {
      try {
        // Fetch teacher's courses to get the first courseId
        const coursesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (coursesRes.ok) {
          const coursesJson = await coursesRes.json();
          const courses = coursesJson.data?.items || coursesJson.items || coursesJson;
          if (courses.length > 0) {
            const courseId = courses[0].id;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/course/${courseId}`, {
              headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
              const json = await res.json();
              setAssessments(json);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessments();
  }, [user?.token]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Assessments & Exams
            </h1>
            <button
              onClick={() => router.push('/teacher/assessments/create')}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Create New</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : assessments.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faCog} className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No Assessments Found</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Create your first exam or assignment to get started. You can add multiple programming problems and control the exam environment.
              </p>
              <button
                onClick={() => router.push('/teacher/assessments/create')}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Assessment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all flex flex-col group">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded bg-opacity-20 ${
                      assessment.type === 'EXAM' ? 'bg-red-500 text-red-400' : 'bg-green-500 text-green-400'
                    }`}>
                      {assessment.type}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 font-mono">
                      {assessment.status}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 truncate">{assessment.title}</h3>
                  <p className="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow">
                    {assessment.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-xs">Problems</span>
                      <span className="font-medium flex items-center space-x-1">
                        <span>{assessment._count?.tasks || 0}</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-500 text-xs">Duration</span>
                      <span className="font-medium flex items-center space-x-1">
                        <FontAwesomeIcon icon={faClock} className="text-gray-400 w-3 h-3" />
                        <span>{assessment.durationMin ? `${assessment.durationMin}m` : 'N/A'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => router.push(`/teacher/assessments/${assessment.id}/builder`)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Builder
                    </button>
                    {assessment.type === 'EXAM' && assessment.status !== 'FINISHED' && (
                      <button
                        onClick={() => router.push(`/teacher/assessments/${assessment.id}/arena`)}
                        className="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 py-2 rounded text-sm font-medium transition-colors border border-blue-500/30 flex items-center justify-center space-x-1"
                      >
                        <FontAwesomeIcon icon={faPlay} />
                        <span>Arena</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
