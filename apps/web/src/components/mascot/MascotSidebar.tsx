'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMascotStore } from '@/stores/mascot';
import { useAuthStore } from '@/stores/auth';
import MascotSprite from './MascotSprite';
import MascotBubble from './MascotBubble';
import MascotController from './MascotController';

export default function MascotSidebar() {
  const [mounted, setMounted] = useState(false);
  const greetedRef = useRef(false);
  const router = useRouter();

  const visible = useMascotStore((s) => s.visible);
  const minimized = useMascotStore((s) => s.minimized);
  const spriteState = useMascotStore((s) => s.spriteState);
  const currentMessage = useMascotStore((s) => s.currentMessage);
  const role = useAuthStore((s) => s.role);
  const variant = role === 'faculty' ? 'faculty' : 'student';

  useEffect(() => { setMounted(true); }, []);

  // Greet on first mount
  useEffect(() => {
    if (!mounted || greetedRef.current) return;
    const auth = useAuthStore.getState();
    const store = useMascotStore.getState();
    if (!auth.token || store.sessionGreeted) return;

    greetedRef.current = true;
    store.markGreeted();
    store.setSpriteState('speaking');
    const name = auth.fullName?.split(' ')[0] || 'adventurer';
    store.queueMessage({
      text: auth.role === 'faculty'
        ? `Welcome, Guild Master ${name}! Your scholars await.`
        : `Hey ${name}! I'm Rune — click me for tips!`,
      type: 'greeting',
      autoDismissMs: 6000,
    });
  }, [mounted]);

  const handleSpriteClick = () => {
    const store = useMascotStore.getState();
    if (store.currentMessage) {
      store.dismissCurrent();
      return;
    }
    store.setSpriteState('speaking');
    const r = useAuthStore.getState().role;
    const tips = [
      'Perfect scores give 1.5x XP!',
      'A 7-day streak gives 1.2x XP bonus!',
      'Hints cost Gold, but save you time!',
      'Climb the leaderboard ranks!',
      '3 hint tiers — Nudge is cheapest!',
      'Track your mastery on every concept.',
    ];
    const facultyTips = [
      "Need anything, Guild Master?",
      'Check Intel Reports for at-risk students.',
      'AI pre-grades — review and adjust.',
      'Upload materials to generate quests.',
    ];
    const pool = r === 'faculty' ? facultyTips : tips;
    store.queueMessage({
      text: pool[Math.floor(Math.random() * pool.length)],
      type: 'tip',
      autoDismissMs: 5000,
    });
  };

  const handleBubbleAction = () => {
    const msg = useMascotStore.getState().currentMessage;
    if (msg?.action?.href) router.push(msg.action.href);
    useMascotStore.getState().dismissCurrent();
  };

  const handleDismiss = () => {
    useMascotStore.getState().dismissCurrent();
  };

  if (!mounted || !visible) return null;

  return (
    <>
      <MascotController />

      {/* Speech bubble — positioned above the mascot row via relative parent */}
      {!minimized && currentMessage && (
        <div className="mx-3 mb-2">
          <MascotBubble
            text={currentMessage.text}
            type={currentMessage.type}
            autoDismissMs={currentMessage.autoDismissMs}
            onDismiss={handleDismiss}
            action={
              currentMessage.action
                ? { label: currentMessage.action.label, onClick: handleBubbleAction }
                : undefined
            }
          />
        </div>
      )}

      {/* Mascot row — sits inline in sidebar */}
      <div className="mx-3 mb-3 flex items-center gap-2.5 px-3 py-2 rounded-xl border border-accent-purple/15 bg-accent-purple/5 hover:bg-accent-purple/10 transition-colors cursor-pointer group"
        onClick={handleSpriteClick}
      >
        <div className="relative flex-shrink-0" style={{ width: 36, height: 36 }}>
          <div
            style={{
              animationName: spriteState === 'idle' ? undefined : undefined,
            }}
          >
            <MascotSprite
              state={spriteState}
              variant={variant}
              size={36}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-accent-purple group-hover:text-accent-blue transition-colors">Rune</div>
          <div className="text-[9px] text-text-faint font-mono truncate">
            {currentMessage ? 'has something to say...' : 'Click me for tips!'}
          </div>
        </div>
        {currentMessage && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
        )}
      </div>
    </>
  );
}
