'use client';

import { useState } from 'react';
import { useGamificationStore } from '@/stores/gamification';
import { useAuthStore } from '@/stores/auth';
import { useMascotStore } from '@/stores/mascot';
import { purchaseHint } from '@/lib/api/gamification';

interface HintButtonProps {
  assignmentId: string;
  tier: 'NUDGE' | 'GUIDANCE' | 'SOLUTION';
  cost: number;
  onHintReceived?: (hintText: string) => void;
}

const tierConfig = {
  NUDGE: { label: 'Nudge', icon: '💡', color: 'accent-green' },
  GUIDANCE: { label: 'Guidance', icon: '🧭', color: 'accent-blue' },
  SOLUTION: { label: 'Solution', icon: '🗝️', color: 'accent-purple' },
};

export function HintButton({ assignmentId, tier, cost, onHintReceived }: HintButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { gold, spendGold } = useGamificationStore();
  const token = useAuthStore((s) => s.token);

  const config = tierConfig[tier];
  const canAfford = gold >= cost;

  const handlePurchase = async () => {
    if (!canAfford || !token) return;

    setLoading(true);
    setError(null);

    try {
      const result = await purchaseHint(assignmentId, tier, token);

      // Update local gold balance with server response
      spendGold(cost);

      // Deliver hint through Rune mascot
      useMascotStore.getState().deliverHint(result.hint_text, tier, cost);

      onHintReceived?.(result.hint_text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
      // Don't deduct gold on failure
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <span className="text-xs text-text-muted">Spend {cost} Gold?</span>
        <button
          onClick={handlePurchase}
          disabled={!canAfford || loading}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-gold text-surface-base
                     disabled:opacity-40 transition-all duration-200
                     hover:shadow-lg hover:shadow-gold/20"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border-2 border-surface-base/30 border-t-surface-base animate-spin" />
              Unlocking...
            </span>
          ) : 'Confirm'}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(null); }}
          className="px-3 py-1.5 text-xs text-text-faint hover:text-text-muted rounded-lg hover:bg-surface-overlay transition-colors"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={!canAfford}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs
        transition-all duration-200 border-2
        ${canAfford
          ? `bg-${config.color}/5 text-${config.color} border-${config.color}/20
             hover:bg-${config.color}/10 hover:border-${config.color}/40
             hover:shadow-lg hover:shadow-${config.color}/10`
          : 'bg-surface-overlay text-text-faint border-surface-border cursor-not-allowed opacity-50'}
      `}
    >
      <span className="text-sm">{config.icon}</span>
      <span>{config.label}</span>
      <span className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-md bg-gold/10">
        <span className="text-gold text-xs">●</span>
        <span className="text-gold font-bold">{cost}</span>
      </span>
    </button>
  );
}
