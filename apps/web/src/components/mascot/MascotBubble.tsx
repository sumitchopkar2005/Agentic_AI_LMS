'use client';

import { useEffect, useRef } from 'react';

export type BubbleType = 'tip' | 'hint' | 'celebration' | 'warning' | 'greeting';

interface MascotBubbleProps {
  text: string;
  type: BubbleType;
  action?: { label: string; onClick: () => void };
  autoDismissMs?: number; // 0 = no auto dismiss (for purchased hints)
  onDismiss: () => void;
}

const TYPE_STYLES: Record<BubbleType, { accent: string; icon: string; glow: string }> = {
  tip:         { accent: '#7aa2f7', icon: '💡', glow: 'rgba(122,162,247,0.15)' },
  hint:        { accent: '#bb9af7', icon: '🗝️', glow: 'rgba(187,154,247,0.15)' },
  celebration: { accent: '#9ece6a', icon: '🎉', glow: 'rgba(158,206,106,0.15)' },
  warning:     { accent: '#f7768e', icon: '⚠️', glow: 'rgba(247,118,142,0.15)' },
  greeting:    { accent: '#ff9e64', icon: '👋', glow: 'rgba(255,158,100,0.15)' },
};

export default function MascotBubble({ text, type, action, autoDismissMs = 8000, onDismiss }: MascotBubbleProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const style = TYPE_STYLES[type];

  useEffect(() => {
    if (autoDismissMs > 0) {
      timerRef.current = setTimeout(onDismiss, autoDismissMs);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      className="animate-slide-up"
      style={{
        maxWidth: 280,
        background: 'linear-gradient(135deg, rgba(26,27,46,0.95), rgba(15,15,26,0.98))',
        border: `1px solid ${style.accent}40`,
        borderLeft: `3px solid ${style.accent}`,
        boxShadow: `0 4px 24px ${style.glow}, 0 0 0 1px rgba(42,43,77,0.3)`,
        borderRadius: '12px 12px 12px 4px',
        padding: '12px 14px',
        position: 'relative',
      }}
      role="status"
      aria-live="polite"
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-1.5 right-2 text-text-faint hover:text-text-secondary transition-colors text-xs leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>

      {/* Content */}
      <div className="flex gap-2 items-start pr-4">
        <span className="text-sm flex-shrink-0 mt-0.5">{style.icon}</span>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary leading-relaxed font-mono">{text}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded transition-all hover:brightness-110"
              style={{
                background: `${style.accent}20`,
                color: style.accent,
                border: `1px solid ${style.accent}30`,
              }}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>

      {/* Pixel-art tail pointing down-left toward sprite */}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: 12,
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${style.accent}40`,
        }}
      />
    </div>
  );
}
