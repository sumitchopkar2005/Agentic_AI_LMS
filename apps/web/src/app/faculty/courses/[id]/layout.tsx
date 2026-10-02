'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useCourseStore } from '@/stores/courses';
import { useAuthStore } from '@/stores/auth';

const tabs = [
  { label: 'Overview', href: '', emoji: '🏰' },
  { label: 'Upload', href: '/upload', emoji: '📦' },
  { label: 'Assignments', href: '/assignments', emoji: '⚔' },
  { label: 'Knowledge Graph', href: '/knowledge-graph', emoji: '🕸' },
  { label: 'Analytics', href: '/analytics', emoji: '📡' },
];

export default function CourseDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const { currentCourse, fetchCourse } = useCourseStore();

  useEffect(() => {
    if (token && courseId) {
      fetchCourse(courseId, token);
    }
  }, [token, courseId, fetchCourse]);

  const basePath = `/faculty/courses/${courseId}`;

  function isActive(tabHref: string) {
    const full = basePath + tabHref;
    if (tabHref === '') return pathname === basePath || pathname === basePath + '/';
    return pathname.startsWith(full);
  }

  const statusConfig: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    ACTIVE: { bg: 'bg-accent-green/10', border: 'border-accent-green/20', text: 'text-accent-green', icon: '✅' },
    SETUP: { bg: 'bg-gold/10', border: 'border-gold/20', text: 'text-gold', icon: '🔧' },
    ARCHIVED: { bg: 'bg-text-faint/10', border: 'border-text-faint/20', text: 'text-text-faint', icon: '📦' },
  };

  const sc = statusConfig[currentCourse?.status ?? 'SETUP'];

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <Link href="/faculty/dashboard" className="text-xs text-text-faint hover:text-accent-purple transition-colors flex items-center gap-1">
          <span>←</span> Back to Command Center
        </Link>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📖</span>
            <div className="label-overline text-accent-purple">Realm Details</div>
          </div>
          <h1 className="heading-section">{currentCourse?.title ?? 'Loading...'}</h1>
          {currentCourse?.description && (
            <p className="text-sm text-text-muted mt-1 max-w-2xl">{currentCourse.description}</p>
          )}
        </div>
        {currentCourse && sc && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${sc.bg} ${sc.border} ${sc.text}`}>
            <span>{sc.icon}</span>
            {currentCourse.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />}
            {currentCourse.status}
          </span>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-8 border-b border-surface-border pb-px overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={basePath + tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 border-b-2 -mb-px whitespace-nowrap ${
              isActive(tab.href)
                ? 'border-accent-purple text-accent-purple bg-accent-purple/5'
                : 'border-transparent text-text-muted hover:text-text-primary hover:bg-surface-raised/50'
            }`}
          >
            <span className="text-base">{tab.emoji}</span>
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
