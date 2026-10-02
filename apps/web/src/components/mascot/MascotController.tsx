'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useMascotStore } from '@/stores/mascot';
import { useGamificationStore } from '@/stores/gamification';
import { useAuthStore } from '@/stores/auth';
import { evaluateRules, type BehaviorContext } from './behaviors';

const INITIAL_DELAY_MS = 2000;  // wait before first tip after page load
const EVAL_INTERVAL_MS = 60000; // re-evaluate rules every 60s

export default function MascotController() {
  const pathname = usePathname();
  const evalTimer = useRef<ReturnType<typeof setInterval>>();
  const initialTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const runEvaluation = () => {
      const mascot = useMascotStore.getState();
      const gamification = useGamificationStore.getState();
      const auth = useAuthStore.getState();

      // Don't show tips if there's already a message showing
      if (mascot.currentMessage) return;
      // Respect cooldown
      if (!mascot.canShowTip()) return;
      // Need auth
      if (!auth.token || !auth.role) return;

      const ctx: BehaviorContext = {
        xp: gamification.xp,
        gold: gamification.gold,
        level: gamification.level,
        xpForNextLevel: gamification.xpForNextLevel,
        currentStreak: gamification.currentStreak,
        longestStreak: gamification.longestStreak,
        role: auth.role as BehaviorContext['role'],
        fullName: auth.fullName || '',
        pathname: pathname || '',
        sessionGreeted: mascot.sessionGreeted,
        dismissedTips: mascot.dismissedTips,
      };

      const result = evaluateRules(ctx);
      if (!result) return;

      const { rule, message } = result;

      // Mark as shown
      mascot.dismissTip(rule.id);
      if (rule.id === 'greeting') mascot.markGreeted();

      // Update last tip time
      useMascotStore.setState({ lastTipTime: Date.now() });

      // Set appropriate sprite state
      if (rule.type === 'warning') {
        useMascotStore.setState({ spriteState: 'warning' });
      }

      // Queue the message
      mascot.queueMessage({
        text: message,
        type: rule.type,
        autoDismissMs: rule.type === 'greeting' ? 6000 : 8000,
        action: rule.action ? { label: rule.action.label, href: rule.action.href } : undefined,
      });
    };

    // Initial evaluation after a short delay (let stores hydrate)
    initialTimer.current = setTimeout(runEvaluation, INITIAL_DELAY_MS);

    // Periodic re-evaluation
    evalTimer.current = setInterval(runEvaluation, EVAL_INTERVAL_MS);

    return () => {
      if (initialTimer.current) clearTimeout(initialTimer.current);
      if (evalTimer.current) clearInterval(evalTimer.current);
    };
  }, [pathname]);

  // Re-evaluate on navigation (with a short delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      const mascot = useMascotStore.getState();
      if (!mascot.currentMessage && mascot.canShowTip()) {
        const gamification = useGamificationStore.getState();
        const auth = useAuthStore.getState();
        if (!auth.token || !auth.role) return;

        const ctx: BehaviorContext = {
          xp: gamification.xp,
          gold: gamification.gold,
          level: gamification.level,
          xpForNextLevel: gamification.xpForNextLevel,
          currentStreak: gamification.currentStreak,
          longestStreak: gamification.longestStreak,
          role: auth.role as BehaviorContext['role'],
          fullName: auth.fullName || '',
          pathname: pathname || '',
          sessionGreeted: mascot.sessionGreeted,
          dismissedTips: mascot.dismissedTips,
        };

        const result = evaluateRules(ctx);
        if (result) {
          mascot.dismissTip(result.rule.id);
          useMascotStore.setState({ lastTipTime: Date.now() });
          mascot.queueMessage({
            text: result.message,
            type: result.rule.type,
            autoDismissMs: 8000,
            action: result.rule.action ? { label: result.rule.action.label, href: result.rule.action.href } : undefined,
          });
        }
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null; // This is a logic-only component
}
