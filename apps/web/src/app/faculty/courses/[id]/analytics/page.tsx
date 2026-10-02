'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { getCourseSummary, getCourseHeatmap, getAtRiskStudents } from '@/lib/api/courses';

interface Summary {
  active_students: number;
  average_score: number;
  completion_rate: number;
  hint_usage_rate: number;
  at_risk_count: number;
}

interface ConceptMastery {
  concept_id: string;
  concept_name: string;
  mastery_level: number;
  student_count: number;
}

interface AtRiskStudent {
  student_id: string;
  full_name: string;
  risk_score: number;
  reasons: string[];
}

function MasteryBar({ level }: { level: number }) {
  const pct = Math.round(level * 100);
  const color = level >= 0.7 ? 'bg-accent-green' : level >= 0.4 ? 'bg-gold' : 'bg-streak';
  const emoji = level >= 0.7 ? '🟢' : level >= 0.4 ? '🟡' : '🔴';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px]">{emoji}</span>
      <div className="progress-track h-2 flex-1">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-faint tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function CourseAnalyticsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !courseId) return;
    setLoading(true);
    Promise.all([
      getCourseSummary(courseId, token).then(setSummary),
      getCourseHeatmap(courseId, token).then((data) => {
        setConcepts((data as { concepts: ConceptMastery[] }).concepts ?? []);
      }),
      getAtRiskStudents(courseId, token).then((data) => setAtRisk(data.students)),
    ]).finally(() => setLoading(false));
  }, [token, courseId]);

  if (loading) {
    return (
      <div className="card text-center py-16 border border-accent-purple/10">
        <div className="text-2xl mb-3 animate-pulse">📡</div>
        <p className="text-text-muted">Gathering intelligence...</p>
      </div>
    );
  }

  const summaryItems = summary
    ? [
        { label: 'Active Students', value: summary.active_students, icon: '⚔', color: 'text-accent-blue', border: 'border-accent-blue/20', bg: 'bg-accent-blue/5' },
        { label: 'Avg Score', value: `${Math.round(summary.average_score * 100)}%`, icon: '🎯', color: 'text-accent-green', border: 'border-accent-green/20', bg: 'bg-accent-green/5' },
        { label: 'Completion', value: `${Math.round(summary.completion_rate * 100)}%`, icon: '📈', color: 'text-accent-purple', border: 'border-accent-purple/20', bg: 'bg-accent-purple/5' },
        { label: 'Hint Usage', value: `${Math.round(summary.hint_usage_rate * 100)}%`, icon: '💡', color: 'text-gold', border: 'border-gold/20', bg: 'bg-gold/5' },
        { label: 'At Risk', value: summary.at_risk_count, icon: '🛡', color: summary.at_risk_count > 0 ? 'text-streak' : 'text-accent-green', border: summary.at_risk_count > 0 ? 'border-streak/20' : 'border-accent-green/20', bg: summary.at_risk_count > 0 ? 'bg-streak/5' : 'bg-accent-green/5' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {summaryItems.map((s, i) => (
            <div key={s.label} className={`card text-center border ${s.border} ${s.bg} animate-fade-in`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-text-faint mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Concept Mastery Heatmap */}
        <div className="card border border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span>🧠</span> Concept Mastery
          </h3>
          {concepts.length === 0 ? (
            <p className="text-sm text-text-faint text-center py-8">No concept data yet — upload scrolls and wait for students</p>
          ) : (
            <div className="space-y-3">
              {concepts.sort((a, b) => a.mastery_level - b.mastery_level).map((c) => (
                <div key={c.concept_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary truncate max-w-[60%]">{c.concept_name}</span>
                    <span className="text-[10px] text-text-faint">{c.student_count} students</span>
                  </div>
                  <MasteryBar level={c.mastery_level} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* At-Risk Students */}
        <div className="card border border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <span>🛡</span> At-Risk Students
            {atRisk.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-streak/10 text-streak border border-streak/20">
                {atRisk.length}
              </span>
            )}
          </h3>
          {atRisk.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm text-text-faint">No at-risk students — all players are thriving!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atRisk.map((student) => (
                <div key={student.student_id} className="p-3 rounded-lg bg-surface-overlay border-l-2 border-l-streak">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">{student.full_name}</span>
                    <span className={`text-xs font-bold tabular-nums ${
                      student.risk_score >= 0.7 ? 'text-streak' : 'text-gold'
                    }`}>
                      {Math.round(student.risk_score * 100)}% risk
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {student.reasons.map((reason, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-streak/5 text-streak/80">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Insights callout */}
      {summary && summary.at_risk_count > 0 && (
        <div className="callout-warning animate-fade-in">
          <div className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
            <span>🛡</span> Attention Needed
          </div>
          <p className="text-sm text-text-muted">
            {summary.at_risk_count} student{summary.at_risk_count > 1 ? 's are' : ' is'} at risk of falling behind.
            Consider reaching out or adjusting quest difficulty.
          </p>
        </div>
      )}
    </div>
  );
}
