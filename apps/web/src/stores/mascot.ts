import { create } from 'zustand';
import type { SpriteState } from '@/components/mascot/sprites';
import type { BubbleType } from '@/components/mascot/MascotBubble';

export interface MascotMessage {
  id: string;
  text: string;
  type: BubbleType;
  action?: { label: string; href?: string };
  autoDismissMs: number; // 0 = manual dismiss only
}

interface MascotState {
  // Visibility
  visible: boolean;
  minimized: boolean; // true = sprite only, false = sprite + bubble

  // Animation
  spriteState: SpriteState;

  // Message queue
  messages: MascotMessage[];
  currentMessage: MascotMessage | null;

  // Session memory (prevents re-showing same tips)
  dismissedTips: Set<string>;
  sessionGreeted: boolean;
  lastTipTime: number; // timestamp of last proactive tip

  // Actions
  show: () => void;
  hide: () => void;
  minimize: () => void;
  setSpriteState: (s: SpriteState) => void;

  queueMessage: (msg: Omit<MascotMessage, 'id'>) => void;
  dismissCurrent: () => void;
  advanceQueue: () => void;
  dismissTip: (tipId: string) => void;
  markGreeted: () => void;
  canShowTip: () => boolean;

  // Hint delivery
  deliverHint: (hintText: string, tier: string, goldSpent: number) => void;

  // Celebrations
  celebrate: (text: string) => void;
}

let msgCounter = 0;
const genId = () => `mascot-${++msgCounter}-${Date.now()}`;

const TIP_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes between proactive tips

export const useMascotStore = create<MascotState>((set, get) => ({
  visible: true,
  minimized: true,
  spriteState: 'idle',
  messages: [],
  currentMessage: null,
  dismissedTips: new Set(),
  sessionGreeted: false,
  lastTipTime: 0,

  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
  minimize: () => set({ minimized: true, currentMessage: null, spriteState: 'idle' }),

  setSpriteState: (spriteState) => set({ spriteState }),

  queueMessage: (msg) => {
    const id = genId();
    const message: MascotMessage = { ...msg, id };
    const { currentMessage } = get();
    if (!currentMessage) {
      set({ currentMessage: message, minimized: false, spriteState: 'speaking' });
    } else {
      set((s) => ({ messages: [...s.messages, message] }));
    }
  },

  dismissCurrent: () => {
    const { messages } = get();
    if (messages.length > 0) {
      const [next, ...rest] = messages;
      set({ currentMessage: next, messages: rest, spriteState: 'speaking' });
    } else {
      set({ currentMessage: null, minimized: true, spriteState: 'idle' });
    }
  },

  advanceQueue: () => get().dismissCurrent(),

  dismissTip: (tipId) => {
    set((s) => {
      const newSet = new Set(s.dismissedTips);
      newSet.add(tipId);
      return { dismissedTips: newSet };
    });
  },

  markGreeted: () => set({ sessionGreeted: true }),

  canShowTip: () => {
    const { lastTipTime } = get();
    return Date.now() - lastTipTime > TIP_COOLDOWN_MS;
  },

  deliverHint: (hintText, tier, goldSpent) => {
    const tierEmoji = tier === 'SOLUTION' ? '🗝️' : tier === 'GUIDANCE' ? '🧭' : '💡';
    const prefix = `${tierEmoji} Hint (-${goldSpent}G): `;

    // Brief celebration animation before showing hint
    set({ spriteState: 'happy' });
    setTimeout(() => {
      get().queueMessage({
        text: `${prefix}${hintText}`,
        type: 'hint',
        autoDismissMs: 0, // hints stay until dismissed (user paid Gold)
      });
    }, 400);
  },

  celebrate: (text) => {
    set({ spriteState: 'celebrating' });
    setTimeout(() => {
      get().queueMessage({
        text,
        type: 'celebration',
        autoDismissMs: 6000,
      });
    }, 300);
  },
}));
