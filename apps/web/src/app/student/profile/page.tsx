'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useGamificationStore } from '@/stores/gamification';
import { getMyBadges } from '@/lib/api/gamification';
import type { Badge } from '@/types/api';

const TITLES: Record<number, string> = {
  1: 'Apprentice',
  2: 'Novice',
  3: 'Journeyman',
  4: 'Adept',
  5: 'Expert',
  6: 'Master',
  7: 'Grandmaster',
  8: 'Legend',
  9: 'Mythic',
  10: 'Ascended',
};

function getTitle(level: number) {
  if (level >= 10) return TITLES[10];
  return TITLES[level] || 'Apprentice';
}

export default function StudentProfile() {
  const { token, fullName } = useAuthStore();
  const { xp, gold, level, xpForNextLevel, currentStreak, longestStreak } = useGamificationStore();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const b = await getMyBadges(token);
        setBadges(b);
      } catch { /* no badges yet */ }
      setLoading(false);
    })();
  }, [token]);

  const xpProgress = xpForNextLevel > 0 ? Math.min(100, (xp / xpForNextLevel) * 100) : 0;
  const initials = (fullName || 'S').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const title = getTitle(level);

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="label-overline mb-1">Player Card</div>
      <h1 className="heading-section mb-6">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Player card + Stats */}
        <div className="lg:col-span-3 space-y-5">
          {/* Hero player card */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-accent-blue/20 bg-gradient-to-br from-surface-raised via-surface-overlay to-surface-raised">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-xp/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent-blue/10 to-transparent rounded-full blur-3xl" />

            <div className="relative p-6 flex items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center text-3xl font-black text-text-inverted shadow-lg shadow-accent-blue/20 animate-glow">
                  {initials}
                </div>
                {/* Level badge */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-gradient-to-br from-xp to-accent-blue flex items-center justify-center text-xs font-black text-text-inverted border-2 border-surface-raised shadow-lg animate-glow-xp">
                  {level}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text-primary">{fullName || 'Student'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-xp/10 text-xp border border-xp/20">
                    Lv. {level}
                  </span>
                  <span className="text-sm text-text-muted">{title}</span>
                </div>

                {/* XP Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-faint">Experience</span>
                    <span className="text-[10px] text-xp font-bold tabular-nums">{xp} / {xpForNextLevel}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-overlay overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-xp transition-all duration-1000 ease-out relative"
                      style={{ width: `${xpProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/10 animate-pulse-bar" />
                    </div>
                  </div>
                  <p className="text-[10px] text-text-faint mt-1">
                    {xpForNextLevel - xp} XP to Level {level + 1} — <span className="text-xp">{title}</span> → <span className="text-accent-blue">{getTitle(level + 1)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: xp, label: 'Total XP', icon: '✦', color: 'xp', glow: 'animate-glow-xp' },
              { value: gold, label: 'Gold', icon: '●', color: 'gold', glow: 'animate-glow-gold' },
              { value: currentStreak, label: 'Day Streak', icon: '🔥', color: 'streak', glow: '' },
              { value: longestStreak, label: 'Best Streak', icon: '⚡', color: 'accent-purple', glow: '' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`relative rounded-xl border border-${stat.color}/20 bg-${stat.color}/5 p-4 text-center group hover:border-${stat.color}/40 transition-all duration-200 ${stat.glow}`}
              >
                <div className="text-lg mb-1">{stat.icon}</div>
                <div className={`text-2xl font-black text-${stat.color} tabular-nums`}>{stat.value.toLocaleString()}</div>
                <div className="text-[10px] text-text-faint uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Battle stats */}
          <div className="rounded-xl border border-surface-border bg-surface-raised/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-border">
              <span className="text-xs font-semibold text-text-faint uppercase tracking-wider">Battle Stats</span>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-accent-green">{level}</div>
                <div className="text-[10px] text-text-faint mt-0.5">Current Level</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent-blue">{Math.floor(xp / 100)}</div>
                <div className="text-[10px] text-text-faint mt-0.5">Quests Done</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gold">{gold}</div>
                <div className="text-[10px] text-text-faint mt-0.5">Gold Earned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Badges & Achievements */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-border bg-surface-raised/50 overflow-hidden sticky top-6">
            <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
              <span className="text-base">🏅</span>
              <span className="text-xs font-semibold text-text-faint uppercase tracking-wider">Badges & Achievements</span>
              {badges.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold bg-gold/10 text-gold">{badges.length}</span>
              )}
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="relative h-8 w-8 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
                  </div>
                </div>
              ) : badges.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-surface-overlay flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl opacity-40">🏆</span>
                  </div>
                  <p className="text-sm text-text-muted">No badges earned yet</p>
                  <p className="text-xs text-text-faint mt-1">Complete missions to unlock achievements!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((badge, i) => (
                    <div
                      key={badge.id}
                      className="group relative rounded-xl border border-gold/20 bg-gold/5 p-3 text-center hover:border-gold/40 transition-all duration-200 hover:shadow-lg hover:shadow-gold/5 animate-bounce-in"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">{badge.icon || '🏅'}</div>
                      <div className="text-xs font-semibold text-text-primary">{badge.name}</div>
                      <div className="text-[10px] text-text-faint mt-0.5 line-clamp-2">{badge.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
