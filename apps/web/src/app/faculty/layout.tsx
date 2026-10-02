'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useCourseStore } from '@/stores/courses';
import MascotSidebar from '@/components/mascot/MascotSidebar';

const navItems = [
  { label: 'Command Center', href: '/faculty/dashboard', emoji: '🏰' },
  { label: 'Review Queue', href: '/faculty/review', emoji: '📜' },
  { label: 'Intel Reports', href: '/faculty/analytics', emoji: '📡' },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, fullName, clearAuth } = useAuthStore();
  const { courses, dashboardStats } = useCourseStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace('/login');
    }
  }, [mounted, token, router]);

  if (!mounted || !token) return null;

  function isActive(href: string) {
    if (href === '/faculty/dashboard') {
      return pathname === href || pathname.startsWith('/faculty/courses');
    }
    return pathname.startsWith(href);
  }

  const initials = (fullName || 'F').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const pendingReviews = dashboardStats?.pending_reviews ?? 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <nav className="fixed top-0 left-0 h-full w-64 flex flex-col border-r border-surface-border bg-surface-raised/50 backdrop-blur-sm z-30">
        {/* Logo */}
        <div className="p-6 pb-4">
          <Link href="/faculty/dashboard" className="block group">
            <div className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl group-hover:animate-bounce-in">🎓</span>
              <span className="bg-gradient-brand bg-clip-text text-transparent">Agentic</span>
              <span className="text-text-muted ml-0.5 font-normal">LMS</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
            <span className="label-overline text-accent-purple">Guild Master</span>
          </div>
        </div>

        {/* Rank badge */}
        <div className="mx-3 mb-3 px-4 py-3 rounded-xl bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 border border-accent-purple/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-sm font-black text-text-inverted animate-glow-pulse">
                👑
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-green border-2 border-surface-raised" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-text-faint uppercase tracking-wider">Courses</div>
              <div className="text-sm font-bold text-accent-purple">{courses.length} Active</div>
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
                    ? 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20 shadow-sm shadow-accent-purple/5'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-overlay border border-transparent'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{item.emoji}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                )}
                {item.label === 'Review Queue' && pendingReviews > 0 && !active && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gold/10 text-gold font-bold">{pendingReviews}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Stats panel */}
        <div className="mx-3 mb-3 rounded-xl border border-surface-border bg-surface-overlay/50 overflow-hidden">
          <div className="px-4 py-2 border-b border-surface-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">Guild Stats</span>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-blue/10 text-sm">📚</span>
              <div className="text-xs font-bold text-accent-blue">{courses.length} Courses</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gold/10 text-sm">📋</span>
              <div className={`text-xs font-bold ${pendingReviews > 0 ? 'text-gold' : 'text-text-faint'}`}>{pendingReviews} Pending</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-green/10 text-sm">🎓</span>
              <div className="text-xs font-bold text-accent-green">{dashboardStats?.total_students ?? 0} Students</div>
            </div>
          </div>
        </div>

        {/* Mascot */}
        <MascotSidebar />

        {/* User / Sign out */}
        <div className="p-3 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-overlay transition-colors">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-xs font-bold text-text-inverted">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-green border-2 border-surface-raised" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{fullName || 'Faculty'}</div>
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
