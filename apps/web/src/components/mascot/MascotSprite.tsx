'use client';

import { useEffect, useRef, useState } from 'react';
import { PALETTE, getSprites, type SpriteState, type SpriteVariant } from './sprites';

interface MascotSpriteProps {
  state: SpriteState;
  variant: SpriteVariant;
  size?: number; // total pixel size of the sprite (default 64)
  onClick?: () => void;
}

const BLINK_INTERVAL = 3500; // ms between blinks
const BLINK_DURATION = 180;  // ms blink lasts

export default function MascotSprite({ state, variant, size = 64, onClick }: MascotSpriteProps) {
  const [displayState, setDisplayState] = useState<SpriteState>(state);
  const blinkTimer = useRef<ReturnType<typeof setInterval>>();

  // Auto-blink when idle
  useEffect(() => {
    if (state === 'idle') {
      blinkTimer.current = setInterval(() => {
        setDisplayState('blink');
        setTimeout(() => setDisplayState('idle'), BLINK_DURATION);
      }, BLINK_INTERVAL);
      setDisplayState('idle');
    } else {
      setDisplayState(state);
    }
    return () => { if (blinkTimer.current) clearInterval(blinkTimer.current); };
  }, [state]);

  const sprites = getSprites(variant);
  const grid = sprites[displayState] || sprites.idle;
  const px = size / 16;

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer select-none"
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
      role="button"
      aria-label="Rune the mascot"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && onClick) onClick(); }}
    >
      {grid.map((row, ry) =>
        row.map((colorIdx, rx) => {
          if (colorIdx === 0) return null;
          return (
            <div
              key={`${ry}-${rx}`}
              style={{
                position: 'absolute',
                left: rx * px,
                top: ry * px,
                width: px + 0.5,
                height: px + 0.5,
                backgroundColor: PALETTE[colorIdx] || 'transparent',
              }}
            />
          );
        })
      )}

      {/* Glow effect under the sprite */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: size * 0.6,
          height: 4,
          background: 'radial-gradient(ellipse, rgba(122,162,247,0.3) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
