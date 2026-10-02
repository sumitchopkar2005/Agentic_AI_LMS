'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useCourseStore } from '@/stores/courses';
import { listAssignments, publishAssignment } from '@/lib/api/assignments';
import type { Assignment, Course } from '@/types/api';

interface ReviewItem {
  assignment: Assignment;
  courseName: string;
}

const typeConfig: Record<string, { color: string; emoji: string }> = {
  MCQ: { color: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20', emoji: '📝' },
  SCENARIO: { color: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20', emoji: '🎭' },
  CODE_LAB: { color: 'bg-accent-green/10 text-accent-green border-accent-green/20', emoji: '💻' },
  DEBATE: { color: 'bg-gold/10 text-gold border-gold/20', emoji: '⚖' },
  REVERSE_ESSAY: { color: 'bg-streak/10 text-streak border-streak/20', emoji: '📖' },
  CUSTOM: { color: 'bg-text-faint/10 text-text-faint border-text-faint/20', emoji: '📄' },
};

export default function ReviewQueuePage() {
  const token = useAuthStore((s) => s.token);
  const { courses, fetchCourses } = useCourseStore();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchCourses(token);
  }, [token, fetchCourses]);

  useEffect(() => {
    if (!token || courses.length === 0) return;
    setLoading(true);

    Promise.all(
      courses.map(async (course) => {
        const assignments = await listAssignments(course.id, token);
        return assignments
          .filter((a) => a.status === 'FACULTY_REVIEW')
          .map((a) => ({ assignment: a, courseName: course.title }));
      }),
    )
      .then((results) => setReviewItems(results.flat()))
      .finally(() => setLoading(false));
  }, [token, courses]);

  const handlePublish = async (assignmentId: string) => {
    if (!token) return;
    await publishAssignment(assignmentId, token);
    setReviewItems((prev) => prev.filter((item) => item.assignment.id !== assignmentId));
  };

  if (loading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">📜</span>
          <div className="label-overline text-accent-purple">Review Queue</div>
        </div>
        <h1 className="heading-section mb-8">Quest Approvals</h1>
        <div className="card text-center py-16 border border-gold/10">
          <div className="text-2xl mb-3 animate-pulse">📋</div>
          <p className="text-text-muted">Summoning review items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📜</span>
            <div className="label-overline text-accent-purple">Review Queue</div>
          </div>
          <h1 className="heading-section">Quest Approvals</h1>
          <p className="text-sm text-text-muted mt-1">
            AI-crafted quests awaiting your seal of approval
          </p>
        </div>
        {reviewItems.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/5 border border-gold/20">
            <span className="text-gold font-bold text-lg tabular-nums">{reviewItems.length}</span>
            <span className="text-xs text-text-faint">pending</span>
          </div>
        )}
      </div>

      {reviewItems.length === 0 ? (
        <div className="card text-center py-16 border border-accent-green/10">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-text-muted mb-1 font-medium">All quests approved!</p>
          <p className="text-sm text-text-faint">No assignments pending your review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewItems.map(({ assignment, courseName }, i) => {
            const tc = typeConfig[assignment.type] ?? typeConfig.CUSTOM;
            return (
              <div
                key={assignment.id}
                className="card overflow-hidden border border-surface-border hover:border-accent-purple/20 transition-all animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{tc.emoji}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tc.color}`}>
                        {assignment.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-text-faint">from <span className="text-accent-purple">{courseName}</span></span>
                    </div>
                    <h3 className="text-base font-semibold text-text-primary">{assignment.title}</h3>
                    {assignment.description && (
                      <p className="text-sm text-text-muted mt-0.5">{assignment.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setExpanded(expanded === assignment.id ? null : assignment.id)}
                      className="btn-ghost text-xs"
                    >
                      {expanded === assignment.id ? '▲ Collapse' : '▼ Preview'}
                    </button>
                    <button onClick={() => handlePublish(assignment.id)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                      <span>✓</span> Approve & Publish
                    </button>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1 text-text-faint">
                    <span className="text-accent-blue">⚡</span> Difficulty: {assignment.difficulty}/5
                  </span>
                  <span className="flex items-center gap-1 text-text-faint">
                    <span className="text-xp">✦</span> {assignment.max_xp} XP
                  </span>
                  <span className="flex items-center gap-1 text-text-faint">
                    <span className="text-gold">●</span> {assignment.max_gold} Gold
                  </span>
                  {assignment.concept_tags && assignment.concept_tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-text-faint">🏷</span>
                      {assignment.concept_tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay text-text-faint">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded content preview */}
                {expanded === assignment.id && assignment.content && (
                  <div className="mt-4 pt-4 border-t border-surface-border animate-fade-in">
                    <div className="label-overline mb-2">📋 Content Preview</div>
                    <div className="code-block text-xs max-h-60 overflow-y-auto">
                      {JSON.stringify(assignment.content, null, 2)}
                    </div>
                    {assignment.rubric && (
                      <>
                        <div className="label-overline mb-2 mt-4">📊 Rubric</div>
                        <div className="code-block text-xs max-h-40 overflow-y-auto">
                          {JSON.stringify(assignment.rubric, null, 2)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
