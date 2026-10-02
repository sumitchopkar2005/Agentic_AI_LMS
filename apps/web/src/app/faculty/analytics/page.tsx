'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useCourseStore } from '@/stores/courses';
import { getCourseSummary } from '@/lib/api/courses';

interface CourseSummary {
  courseId: string;
  courseName: string;
  active_students: number;
  average_score: number;
  completion_rate: number;
  at_risk_count: number;
}

export default function FacultyAnalyticsPage() {
  const token = useAuthStore((s) => s.token);
  const { courses, fetchCourses } = useCourseStore();
  const [summaries, setSummaries] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchCourses(token);
  }, [token, fetchCourses]);

  useEffect(() => {
    if (!token || courses.length === 0) return;
    setLoading(true);
    Promise.all(
      courses.map(async (course) => {
        try {
          const data = await getCourseSummary(course.id, token);
          return {
            courseId: course.id,
            courseName: course.title,
            active_students: data.active_students,
            average_score: data.average_score,
            completion_rate: data.completion_rate,
            at_risk_count: data.at_risk_count,
          };
        } catch {
          return null;
        }
      }),
    )
      .then((results) => setSummaries(results.filter(Boolean) as CourseSummary[]))
      .finally(() => setLoading(false));
  }, [token, courses]);

  const totalStudents = summaries.reduce((s, c) => s + c.active_students, 0);
  const totalAtRisk = summaries.reduce((s, c) => s + c.at_risk_count, 0);
  const avgScore = summaries.length
    ? summaries.reduce((s, c) => s + c.average_score, 0) / summaries.length
    : 0;

  const aggStats = [
    { label: 'Realms', value: courses.length, icon: '🏰', color: 'text-accent-blue', border: 'border-accent-blue/20', bg: 'bg-accent-blue/5' },
    { label: 'Total Students', value: totalStudents, icon: '⚔', color: 'text-accent-purple', border: 'border-accent-purple/20', bg: 'bg-accent-purple/5' },
    { label: 'Avg Score', value: `${Math.round(avgScore * 100)}%`, icon: '🎯', color: 'text-accent-green', border: 'border-accent-green/20', bg: 'bg-accent-green/5' },
    { label: 'At Risk', value: totalAtRisk, icon: '🛡', color: totalAtRisk > 0 ? 'text-streak' : 'text-accent-green', border: totalAtRisk > 0 ? 'border-streak/20' : 'border-accent-green/20', bg: totalAtRisk > 0 ? 'bg-streak/5' : 'bg-accent-green/5' },
  ];

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📡</span>
          <div className="label-overline text-accent-purple">Intelligence</div>
        </div>
        <h1 className="heading-section">Intel Reports</h1>
        <p className="text-sm text-text-muted mt-1">Aggregate analytics across all your realms</p>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {aggStats.map((stat, i) => (
          <div key={stat.label} className={`card text-center border ${stat.border} ${stat.bg} animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-text-faint mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Per-course breakdown */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <div className="label-overline">Realm Breakdown</div>
      </div>
      {loading ? (
        <div className="card text-center py-12 border border-accent-purple/10">
          <div className="text-2xl mb-3 animate-pulse">📊</div>
          <p className="text-text-muted">Gathering intel...</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="card text-center py-12 border border-dashed border-surface-border">
          <div className="text-4xl mb-4">📡</div>
          <p className="text-text-muted">No analytics data yet</p>
          <p className="text-sm text-text-faint">Create courses and wait for student activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s, i) => (
            <Link
              key={s.courseId}
              href={`/faculty/courses/${s.courseId}/analytics`}
              className="card card-hover flex items-center gap-6 !p-4 border border-surface-border hover:border-accent-purple/20 transition-all animate-fade-in group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-purple transition-colors">{s.courseName}</h3>
              </div>
              <div className="flex items-center gap-6 text-xs shrink-0">
                <div className="text-center">
                  <div className="font-bold text-accent-blue tabular-nums">{s.active_students}</div>
                  <div className="text-text-faint">⚔ students</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-accent-green tabular-nums">{Math.round(s.average_score * 100)}%</div>
                  <div className="text-text-faint">🎯 avg score</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-accent-purple tabular-nums">{Math.round(s.completion_rate * 100)}%</div>
                  <div className="text-text-faint">📈 completion</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold tabular-nums ${s.at_risk_count > 0 ? 'text-streak' : 'text-accent-green'}`}>
                    {s.at_risk_count}
                  </div>
                  <div className="text-text-faint">🛡 at risk</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Warning callout */}
      {totalAtRisk > 0 && (
        <div className="callout-warning mt-6 animate-fade-in">
          <div className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
            <span>🛡</span> Attention Required
          </div>
          <p className="text-sm text-text-muted">
            {totalAtRisk} student{totalAtRisk > 1 ? 's are' : ' is'} at risk across your realms. Consider reviewing their progress and adjusting difficulty.
          </p>
        </div>
      )}
    </div>
  );
}
