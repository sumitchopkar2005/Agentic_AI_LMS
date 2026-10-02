'use client';

import { create } from 'zustand';
import { getMyProfile } from '@/lib/api/gamification';

interface GamificationState {
  xp: number;
  gold: number;
  level: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
  setProfile: (profile: { xp: number; gold: number; currentStreak: number; longestStreak: number }) => void;
  fetchProfile: (token: string) => Promise<void>;
  addXP: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  earnGold: (amount: number) => void;
}

function computeLevel(xp: number): { level: number; xpForNextLevel: number } {
  // Simple: 500 XP per level
  const level = Math.floor(xp / 500) + 1;
  const xpForNextLevel = level * 500;
  return { level, xpForNextLevel };
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  xp: 0,
  gold: 100,
  level: 1,
  xpForNextLevel: 500,
  currentStreak: 0,
  longestStreak: 0,
  loading: false,

  setProfile: (profile) => {
    const { level, xpForNextLevel } = computeLevel(profile.xp);
    set({
      xp: profile.xp,
      gold: profile.gold,
      level,
      xpForNextLevel,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
    });
  },

  fetchProfile: async (token: string) => {
    set({ loading: true });
    try {
      const p = await getMyProfile(token);
      const { level, xpForNextLevel } = computeLevel(p.xp_total);
      set({
        xp: p.xp_total,
        gold: p.gold_balance,
        level,
        xpForNextLevel,
        currentStreak: p.current_streak,
        longestStreak: p.longest_streak,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  addXP: (amount) =>
    set((state) => {
      const xp = state.xp + amount;
      const { level, xpForNextLevel } = computeLevel(xp);
      return { xp, level, xpForNextLevel };
    }),

  spendGold: (amount) => {
    const { gold } = get();
    if (gold < amount) return false;
    set({ gold: gold - amount });
    return true;
  },

  earnGold: (amount) => set((state) => ({ gold: state.gold + amount })),
}));
