'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMascotStore } from '@/stores/mascot';
import { useAuthStore } from '@/stores/auth';
import MascotSprite from './MascotSprite';
import MascotBubble from './MascotBubble';
import MascotController from './MascotController';

const HIDDEN_PATHS = ['/', '/login'];

// Roaming positions as pixel offsets from the main content area
// { x: px from left edge of content, y: px from top }
// Content starts at ~260px (sidebar w-64 + padding)
const SPOTS = [
  { x: 280, y: 'calc(100vh - 120px)' },   // bottom-left
  { x: 'calc(100vw - 120px)', y: 'calc(100vh - 120px)' }, // bottom-right
  { x: 'calc(100vw - 120px)', y: '80px' },  // top-right
  { x: 280, y: '80px' },                     // top-left
  { x: 'calc(50vw + 60px)', y: 'calc(100vh - 120px)' },   // bottom-center
  { x: 'calc(100vw - 200px)', y: 'calc(50vh)' },           // mid-right
  { x: 300, y: 'calc(50vh)' },               // mid-left
  { x: 'calc(50vw)', y: '100px' },           // top-center
];

const VISIBLE_MS = 9000;   // stay visible
const HIDDEN_MS = 10000;   // stay hidden
const TRANSITION_MS = 600; // fly transition duration

type Phase = 'entering' | 'idle' | 'leaving' | 'hidden';

const KEYFRAMES = `
@keyframes rune-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes rune-bubble-pop {
  0% { transform: translateY(8px) scale(0.9); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
`;

