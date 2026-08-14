"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function CreateAssessmentPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'EXAM',
    durationMin: 60,
    isManualStart: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Fetch teacher's courses to get the first courseId
      const coursesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      let courseId = "course-123";
      if (coursesRes.ok) {
        const coursesJson = await coursesRes.json();
        const courses = coursesJson.data?.items || coursesJson.items || coursesJson;
        if (courses.length > 0) courseId = courses[0].id;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          courseId,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          durationMin: Number(formData.durationMin),
          isManualStart: formData.isManualStart
        }),
      });

      if (res.ok) {
        const json = await res.json();
        router.push(`/teacher/assessments/${json.id}/builder`);
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to create assessment');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">

      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Back to Assessments</span>
          </button>

          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-8">
            Create New Assessment
          </h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="EXAM">Exam</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
                  placeholder="e.g., Midterm Examination"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
                  placeholder="Instructions for the students..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    name="durationMin"
                    min="1"
                    required
                    value={formData.durationMin}
                    onChange={handleChange}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-gray-900 p-4 rounded-lg border border-gray-700">
                <input
                  type="checkbox"
                  name="isManualStart"
                  id="isManualStart"
                  checked={formData.isManualStart}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <div className="flex flex-col">
                  <label htmlFor="isManualStart" className="text-sm font-medium text-white cursor-pointer">
                    Manual Start & Exam Arena
                  </label>
                  <span className="text-xs text-gray-400">
                    If enabled, students will join a waiting room and require manual approval before the exam starts.
                  </span>
                </div>
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-8 rounded-lg transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
              >
                {isSubmitting ? 'Creating...' : 'Create & Add Problems'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
