'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useGamificationStore } from '@/stores/gamification';
import MascotSidebar from '@/components/mascot/MascotSidebar';

const navItems = [
  { label: 'Missions', href: '/student/dashboard', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', emoji: '⚔' },
  { label: 'AI Tutor', href: '/student/tutor', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', emoji: '🧙' },
  { label: 'Leaderboard', href: '/student/leaderboard', icon: 'M3 10h4v10H3zM10 3h4v17h-4zM17 7h4v13h-4z', emoji: '🏆' },
  { label: 'Profile', href: '/student/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', emoji: '🎭' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, fullName, clearAuth } = useAuthStore();
  const { xp, gold, level, xpForNextLevel, currentStreak, fetchProfile } = useGamificationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    fetchProfile(token);
  }, [mounted, token, router, fetchProfile]);

  if (!mounted || !token) return null;

  function isActive(href: string) {
    if (href === '/student/dashboard') {
      return pathname === href || pathname.startsWith('/student/assignments');
    }
    return pathname.startsWith(href);
  }

  const xpProgress = xpForNextLevel > 0 ? Math.min(100, (xp / xpForNextLevel) * 100) : 0;
  const initials = (fullName || 'S').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <nav className="fixed top-0 left-0 h-full w-64 flex flex-col border-r border-surface-border bg-surface-raised/50 backdrop-blur-sm z-30">
        {/* Logo */}
        <div className="p-6 pb-4">
          <Link href="/student/dashboard" className="block group">
            <div className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl group-hover:animate-bounce-in">⚡</span>
              <span className="bg-gradient-brand bg-clip-text text-transparent">Agentic</span>
              <span className="text-text-muted ml-0.5 font-normal">LMS</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <span className="label-overline text-accent-green">Player Online</span>
          </div>
        </div>

        {/* Level badge */}
        <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-gradient-to-r from-xp/5 to-accent-blue/5 border border-xp/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-xp to-accent-blue flex items-center justify-center text-sm font-black text-text-inverted animate-glow-xp">
                {level}
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-green border-2 border-surface-raised" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-text-faint uppercase tracking-wider">Level {level}</div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-xp transition-all duration-700 ease-out"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <div className="text-[9px] text-text-faint mt-0.5">{xp} / {xpForNextLevel} XP</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  active
                    ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20 shadow-sm shadow-accent-blue/5'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay border border-transparent'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{item.emoji}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Inventory panel */}
        <div className="mx-3 mb-3 rounded-xl border border-surface-border bg-surface-overlay/50 overflow-hidden">
          <div className="px-4 py-2 border-b border-surface-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">Inventory</span>
          </div>
          <div className="p-3 space-y-2.5">
            {/* XP */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-xp/10 text-xp text-sm animate-glow-xp">✦</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-xp">{xp} XP</div>
              </div>
            </div>
            {/* Gold */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold/10 text-gold text-sm animate-glow-gold">●</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-gold">{gold} Gold</div>
              </div>
            </div>
            {/* Streak */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-streak/10 text-sm">🔥</span>
              <div className="flex-1">
                <div className={`text-xs font-bold ${currentStreak > 0 ? 'text-streak' : 'text-text-faint'}`}>
                  {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <MascotSidebar />

        {/* User / Sign out */}
        <div className="p-3 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-overlay transition-colors">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center text-xs font-bold text-text-inverted">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-green border-2 border-surface-raised" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{fullName || 'Student'}</div>
              <button onClick={() => { clearAuth(); router.push('/login'); }} className="text-[10px] text-text-faint hover:text-accent-red transition-colors">
                Sign out ↗
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
