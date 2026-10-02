'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCourseStore } from '@/stores/courses';
import { useAuthStore } from '@/stores/auth';
import type { Course } from '@/types/api';

function StatusBadge({ status }: { status: Course['status'] }) {
  const styles = {
    SETUP: 'bg-gold/10 border-gold/20 text-gold',
    ACTIVE: 'bg-accent-green/10 border-accent-green/20 text-accent-green',
    ARCHIVED: 'bg-text-faint/10 border-text-faint/20 text-text-faint',
  };
  const icons = { SETUP: '🔧', ACTIVE: '✅', ARCHIVED: '📦' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      <span className="text-[10px]">{icons[status]}</span>
      {status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />}
      {status}
    </span>
  );
}

function CreateCourseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { createCourse, loading } = useCourseStore();
  const token = useAuthStore((s) => s.token);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !token) return;
    try {
      await createCourse({ title: title.trim(), description: description.trim() || undefined }, token);
      setTitle('');
      setDescription('');
      onClose();
    } catch {
      // error is in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-raised border border-accent-purple/20 p-8 shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-lg">📖</div>
          <div>
            <div className="label-overline text-accent-purple">New Realm</div>
            <h2 className="heading-section">Create Course</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Course Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="w-full px-4 py-2.5 rounded-lg text-sm text-text-primary bg-surface-overlay
                         border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/40
                         focus:border-accent-purple/60 placeholder:text-text-faint transition-all duration-200"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief course description..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg text-sm text-text-primary bg-surface-overlay
                         border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/40
                         focus:border-accent-purple/60 placeholder:text-text-faint transition-all duration-200 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={!title.trim() || loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Forging...' : '⚒ Forge Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FacultyDashboard() {
  const token = useAuthStore((s) => s.token);
  const { courses, dashboardStats, fetchCourses, fetchDashboardStats, loading } = useCourseStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchCourses(token);
      fetchDashboardStats(token);
    }
  }, [token, fetchCourses, fetchDashboardStats]);

  const stats = [
    { label: 'Active Realms', value: dashboardStats?.active_courses ?? courses.length, icon: '🏰', color: 'text-accent-blue', border: 'border-accent-blue/20', bg: 'bg-accent-blue/5' },
    { label: 'Enrolled Students', value: dashboardStats?.total_students ?? 0, icon: '⚔', color: 'text-accent-purple', border: 'border-accent-purple/20', bg: 'bg-accent-purple/5' },
    { label: 'Pending Review', value: dashboardStats?.pending_reviews ?? 0, icon: '📜', color: 'text-gold', border: 'border-gold/20', bg: 'bg-gold/5' },
    { label: 'At-Risk Players', value: dashboardStats?.at_risk_count ?? 0, icon: '🛡', color: 'text-streak', border: 'border-streak/20', bg: 'bg-streak/5' },
  ];

  return (
    <div className="p-8 animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🏰</span>
          <div className="label-overline text-accent-purple">Command Center</div>
        </div>
        <h1 className="heading-section">Guild Master Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Manage your realms, review quests, and track your students&apos; progress</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`card border ${stat.border} ${stat.bg} animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
            </div>
            <div className="text-xs text-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Course grid */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <div className="label-overline">Your Realms</div>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs px-4 py-2">
          ⚒ Forge New Realm
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Create new course card */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="group card card-hover flex flex-col items-center justify-center min-h-[220px]
                     border-dashed border-accent-purple/20 hover:border-accent-purple/40
                     cursor-pointer transition-all duration-300"
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 flex items-center justify-center
                          mb-4 group-hover:from-accent-purple/20 group-hover:to-accent-blue/20 transition-all duration-300">
            <span className="text-2xl group-hover:scale-110 transition-transform">⚒</span>
          </div>
          <span className="text-sm font-semibold text-text-muted group-hover:text-accent-purple transition-colors">
            Forge New Realm
          </span>
          <span className="text-xs text-text-faint mt-1">Upload materials & configure</span>
        </button>

        {/* Real course cards */}
        {courses.map((course, i) => (
          <Link
            key={course.id}
            href={`/faculty/courses/${course.id}`}
            className="card card-hover relative overflow-hidden group border border-surface-border hover:border-accent-purple/30 animate-fade-in"
            style={{ animationDelay: `${(i + 1) * 60}ms` }}
          >
            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-purple via-accent-blue to-accent-green opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Status indicator */}
            <div className="absolute top-4 right-4">
              <StatusBadge status={course.status} />
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-accent-purple transition-colors pr-24">
                {course.title}
              </h3>
              {course.description && (
                <p className="text-sm text-text-muted line-clamp-2">{course.description}</p>
              )}
            </div>

            {/* Config pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                🎮 {course.gamification_level}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                📊 {course.grading_strictness}
              </span>
              {course.hints_enabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                  💡 Hints
                </span>
              )}
            </div>

            {/* Bottom section */}
            <div className="mt-auto pt-4 border-t border-surface-border flex items-center justify-between">
              <span className="text-xs text-text-faint group-hover:text-accent-purple transition-colors">
                {course.status === 'SETUP' ? '🔧 Upload materials to begin' : '→ Enter realm'}
              </span>
            </div>
          </Link>
        ))}

        {/* Empty state */}
        {courses.length === 0 && !loading && (
          <div className="col-span-2 card flex flex-col items-center justify-center py-12 text-center border border-dashed border-surface-border">
            <div className="text-4xl mb-4">🏰</div>
            <p className="text-text-muted mb-1">No realms yet</p>
            <p className="text-sm text-text-faint">Forge your first course realm to get started</p>
          </div>
        )}
      </div>

      <CreateCourseModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
