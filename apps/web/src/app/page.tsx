'use client';

import { useEffect, useRef, useState } from 'react';

/* ───── Pixel art sprite data (each is a 12×12 grid, 1 = filled) ───── */
const SPRITES = {
  // Book with pages
  book: [
    [0,0,0,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,0,0,0,0,1,1,0,0],
    [0,1,1,0,1,1,1,0,0,1,1,0],
    [0,1,0,0,1,1,1,0,0,0,1,0],
    [1,1,0,0,0,0,0,0,0,0,1,1],
    [1,0,0,1,1,1,1,1,0,0,0,1],
    [1,0,0,1,1,1,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,1,1,1,0,0,0,1],
    [1,1,0,0,0,0,0,0,0,0,1,1],
    [0,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,0,0],
  ],
  // Trophy cup
  trophy: [
    [0,0,0,0,1,1,1,1,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,0],
    [1,1,0,1,1,1,1,1,1,0,1,1],
    [1,1,0,0,1,1,1,1,0,0,1,1],
    [0,1,0,0,1,1,1,1,0,0,1,0],
    [0,0,1,0,0,1,1,0,0,1,0,0],
    [0,0,0,1,0,1,1,0,1,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,0,0],
  ],
  // Brain / AI
  brain: [
    [0,0,0,1,1,1,1,1,0,0,0,0],
    [0,0,1,1,0,0,0,1,1,0,0,0],
    [0,1,1,0,1,0,1,0,1,1,0,0],
    [0,1,0,1,1,0,1,1,0,1,1,0],
    [1,1,0,1,0,1,0,1,0,0,1,0],
    [1,0,0,0,1,1,1,0,0,0,1,0],
    [1,0,1,0,1,0,1,0,1,0,1,0],
    [1,1,0,1,0,1,0,1,0,1,1,0],
    [0,1,0,0,1,1,1,0,0,1,0,0],
    [0,1,1,0,0,0,0,0,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  // Sword (achievement)
  sword: [
    [0,0,0,0,0,0,0,0,0,0,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,0],
    [0,0,0,0,0,0,0,0,1,1,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,1,1,0,0,0,0],
    [0,1,0,0,0,1,1,0,0,0,0,0],
    [0,0,1,0,1,1,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,0,0,0,0,0],
    [1,1,0,0,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,0,0,0,0,0,0],
  ],
  // Potion (hint)
  potion: [
    [0,0,0,0,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,0,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,0,0,0,1,0,0,0,0],
    [0,0,1,1,0,0,0,1,1,0,0,0],
    [0,1,1,0,0,0,0,0,1,1,0,0],
    [0,1,0,0,1,0,0,0,0,1,0,0],
    [1,1,0,1,1,1,0,0,0,1,1,0],
    [1,0,0,1,1,0,0,1,0,0,1,0],
    [1,0,0,0,0,0,1,1,0,0,1,0],
    [1,1,0,0,0,0,0,0,0,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,0,0],
  ],
  // Coin (gold)
  coin: [
    [0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,0,0,1,1,1,0,0],
    [0,1,1,1,0,1,1,0,1,1,1,0],
    [0,1,1,0,0,1,1,0,0,1,1,0],
    [1,1,1,0,0,1,1,0,0,1,1,1],
    [1,1,1,0,0,1,1,0,0,1,1,1],
    [0,1,1,0,0,1,1,0,0,1,1,0],
    [0,1,1,1,0,1,1,0,1,1,1,0],
    [0,0,1,1,1,0,0,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,1,1,1,1,0,0,0,0],
  ],
};

type SpriteKey = keyof typeof SPRITES;

/* ───── Floating pixel sprite component ───── */
function PixelSprite({
  sprite, color, size, x, y, delay, duration
}: {
  sprite: number[][]; color: string; size: number;
  x: number; y: number; delay: number; duration: number;
}) {
  const px = size / 12;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: `pixelFloat ${duration}s ease-in-out ${delay}s infinite`,
        opacity: 0.15,
      }}
    >
      <div style={{ width: size, height: size, position: 'relative' }}>
        {sprite.map((row, ry) =>
          row.map((cell, rx) =>
            cell ? (
              <div
                key={`${ry}-${rx}`}
                style={{
                  position: 'absolute',
                  left: rx * px,
                  top: ry * px,
                  width: px + 0.5,
                  height: px + 0.5,
                  backgroundColor: color,
                  imageRendering: 'pixelated',
                }}
              />
            ) : null
          )
        )}
      </div>
    </div>
  );
}

