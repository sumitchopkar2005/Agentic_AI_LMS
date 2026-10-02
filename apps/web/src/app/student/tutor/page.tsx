'use client';

import { useAuthStore } from '@/stores/auth';
import { TutorChat } from '@/components/tutor/TutorChat';

export default function TutorPage() {
  const { token, courseId } = useAuthStore();

  if (!token) return null;

  return (
    <div className="p-6 lg:p-8 animate-fade-in h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="label-overline mb-1">Study Companion</div>
          <h1 className="heading-section flex items-center gap-3">
            <span>AI Tutor</span>
            <span className="text-2xl animate-bounce-in">🧙</span>
          </h1>
        </div>
      </div>
      <div className="h-[calc(100vh-10rem)]">
        <TutorChat token={token} courseId={courseId ?? undefined} />
      </div>
    </div>
  );
}
