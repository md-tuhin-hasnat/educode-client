"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faCheck, faPlay, faClock } from '@fortawesome/free-solid-svg-icons';

export default function AssessmentBuilderPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [courseTasks, setCourseTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.token && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch assessment details
      const assRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      
      if (!assRes.ok) throw new Error('Failed to fetch assessment');
      const assData = await assRes.json();
      setAssessment(assData);

      // Fetch all tasks for the course
      const tasksRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/course/${assData.courseId}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      
      if (tasksRes.ok) {
        const tasksJson = await tasksRes.json();
        setCourseTasks(tasksJson.data?.items || tasksJson.items || tasksJson);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (taskId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments/${id}/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        // Refresh
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add task');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoToArena = () => {
    router.push(`/teacher/assessments/${id}/arena`);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500">{error}</div>;
  }

  // Determine which tasks are already added
  const addedTaskIds = new Set(assessment?.tasks?.map((t: any) => t.id) || []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/teacher/assessments')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Assessments</span>
          </button>
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Builder: {assessment?.title}
              </h1>
              <p className="text-gray-400 mt-2 flex items-center space-x-4">
                <span className="capitalize">{assessment?.type.toLowerCase()}</span>
                <span>•</span>
                <span className="flex items-center"><FontAwesomeIcon icon={faClock} className="mr-1"/> {assessment?.durationMin} mins</span>
              </p>
            </div>
            
            {assessment?.isManualStart && (
              <button
                onClick={handleGoToArena}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-purple-500/20"
              >
                <FontAwesomeIcon icon={faPlay} />
                <span>Open Exam Arena</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Added Problems List */}
            <div className="lg:col-span-1 bg-gray-800 rounded-xl p-6 border border-gray-700 h-fit">
              <h2 className="text-xl font-semibold mb-4 text-white">Selected Problems</h2>
              {assessment?.tasks?.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No problems added yet.</p>
              ) : (
                <div className="space-y-3">
                  {assessment?.tasks?.map((task: any, index: number) => (
                    <div key={task.id} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                      <div className="text-xs text-blue-400 font-bold mb-1">Problem {index + 1}</div>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-gray-500 mt-1 capitalize">{task.difficulty?.toLowerCase()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Course Problems */}
            <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Problem Bank</h2>
              
              <div className="space-y-4">
                {courseTasks.length === 0 ? (
                  <p className="text-gray-500">No tasks found in this course.</p>
                ) : (
                  courseTasks.map((task: any) => {
                    const isAdded = addedTaskIds.has(task.id);
                    return (
                      <div key={task.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 flex justify-between items-center hover:border-gray-600 transition-colors">
                        <div>
                          <h3 className="font-medium text-white">{task.title}</h3>
                          <div className="flex space-x-3 mt-1 text-xs text-gray-400">
                            <span className="capitalize">{task.difficulty?.toLowerCase()}</span>
                            <span>•</span>
                            <span>{task.points || 100} points</span>
                          </div>
                        </div>
                        <button
                          onClick={() => !isAdded && handleAddTask(task.id)}
                          disabled={isAdded}
                          className={`flex items-center space-x-1 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                            isAdded 
                              ? 'bg-gray-800 text-green-400 cursor-default border border-gray-700' 
                              : 'bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 hover:border-blue-500'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <FontAwesomeIcon icon={faCheck} />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faPlus} />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