/* ───── XP Particles ───── */
function XPParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <div
      className="absolute text-xs font-mono font-bold pointer-events-none select-none"
      style={{
        left: `${x}%`,
        bottom: '10%',
        color: '#bb9af7',
        animation: `xpRise 3s ease-out ${delay}s infinite`,
        opacity: 0,
        textShadow: '0 0 8px rgba(187, 154, 247, 0.6)',
      }}
    >
      +XP
    </div>
  );
}

/* ───── Pixel grid background ───── */
function PixelGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(122, 162, 247, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(122, 162, 247, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    />
  );
}

/* ───── Animated progress bar ───── */
function PixelProgressBar({ label, color, targetWidth, delay }: {
  label: string; color: string; targetWidth: number; delay: number
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(targetWidth), delay);
    return () => clearTimeout(timer);
  }, [targetWidth, delay]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-text-muted w-20 text-right uppercase tracking-wider">
        {label}
      </span>
      <div className="h-2 flex-1 bg-surface-overlay rounded-sm overflow-hidden border border-surface-border">
        <div
          className="h-full rounded-sm transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: color,
            boxShadow: `0 0 8px ${color}40`,
            imageRendering: 'pixelated',
          }}
        />
      </div>
    </div>
  );
}

/* ───── Typing text effect ───── */
function TypeWriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="inline-block w-2 h-5 bg-accent-blue ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

