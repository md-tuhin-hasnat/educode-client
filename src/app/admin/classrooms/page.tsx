'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChalkboardTeacher,
  faPlus,
  faEdit,
  faTrashAlt,
  faUsers,
  faBookOpen,
  faUserGraduate,
  faSearch,
  faSpinner,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/config/api';
import { EnrollStudentsModal } from '@/components/EnrollStudentsModal';

interface Classroom {
  id: string;
  subjectCode: string;
  code: string;
  title: string;
  classCode: string;
  departmentId?: number | null;
  intakeId?: number | null;
  sectionId?: number | null;
  teacherId?: string | null;
  taId?: string | null;
  teacher?: { id: string; fullName: string; email: string } | null;
  ta?: { id: string; fullName: string; email: string } | null;
  intake?: { id: number; name: string } | null;
  section?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  _count?: {
    enrollments: number;
    materials: number;
    tasks: number;
  };
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export default function AdminClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<UserOption[]>([]);
  const [tas, setTas] = useState<UserOption[]>([]);
  const [departments, setDepartments] = useState<{ id: number; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [managingMembersClassroom, setManagingMembersClassroom] = useState<Classroom | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    subjectCode: '',
    code: '',
    title: '',
    teacherId: '',
    taId: '',
    departmentId: 1,
    intakeId: 1,
    sectionId: 1,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      const depts = Array.isArray(res.data) ? res.data : [];
      setDepartments(depts);
      if (depts.length > 0) {
        setFormData((prev) => ({
          ...prev,
          departmentId: prev.departmentId || depts[0].id,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses', { params: { search } });
      setClassrooms(res.data);
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users', { params: { limit: 200 } });
      const rawData = res.data?.data || res.data || {};
      const userList: UserOption[] = Array.isArray(rawData) ? rawData : (rawData.items || []);

      const normalizedUsers = userList.map((u) => ({
        ...u,
        role: (u.role || '').toLowerCase(),
      }));

      setTeachers(normalizedUsers.filter((u) => u.role === 'teacher' || u.role === 'admin'));
      setTas(normalizedUsers.filter((u) => u.role === 'teacher' || u.role === 'student' || u.role === 'ta' || u.role === 'admin'));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchClassrooms();
    fetchUsers();
    fetchDepartments();
  }, [fetchClassrooms, fetchUsers, fetchDepartments]);

  const openCreateModal = () => {
    setEditingClassroom(null);
    setFormData({
      subjectCode: '',
      code: '',
      title: '',
      teacherId: teachers[0]?.id || '',
      taId: '',
      departmentId: departments[0]?.id || 1,
      intakeId: 1,
      sectionId: 1,
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (c: Classroom) => {
    setEditingClassroom(c);
    setFormData({
      subjectCode: c.subjectCode || '',
      code: c.code || '',
      title: c.title || '',
      teacherId: c.teacherId || '',
      taId: c.taId || '',
      departmentId: c.departmentId || departments[0]?.id || 1,
      intakeId: c.intakeId || 1,
      sectionId: c.sectionId || 1,
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.subjectCode || !formData.code || !formData.title || !formData.teacherId) {
      setFormError('Subject Code, Course Code, Title, and Lead Teacher are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingClassroom) {
        await api.patch(`/courses/${editingClassroom.id}`, formData);
      } else {
        await api.post('/courses', formData);
      }
      setIsCreateModalOpen(false);
      fetchClassrooms();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save classroom.';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClassroom = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete classroom "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/courses/${id}`);
      fetchClassrooms();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete classroom.';
      alert(errorMsg);
    }
  };

  const openManageMembersModal = (c: Classroom) => {
    setManagingMembersClassroom(c);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Classroom Management Hub</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create institutional classrooms with subject codes, assign Lead Teachers, Teaching Assistants, and enroll students.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center space-x-2 transition-all self-start md:self-auto"
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Create New Classroom</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-slate-500 text-xs" />
          <input
            type="text"
            placeholder="Search by subject code, title, or class code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Classrooms Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-purple-400" />
          <p className="text-xs">Loading institutional classrooms...</p>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="py-16 text-center glass-panel rounded-2xl border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center text-xl">
            <FontAwesomeIcon icon={faBookOpen} />
          </div>
          <h3 className="text-sm font-bold text-white">No Classrooms Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No institutional classrooms match your criteria. Create a new classroom to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classrooms.map((c) => (
            <div
              key={c.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold">
                      {c.subjectCode || c.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {c.classCode}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
                      title="Edit Classroom"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDeleteClassroom(c.id, c.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs"
                      title="Delete Classroom"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-1">{c.title}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>Lead Instructor:</span>
                    <span className="font-semibold text-slate-200">{c.teacher?.fullName || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Teaching Assistant:</span>
                    <span className="font-semibold text-slate-200">
                      {c.ta?.fullName ? (
                        <span className="text-amber-400 flex items-center space-x-1">
                          <span>{c.ta.fullName}</span>
                          <span className="text-[9px] px-1 bg-amber-500/20 rounded">TA</span>
                        </span>
                      ) : (
                        'None'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="flex items-center space-x-1" title="Enrolled Students">
                    <FontAwesomeIcon icon={faUserGraduate} className="text-blue-400" />
                    <span>{c._count?.enrollments || 0}</span>
                  </span>
                  <span className="flex items-center space-x-1" title="Class Materials">
                    <FontAwesomeIcon icon={faBookOpen} className="text-emerald-400" />
                    <span>{c._count?.materials || 0}</span>
                  </span>
                  <span className="flex items-center space-x-1" title="Tasks/Exams">
                    <FontAwesomeIcon icon={faChalkboardTeacher} className="text-purple-400" />
                    <span>{c._count?.tasks || 0}</span>
                  </span>
                </div>

                <button
                  onClick={() => openManageMembersModal(c)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <FontAwesomeIcon icon={faUsers} />
                  <span>Members</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Classroom Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white">
                {editingClassroom ? 'Edit Classroom' : 'Create Institutional Classroom'}
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white text-sm">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveClassroom} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Subject Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-201"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Course Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE201-DS"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Classroom Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms Lab"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Department *</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  {departments.length === 0 ? (
                    <option value={1}>Default Department</option>
                  ) : (
                    departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Lead Instructor *</label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Select Instructor...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Teaching Assistant (TA)</label>
                  <select
                    value={formData.taId}
                    onChange={(e) => setFormData({ ...formData, taId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">No TA Assigned</option>
                    {tas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center space-x-1"
                >
                  {submitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  <span>{editingClassroom ? 'Update Classroom' : 'Create Classroom'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      <EnrollStudentsModal
        isOpen={!!managingMembersClassroom}
        onClose={() => setManagingMembersClassroom(null)}
        courseId={managingMembersClassroom?.id || ''}
        classroomTitle={managingMembersClassroom?.title || ''}
        subjectCode={managingMembersClassroom?.subjectCode || ''}
        onSuccess={() => fetchClassrooms()}
      />
    </div>
  );
}