export default function MascotOverlay() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('hidden');
  const [spotIdx, setSpotIdx] = useState(0);
  const greetedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const pathname = usePathname();
  const router = useRouter();

  const visible = useMascotStore((s) => s.visible);
  const minimized = useMascotStore((s) => s.minimized);
  const spriteState = useMascotStore((s) => s.spriteState);
  const currentMessage = useMascotStore((s) => s.currentMessage);
  const role = useAuthStore((s) => s.role);
  const variant = role === 'faculty' ? 'faculty' : 'student';

  useEffect(() => { setMounted(true); }, []);

  const pickNewSpot = useCallback(() => {
    let next = Math.floor(Math.random() * SPOTS.length);
    while (next === spotIdx && SPOTS.length > 1) {
      next = Math.floor(Math.random() * SPOTS.length);
    }
    return next;
  }, [spotIdx]);

  const scheduleNext = useCallback((nextPhase: Phase, delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Don't leave while showing a message
      if (nextPhase === 'leaving') {
        const store = useMascotStore.getState();
        if (store.currentMessage) {
          // Retry in 3s
          scheduleNext('leaving', 3000);
          return;
        }
      }
      setPhase(nextPhase);
    }, delay);
  }, []);

  // Phase transitions
  useEffect(() => {
    if (!mounted || HIDDEN_PATHS.includes(pathname)) return;
    const auth = useAuthStore.getState();
    if (!auth.token) return;

    switch (phase) {
      case 'hidden': {
        // After hidden period, pick spot and enter
        const next = pickNewSpot();
        setSpotIdx(next);
        scheduleNext('entering', HIDDEN_MS);
        break;
      }
      case 'entering': {
        // Transition to idle after fly-in completes
        scheduleNext('idle', TRANSITION_MS);
        break;
      }
      case 'idle': {
        // Greet on first appearance
        if (!greetedRef.current) {
          greetedRef.current = true;
          const auth2 = useAuthStore.getState();
          const store = useMascotStore.getState();
          if (auth2.token && !store.sessionGreeted) {
            store.markGreeted();
            store.setSpriteState('speaking');
            const name = auth2.fullName?.split(' ')[0] || 'adventurer';
            store.queueMessage({
              text: auth2.role === 'faculty'
                ? `Welcome, Guild Master ${name}! Your scholars await.`
                : `Hey ${name}! I'm Rune — your quest companion. Click me for tips!`,
              type: 'greeting',
              autoDismissMs: 7000,
            });
          }
        }
        // After visible period, start leaving
        scheduleNext('leaving', VISIBLE_MS);
        break;
      }
      case 'leaving': {
        // After fly-out, go hidden
        scheduleNext('hidden', TRANSITION_MS);
        break;
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, mounted, pathname, pickNewSpot, scheduleNext]);

  // Force Rune to appear when a message is queued while hidden
  useEffect(() => {
    if (currentMessage && phase === 'hidden') {
      if (timerRef.current) clearTimeout(timerRef.current);
      const next = pickNewSpot();
      setSpotIdx(next);
      setPhase('entering');
    }
  }, [currentMessage, phase, pickNewSpot]);

  // Kick off the first cycle
  useEffect(() => {
    if (!mounted || HIDDEN_PATHS.includes(pathname)) return;
    const auth = useAuthStore.getState();
    if (!auth.token) return;
    // Start first appearance quickly
    const t = setTimeout(() => {
      const next = pickNewSpot();
      setSpotIdx(next);
      setPhase('entering');
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, pathname]);

  const handleSpriteClick = () => {
    const store = useMascotStore.getState();
    if (store.currentMessage) {
      store.dismissCurrent();
      return;
    }
    store.setSpriteState('speaking');
    const r = useAuthStore.getState().role;
    const tips = [
      'Quest tip: Perfect scores give 1.5x XP!',
      'Maintaining a 7-day streak gives a 1.2x XP bonus!',
      'Hints cost Gold, but struggling costs time. Choose wisely!',
      'The leaderboard updates in real-time. Climb those ranks!',
      'Each assignment has up to 3 hint tiers. Nudge is cheapest!',
      'Your mastery map tracks every concept you\'ve conquered.',
    ];
    const facultyTips = [
      "Need anything, Guild Master? I'm here to help!",
      'Check Intel Reports to spot struggling students early.',
      'AI pre-grades submissions — review and adjust as needed.',
      'Upload materials and I\'ll generate adaptive assignments.',
    ];
    const pool = r === 'faculty' ? facultyTips : tips;
    store.queueMessage({
      text: pool[Math.floor(Math.random() * pool.length)],
      type: 'tip',
      autoDismissMs: 6000,
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

  if (!mounted) return null;
  if (!visible || HIDDEN_PATHS.includes(pathname)) return null;
  if (phase === 'hidden') return null;

  const spot = SPOTS[spotIdx];

  // Compute transform + opacity for smooth transitions
  let opacity = 1;
  let scale = 1;
  let translateY = '0px';

  if (phase === 'entering') {
    // Start invisible, CSS transition will animate to visible
    // We use a trick: render at final position but start scaled down
    // The useEffect immediately sets phase to 'idle' after TRANSITION_MS
  }
  if (phase === 'leaving') {
    opacity = 0;
    scale = 0.3;
    translateY = '-40px';
  }

  // For entering, we start from these values and transition to normal
  const isEntering = phase === 'entering';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <MascotController />

      <div
        className="fixed z-[90] flex flex-col items-start gap-2"
        style={{
          left: typeof spot.x === 'number' ? `${spot.x}px` : spot.x,
          top: spot.y,
          pointerEvents: phase === 'idle' ? 'auto' : 'none',
          opacity: isEntering ? 0 : opacity,
          transform: isEntering
            ? 'scale(0.3) translateY(40px)'
            : `scale(${scale}) translateY(${translateY})`,
          transition: `opacity ${TRANSITION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), transform ${TRANSITION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
          willChange: 'transform, opacity',
        }}
        // After entering frame renders, immediately flip to idle style via requestAnimationFrame
        ref={(el) => {
          if (el && isEntering) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.style.opacity = '1';
                el.style.transform = 'scale(1) translateY(0px)';
              });
            });
          }
        }}
      >
        {/* Speech bubble */}
        {!minimized && currentMessage && phase === 'idle' && (
          <div style={{ animationName: 'rune-bubble-pop', animationDuration: '0.3s', animationTimingFunction: 'ease-out', animationFillMode: 'both' }}>
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

        {/* Sprite */}
        <div style={phase === 'idle' ? { animationName: 'rune-bob', animationDuration: '3s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' } : undefined}>
          <MascotSprite
            state={spriteState}
            variant={variant}
            size={64}
            onClick={handleSpriteClick}
          />
        </div>

        {/* Name tag */}
        <div
          className="text-[9px] font-mono text-text-faint tracking-wider uppercase text-center"
          style={{ width: 64 }}
        >
          Rune
        </div>
      </div>
    </>
  );
}
