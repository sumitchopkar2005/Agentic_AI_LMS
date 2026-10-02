'use client';

interface GoldBalanceProps {
  balance: number;
}

export function GoldBalance({ balance }: GoldBalanceProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/5 border border-gold/20">
      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-gold/10 text-gold text-xs animate-glow-gold">●</span>
      <span className="font-bold text-gold text-sm tabular-nums">{balance}</span>
      <span className="text-[10px] text-text-faint">Gold</span>
    </div>
  );
}