/* ───── Scanline overlay ───── */
function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-30"
      style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }}
    />
  );
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */
export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Starfield background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate stars
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.3 + 0.05,
      brightness: Math.random(),
      blinkSpeed: Math.random() * 0.02 + 0.005,
    }));

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.brightness += star.blinkSpeed;
        const alpha = (Math.sin(star.brightness) + 1) / 2 * 0.6 + 0.1;
        // Snap to pixel grid for retro feel
        const sx = Math.round(star.x / 2) * 2;
        const sy = Math.round(star.y / 2) * 2;
        const ss = Math.round(star.size);
        ctx.fillStyle = `rgba(122, 162, 247, ${alpha})`;
        ctx.fillRect(sx, sy, ss, ss);
        star.y -= star.speed;
        if (star.y < -5) {
          star.y = canvas.height + 5;
          star.x = Math.random() * canvas.width;
        }
      });
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  const floatingSprites: { key: string; sprite: SpriteKey; color: string; size: number; x: number; y: number; delay: number; duration: number }[] = [
    { key: 'book1', sprite: 'book', color: '#7aa2f7', size: 72, x: 5, y: 15, delay: 0, duration: 8 },
    { key: 'trophy1', sprite: 'trophy', color: '#ff9e64', size: 60, x: 85, y: 20, delay: 1.5, duration: 7 },
    { key: 'brain1', sprite: 'brain', color: '#bb9af7', size: 84, x: 10, y: 65, delay: 0.8, duration: 9 },
    { key: 'sword1', sprite: 'sword', color: '#7dcfff', size: 54, x: 90, y: 70, delay: 2.2, duration: 6 },
    { key: 'potion1', sprite: 'potion', color: '#9ece6a', size: 48, x: 78, y: 45, delay: 1.0, duration: 10 },
    { key: 'coin1', sprite: 'coin', color: '#ff9e64', size: 42, x: 15, y: 40, delay: 3.0, duration: 7 },
    { key: 'book2', sprite: 'book', color: '#7dcfff', size: 36, x: 70, y: 80, delay: 2.5, duration: 8 },
    { key: 'trophy2', sprite: 'trophy', color: '#f7768e', size: 48, x: 25, y: 85, delay: 0.5, duration: 9 },
  ];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Canvas starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-surface z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(122,162,247,0.1)_0%,_transparent_50%)] z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(187,154,247,0.08)_0%,_transparent_50%)] z-[1]" />

      {/* Pixel grid */}
      <div className="z-[2]"><PixelGrid /></div>

      {/* Scanlines */}
      <Scanlines />

      {/* Floating pixel sprites */}
      <div className="absolute inset-0 z-[3]">
        {floatingSprites.map((s) => (
          <PixelSprite
            key={s.key}
            sprite={SPRITES[s.sprite]}
            color={s.color}
            size={s.size}
            x={s.x}
            y={s.y}
            delay={s.delay}
            duration={s.duration}
          />
        ))}
      </div>

      {/* XP particles rising */}
      <div className="absolute inset-0 z-[3]">
        {[12, 28, 45, 62, 78].map((x, i) => (
          <XPParticle key={i} x={x} delay={i * 1.5} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Terminal-style overline */}
        <div className="font-mono text-[11px] text-accent-green mb-6 tracking-wider">
          <span className="text-text-faint">{'>'}</span>{' '}
          <TypeWriter text="SYSTEM.INIT — AI_AGENTS_ONLINE" delay={300} />
        </div>

        {/* Hero title with pixel accent */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-text-primary mb-2 text-center leading-tight">
          <span className="inline-block" style={{ animation: 'glitchIn 0.8s ease-out' }}>
            Agentic
          </span>{' '}
          <span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #7aa2f7, #bb9af7, #7dcfff)',
              animation: 'glitchIn 0.8s ease-out 0.2s both',
            }}
          >
            LMS
          </span>
        </h1>

        {/* Pixel divider */}
        <div className="flex items-center gap-1 my-4">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-none"
              style={{
                width: '8px',
                backgroundColor: i >= 7 && i <= 12 ? '#7aa2f7' : '#2a2b4d',
                animation: `pixelDivider 2s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>

        <p className="max-w-lg text-center text-base leading-relaxed text-text-secondary mb-8 font-mono">
          Adaptive assignments, Socratic tutoring, and gamified mastery —
          powered by AI agents.
        </p>

        {/* Pixel progress bars */}
        <div className="w-full max-w-sm space-y-2 mb-10">
          <PixelProgressBar label="Knowledge" color="#7aa2f7" targetWidth={85} delay={800} />
          <PixelProgressBar label="Mastery" color="#bb9af7" targetWidth={62} delay={1100} />
          <PixelProgressBar label="Streak" color="#f7768e" targetWidth={94} delay={1400} />
          <PixelProgressBar label="Gold" color="#ff9e64" targetWidth={47} delay={1700} />
        </div>

        {/* CTA buttons — pixel style */}
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="group relative px-8 py-3 font-mono text-sm font-bold tracking-wider uppercase overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7aa2f7, #bb9af7)',
              color: '#0f0f1a',
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            }}
          >
            <span className="relative z-10">{'> START QUEST'}</span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #bb9af7, #7dcfff)' }}
            />
          </a>
          <a
            href="/login"
            className="px-8 py-3 font-mono text-sm font-bold tracking-wider uppercase border border-surface-border text-text-secondary hover:border-accent-blue/60 hover:text-accent-blue transition-all"
            style={{
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            }}
          >
            {'> SIGN IN'}
          </a>
        </div>

        {/* Feature cards — pixel game items */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-3 max-w-2xl">
          {([
            { icon: '🧠', label: 'Knowledge Graphs', color: '#bb9af7' },
            { icon: '🎯', label: 'Adaptive Quests', color: '#7aa2f7' },
            { icon: '💬', label: 'AI Tutor', color: '#7dcfff' },
            { icon: '🏆', label: 'XP & Gold', color: '#ff9e64' },
            { icon: '📊', label: 'Analytics', color: '#9ece6a' },
          ] as const).map((f, i) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-border bg-surface-raised/50 hover:border-opacity-60 transition-all cursor-default group"
              style={{
                animation: `slideUpFade 0.5s ease-out ${1.8 + i * 0.15}s both`,
              }}
            >
              <span className="text-xl group-hover:animate-bounce-in">{f.icon}</span>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider text-center leading-tight">
                {f.label}
              </span>
              <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: f.color, opacity: 0.5 }} />
            </div>
          ))}
        </div>

        {/* Bottom terminal line */}
        <div className="mt-12 font-mono text-[10px] text-text-faint tracking-wider">
          <span className="text-accent-green">●</span>{' '}
          <TypeWriter text="5 AGENTS READY — WAITING FOR PLAYER 1" delay={3000} />
        </div>
      </div>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes pixelFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(2deg); }
          75% { transform: translateY(10px) rotate(-2deg); }
        }
        @keyframes xpRise {
          0% { opacity: 0; transform: translateY(0) scale(0.8); }
          10% { opacity: 0.7; }
          100% { opacity: 0; transform: translateY(-200px) scale(1.2); }
        }
        @keyframes pixelDivider {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes glitchIn {
          0% { opacity: 0; transform: translateY(10px); filter: blur(4px); }
          50% { opacity: 0.8; transform: translateY(-2px) skewX(-2deg); }
          100% { opacity: 1; transform: translateY(0) skewX(0); }
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
