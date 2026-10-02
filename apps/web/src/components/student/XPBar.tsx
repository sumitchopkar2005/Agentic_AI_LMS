'use client';

interface XPBarProps {
  current: number;
  nextLevel: number;
  level: number;
}

export function XPBar({ current, nextLevel, level }: XPBarProps) {
  const progress = Math.min((current / nextLevel) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-xp to-accent-blue
                         border border-xp/30 text-xs font-black text-text-inverted shadow-sm animate-glow-xp">
          {level}
        </span>
      </div>
      <div className="flex-1">
        <div className="h-2.5 rounded-full bg-surface-overlay overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-xp transition-all duration-700 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse-bar" />
          </div>
        </div>
      </div>
      <span className="text-[10px] font-bold text-xp tabular-nums">
        {current}/{nextLevel}
      </span>
    </div>
  );
}
