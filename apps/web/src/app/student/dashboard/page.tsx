'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useGamificationStore } from '@/stores/gamification';

import { listStudentCourses } from '@/lib/api/courses';
import { listAssignments, getMyCourseSubmissions } from '@/lib/api/assignments';
import type { Course, Assignment, Submission, AssignmentType } from '@/types/api';

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  MCQ: { label: 'MCQ', icon: '◈', color: 'accent-blue' },
  SCENARIO: { label: 'Scenario', icon: '◆', color: 'accent-purple' },
  CODE_LAB: { label: 'Code Lab', icon: '⟨⟩', color: 'accent-cyan' },
  DEBATE: { label: 'Debate', icon: '⚔', color: 'accent-orange' },
  REVERSE_ESSAY: { label: 'Reverse Essay', icon: '✎', color: 'accent-green' },
  CUSTOM: { label: 'Custom', icon: '★', color: 'accent-pink' },
};

export default function StudentDashboard() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { xp, gold, currentStreak } = useGamificationStore();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<AssignmentType | 'ALL'>('ALL');

  // Fetch courses
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const c = await listStudentCourses(token);
        setCourses(c);
        if (c.length > 0) {
          setSelectedCourse(c[0].id);
          useAuthStore.getState().setCourseId(c[0].id);
        }
      } catch { /* */ }
      setLoading(false);
    })();
  }, [token]);

  // Fetch assignments + submissions when course changes
  useEffect(() => {
    if (!token || !selectedCourse) return;
    (async () => {
      try {
        const [a, s] = await Promise.all([
          listAssignments(selectedCourse, token),
          getMyCourseSubmissions(selectedCourse, token),
        ]);
        setAssignments(a);
        setSubmissions(s);
      } catch {
        setAssignments([]);
        setSubmissions([]);
      }
    })();
  }, [token, selectedCourse]);

  // Build solved set: assignment IDs that have a correct submission
  const solvedSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of submissions) {
      const grade = s.ai_grade as Record<string, unknown> | null;
      if (grade?.correct === true) set.add(s.assignment_id);
    }
    return set;
  }, [submissions]);

  // Build attempted set: assignment IDs that have any submission
  const attemptedSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of submissions) set.add(s.assignment_id);
    return set;
  }, [submissions]);

  // Types that exist in the current assignments
  const availableTypes = useMemo(() => {
    const types = new Set(assignments.map((a) => a.type));
    return Array.from(types) as AssignmentType[];
  }, [assignments]);

  // Filtered assignments
  const filtered = activeType === 'ALL' ? assignments : assignments.filter((a) => a.type === activeType);

  // Group by unit
  const unitGroups = filtered.reduce<Record<string, Assignment[]>>((acc, a) => {
    const key = a.unit_number ? `Unit ${a.unit_number}: ${a.unit_name || ''}` : 'General';
    (acc[key] ||= []).push(a);
    return acc;
  }, {});

  // Stats per type
  const typeStats = useMemo(() => {
    const stats: Record<string, { total: number; solved: number }> = {};
    for (const a of assignments) {
      if (!stats[a.type]) stats[a.type] = { total: 0, solved: 0 };
      stats[a.type].total++;
      if (solvedSet.has(a.id)) stats[a.type].solved++;
    }
    return stats;
  }, [assignments, solvedSet]);

  const totalSolved = [...solvedSet].filter((id) => assignments.some((a) => a.id === id)).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="label-overline mb-1">Your Journey</div>
          <h1 className="heading-section">Missions</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="stat-pill">
            <span className="text-xp">✦</span>
            <span className="text-xp font-bold">{xp} XP</span>
          </div>
          <div className="stat-pill">
            <span className="text-gold">●</span>
            <span className="text-gold font-bold">{gold}</span>
          </div>
          <div className="stat-pill">
            <span>🔥</span>
            <span className="text-streak font-bold">{currentStreak}</span>
          </div>
        </div>
      </div>

      {/* Course selector */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-text-faint">Course:</span>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedCourse(c.id); setActiveType('ALL'); useAuthStore.getState().setCourseId(c.id); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedCourse === c.id
                  ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                  : 'border-border text-text-faint hover:text-text-muted'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
            <div className="absolute inset-0 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-text-muted">Loading missions...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && assignments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-muted">No missions available yet</p>
          <p className="text-xs text-text-faint mt-1">Your instructor will publish assignments soon.</p>
        </div>
      )}

      {/* Type tabs + content */}
      {!loading && assignments.length > 0 && (
        <>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-text-faint">Overall Progress</span>
              <span className="text-xs font-bold text-accent-green">{totalSolved}/{assignments.length} completed</span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-overlay overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-green to-accent-blue transition-all duration-700 ease-out"
                style={{ width: `${assignments.length > 0 ? (totalSolved / assignments.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 flex-wrap">
            {/* ALL tab */}
            <button
              onClick={() => setActiveType('ALL')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 shrink-0 ${
                activeType === 'ALL'
                  ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                  : 'border-border text-text-faint hover:text-text-muted hover:border-border'
              }`}
            >
              <span>All</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                activeType === 'ALL' ? 'bg-accent-blue/20' : 'bg-surface-overlay'
              }`}>
                {totalSolved}/{assignments.length}
              </span>
            </button>

            {availableTypes.map((type) => {
              const meta = TYPE_META[type] || { label: type, icon: '?', color: 'accent-blue' };
              const stats = typeStats[type] || { total: 0, solved: 0 };
              const isActive = activeType === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 shrink-0 ${
                    isActive
                      ? `bg-${meta.color}/10 text-${meta.color} border-${meta.color}/30`
                      : 'border-border text-text-faint hover:text-text-muted hover:border-border'
                  }`}
                >
                  <span className="text-sm">{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? `bg-${meta.color}/20` : 'bg-surface-overlay'
                  }`}>
                    {stats.solved}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Assignments list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-text-faint">No missions of this type.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(unitGroups).map(([unitLabel, unitAssignments]) => (
                <div key={unitLabel}>
                  <h2 className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-4 h-px bg-surface-border" />
                    {unitLabel}
                    <span className="text-[10px] text-text-faint font-normal">
                      ({unitAssignments.filter((a) => solvedSet.has(a.id)).length}/{unitAssignments.length})
                    </span>
                    <span className="flex-1 h-px bg-surface-border" />
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {unitAssignments.map((assignment) => {
                      const solved = solvedSet.has(assignment.id);
                      const attempted = attemptedSet.has(assignment.id);
                      const meta = TYPE_META[assignment.type] || { label: assignment.type, icon: '?', color: 'accent-blue' };
                      const diffStars = Array.from({ length: 5 }, (_, i) => i < assignment.difficulty);
                      return (
                        <div
                          key={assignment.id}
                          onClick={() => router.push(`/student/assignments/${assignment.id}`)}
                          className={`group relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                            solved
                              ? 'border-accent-green/30 bg-accent-green/5 hover:border-accent-green/50 hover:shadow-accent-green/10'
                              : attempted
                              ? 'border-accent-orange/30 bg-accent-orange/5 hover:border-accent-orange/50 hover:shadow-accent-orange/10'
                              : 'border-border bg-surface-raised hover:border-accent-blue/40 hover:shadow-accent-blue/10'
                          }`}
                        >
                          {/* Status indicator */}
                          <div className="absolute top-3 right-3">
                            {solved ? (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-green/20 text-accent-green text-xs">✓</span>
                            ) : attempted ? (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-orange/20 text-accent-orange text-[10px]">…</span>
                            ) : (
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-overlay text-text-faint">
                                <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                              </span>
                            )}
                          </div>

                          {/* Type badge + difficulty */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold bg-${meta.color}/10 text-${meta.color}`}>
                              {meta.icon} {meta.label}
                            </span>
                            <div className="flex items-center gap-px">
                              {diffStars.map((filled, i) => (
                                <svg key={i} className={`w-2.5 h-2.5 ${filled ? 'text-gold' : 'text-surface-border'}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className={`text-sm font-semibold leading-snug mb-2 pr-8 ${
                            solved ? 'text-text-muted line-through decoration-accent-green/40' : 'text-text-primary'
                          } group-hover:text-accent-blue transition-colors`}>
                            {assignment.title}
                          </h3>

                          {/* Rewards */}
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-xp">
                              <span>✦</span> {assignment.max_xp}
                            </span>
                            {assignment.max_gold > 0 && (
                              <span className="flex items-center gap-1 text-gold">
                                <span>●</span> {assignment.max_gold}
                              </span>
                            )}
                            {assignment.concept_tags && assignment.concept_tags.length > 0 && (
                              <span className="text-text-faint truncate max-w-[120px]">
                                {assignment.concept_tags[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
