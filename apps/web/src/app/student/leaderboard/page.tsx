'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { listStudentCourses } from '@/lib/api/courses';
import { getLeaderboard } from '@/lib/api/gamification';
import type { Course, Leaderboard } from '@/types/api';

export default function LeaderboardPage() {
  const { token, userId } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const c = await listStudentCourses(token);
        setCourses(c);
        if (c.length > 0) setSelectedCourse(c[0].id);
      } catch { /* */ }
      setLoading(false);
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCourse) return;
    (async () => {
      try {
        const lb = await getLeaderboard(selectedCourse, token);
        setLeaderboard(lb);
      } catch {
        setLeaderboard(null);
      }
    })();
  }, [token, selectedCourse]);

  const podiumColors = [
    { bg: 'from-gold/20 to-gold/5', border: 'border-gold/40', text: 'text-gold', glow: 'shadow-gold/20' },
    { bg: 'from-text-muted/15 to-text-muted/5', border: 'border-text-muted/30', text: 'text-text-muted', glow: 'shadow-text-muted/10' },
    { bg: 'from-streak/15 to-streak/5', border: 'border-streak/30', text: 'text-streak', glow: 'shadow-streak/10' },
  ];
  const rankIcons = ['🥇', '🥈', '🥉'];

  const top3 = leaderboard?.entries.slice(0, 3) || [];
  const rest = leaderboard?.entries.slice(3) || [];

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="label-overline mb-1">Arena</div>
          <h1 className="heading-section flex items-center gap-3">
            <span>Leaderboard</span>
            <span className="text-2xl animate-bounce-in">🏆</span>
          </h1>
        </div>
        {leaderboard?.my_rank !== null && leaderboard?.my_rank !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border border-accent-blue/20">
            <span className="text-xs text-text-faint">Your Rank</span>
            <span className="text-lg font-black text-accent-blue">#{leaderboard.my_rank}</span>
          </div>
        )}
      </div>

      {/* Course selector */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-text-faint">Course:</span>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id)}
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

      {loading ? (
        <div className="text-center py-20">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
            <div className="absolute inset-0 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-text-muted">Loading arena...</p>
        </div>
      ) : !leaderboard || leaderboard.entries.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏟️</span>
          </div>
          <p className="text-sm font-medium text-text-muted">The arena is empty</p>
          <p className="text-xs text-text-faint mt-1">Complete missions to claim your spot!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Podium — Top 3 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              {/* Reorder: 2nd, 1st, 3rd for podium layout */}
              {[top3[1], top3[0], top3[2]].map((entry, visualIdx) => {
                if (!entry) return <div key={visualIdx} />;
                const actualRank = entry.rank - 1;
                const colors = podiumColors[actualRank] || podiumColors[2];
                const isMe = entry.student_id === userId;
                const heights = ['h-28', 'h-36', 'h-24'];
                return (
                  <div
                    key={entry.student_id}
                    className={`relative flex flex-col items-center animate-bounce-in`}
                    style={{ animationDelay: `${visualIdx * 0.15}s` }}
                  >
                    {/* Medal */}
                    <span className="text-3xl mb-2">{rankIcons[actualRank]}</span>
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} border-2 ${colors.border} flex items-center justify-center text-lg font-bold ${colors.text} mb-2 shadow-lg ${colors.glow}`}>
                      {(entry.full_name || '?')[0].toUpperCase()}
                    </div>
                    {/* Name */}
                    <span className={`text-xs font-semibold text-center truncate w-full px-2 ${isMe ? 'text-accent-blue' : 'text-text-primary'}`}>
                      {entry.full_name}
                      {isMe && <span className="text-[9px] text-accent-blue ml-1">(You)</span>}
                    </span>
                    {/* XP */}
                    <span className={`text-xs font-bold mt-1 ${colors.text}`}>
                      {entry.xp_total.toLocaleString()} XP
                    </span>
                    {/* Podium bar */}
                    <div className={`w-full ${heights[visualIdx]} mt-2 rounded-t-xl bg-gradient-to-t ${colors.bg} border-t-2 border-x-2 ${colors.border}`} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest of rankings */}
          {rest.length > 0 && (
            <div className="rounded-xl border border-surface-border overflow-hidden bg-surface-raised/50">
              <div className="px-5 py-3 border-b border-surface-border">
                <div className="flex items-center justify-between text-[10px] text-text-faint uppercase tracking-wider">
                  <span>Rank</span>
                  <span>XP Earned</span>
                </div>
              </div>
              <div className="divide-y divide-surface-border/50">
                {rest.map((entry, i) => {
                  const isMe = entry.student_id === userId;
                  return (
                    <div
                      key={entry.student_id}
                      className={`flex items-center justify-between px-5 py-3 transition-all duration-200 animate-slide-up ${
                        isMe ? 'bg-accent-blue/5 border-l-2 border-l-accent-blue' : 'hover:bg-surface-overlay'
                      }`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-8 text-center">
                          <span className="text-xs font-bold text-text-faint">#{entry.rank}</span>
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center text-xs font-bold text-text-muted">
                          {(entry.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${isMe ? 'text-accent-blue' : 'text-text-primary'}`}>
                            {entry.full_name}
                          </span>
                          {isMe && <span className="text-[10px] text-accent-blue ml-1.5 font-bold">(You)</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xp text-xs">✦</span>
                        <span className="text-sm font-bold text-text-primary tabular-nums">
                          {entry.xp_total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
