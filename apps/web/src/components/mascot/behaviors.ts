import type { BubbleType } from './MascotBubble';

export interface TipRule {
  id: string;
  type: BubbleType;
  priority: 'high' | 'medium' | 'low';
  role: 'student' | 'faculty' | 'both';
  evaluate: (ctx: BehaviorContext) => string | null; // returns message or null if not applicable
  action?: { label: string; href: string };
}

export interface BehaviorContext {
  // Gamification state (from store)
  xp: number;
  gold: number;
  level: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  // Auth context
  role: 'student' | 'faculty' | 'admin' | 'ta';
  fullName: string;
  // Page context
  pathname: string;
  // Session
  sessionGreeted: boolean;
  dismissedTips: Set<string>;
}

// ─── Student tips ────────────────────────────────────────────

const greetingRule: TipRule = {
  id: 'greeting',
  type: 'greeting',
  priority: 'low',
  role: 'both',
  evaluate: (ctx) => {
    if (ctx.sessionGreeted) return null;
    const name = ctx.fullName?.split(' ')[0] || 'adventurer';
    if (ctx.role === 'faculty') {
      return `Welcome back, Guild Master ${name}! Your scholars await.`;
    }
    return `Welcome back, ${name}! Ready for today's quests?`;
  },
};

const streakWarningRule: TipRule = {
  id: 'streak_warning',
  type: 'warning',
  priority: 'high',
  role: 'student',
  evaluate: (ctx) => {
    if (ctx.currentStreak <= 0) return null;
    // This would ideally check time since last activity from backend
    // For now, show if on dashboard and streak > 0 as a gentle reminder
    if (!ctx.pathname.includes('/dashboard')) return null;
    if (ctx.currentStreak >= 7) {
      return `Impressive ${ctx.currentStreak}-day streak! Don't let it slip — complete a quest today.`;
    }
    return null;
  },
};

const goldLowRule: TipRule = {
  id: 'gold_low',
  type: 'warning',
  priority: 'low',
  role: 'student',
  evaluate: (ctx) => {
    if (ctx.gold >= 20) return null;
    return `Running low on Gold (${ctx.gold}G)! Complete quests to stock up for hints.`;
  },
};

const levelNearRule: TipRule = {
  id: 'level_near',
  type: 'tip',
  priority: 'medium',
  role: 'student',
  evaluate: (ctx) => {
    const xpNeeded = ctx.xpForNextLevel - ctx.xp;
    if (xpNeeded > 50 || xpNeeded <= 0) return null;
    return `Just ${xpNeeded} XP until Level ${ctx.level + 1}! You're almost there.`;
  },
  action: { label: 'View Quests', href: '/student/dashboard' },
};

const tutorPageTip: TipRule = {
  id: 'tutor_tip',
  type: 'tip',
  priority: 'low',
  role: 'student',
  evaluate: (ctx) => {
    if (!ctx.pathname.includes('/tutor')) return null;
    return 'Ask me anything about your course material. I teach through questions, not answers!';
  },
};

const leaderboardTip: TipRule = {
  id: 'leaderboard_tip',
  type: 'tip',
  priority: 'low',
  role: 'student',
  evaluate: (ctx) => {
    if (!ctx.pathname.includes('/leaderboard')) return null;
    return 'Climb the ranks by completing quests and maintaining streaks. Perfect scores give 1.5x XP!';
  },
};

// ─── Faculty tips ────────────────────────────────────────────

const facultyDashboardTip: TipRule = {
  id: 'faculty_dashboard_tip',
  type: 'tip',
  priority: 'low',
  role: 'faculty',
  evaluate: (ctx) => {
    if (!ctx.pathname.includes('/dashboard')) return null;
    return 'Upload course materials and I\'ll generate adaptive assignments for your students.';
  },
};

const facultyReviewTip: TipRule = {
  id: 'faculty_review_tip',
  type: 'tip',
  priority: 'low',
  role: 'faculty',
  evaluate: (ctx) => {
    if (!ctx.pathname.includes('/review')) return null;
    return 'AI has pre-graded these submissions. Review and adjust scores as needed.';
  },
};

const facultyAnalyticsTip: TipRule = {
  id: 'faculty_analytics_tip',
  type: 'tip',
  priority: 'low',
  role: 'faculty',
  evaluate: (ctx) => {
    if (!ctx.pathname.includes('/analytics')) return null;
    return 'The heatmap shows concept mastery across your class. Red zones need attention.';
  },
};

// ─── All rules sorted by priority ────────────────────────────

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export const ALL_RULES: TipRule[] = [
  greetingRule,
  streakWarningRule,
  goldLowRule,
  levelNearRule,
  tutorPageTip,
  leaderboardTip,
  facultyDashboardTip,
  facultyReviewTip,
  facultyAnalyticsTip,
].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

export function evaluateRules(ctx: BehaviorContext): { rule: TipRule; message: string } | null {
  for (const rule of ALL_RULES) {
    // Skip if wrong role
    if (rule.role !== 'both' && rule.role !== ctx.role) continue;
    // Skip if already dismissed
    if (ctx.dismissedTips.has(rule.id)) continue;
    const message = rule.evaluate(ctx);
    if (message) return { rule, message };
  }
  return null;
}
