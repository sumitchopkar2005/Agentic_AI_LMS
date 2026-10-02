'use client';

interface StreakCounterProps {
  days: number;
}

export function StreakCounter({ days }: StreakCounterProps) {
  const isActive = days > 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
      isActive ? 'bg-streak/5 border-streak/20' : 'bg-surface-overlay border-surface-border'
    }`}>
      <span className={`text-base ${isActive ? 'animate-pulse-slow' : 'grayscale opacity-40'}`}>🔥</span>
      <span className={`font-bold text-sm tabular-nums ${
        isActive ? 'text-streak' : 'text-text-faint'
      }`}>
        {days}
      </span>
      <span className="text-[10px] text-text-faint">
        {days === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
}
