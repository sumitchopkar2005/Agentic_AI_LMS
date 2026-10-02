'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

/* ───── Pixel sprite data (8×8 grids) ───── */
const SPRITES: Record<string, number[][]> = {
  shield: [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,0,0,1,1,1],
    [1,1,0,1,1,0,1,1],
    [1,1,0,1,1,0,1,1],
    [0,1,1,0,0,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  key: [
    [0,0,1,1,1,0,0,0],
    [0,1,0,0,0,1,0,0],
    [0,1,0,0,0,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  star: [
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,1,1,1,0,0,0],
    [1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,0,0],
    [0,0,1,1,1,0,0,0],
    [0,1,1,0,1,1,0,0],
    [1,0,0,0,0,0,1,0],
  ],
  scroll: [
    [0,1,1,1,1,1,1,0],
    [1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,1,1,1,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [0,1,1,1,1,1,1,0],
  ],
};

/* ───── Mini pixel sprite renderer ───── */
function MiniSprite({ sprite, color, size }: { sprite: number[][]; color: string; size: number }) {
  const px = size / 8;
  return (
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
              }}
            />
          ) : null
        )
      )}
    </div>
  );
}

/* ───── CSS keyframes injected once ───── */
const KEYFRAMES = `
@keyframes lp-pixelFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-12px) rotate(2deg); }
  75% { transform: translateY(8px) rotate(-2deg); }
}
@keyframes lp-pixelDivider {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
@keyframes lp-glitchIn {
  0% { opacity: 0; transform: translateY(8px); filter: blur(3px); }
  50% { opacity: 0.8; transform: translateY(-2px) skewX(-1deg); }
  100% { opacity: 1; transform: translateY(0) skewX(0); }
}
@keyframes lp-slideUpFade {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

function FloatingSprite({ sprite, color, size, x, y, delay, duration }: {
  sprite: number[][]; color: string; size: number;
  x: number; y: number; delay: number; duration: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        opacity: 0.12,
        animation: `lp-pixelFloat ${duration}s ease-in-out ${delay}s infinite`,
        pointerEvents: 'none' as const,
      }}
    >
      <MiniSprite sprite={sprite} color={color} size={size} />
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const { login, loading, error } = useAuthStore();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await login(email.trim());
      const role = useAuthStore.getState().role;
      router.push(role === 'student' ? '/student/dashboard' : '/faculty/dashboard');
    } catch {
      // error is in store
    }
  };

  // Starfield canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.2 + 0.05,
      phase: Math.random() * Math.PI * 2,
      blinkSpeed: Math.random() * 0.015 + 0.005,
    }));

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.phase += s.blinkSpeed;
        const alpha = (Math.sin(s.phase) + 1) / 2 * 0.5 + 0.1;
        const sx = Math.round(s.x / 2) * 2;
        const sy = Math.round(s.y / 2) * 2;
        const ss = Math.round(s.size);
        ctx.fillStyle = `rgba(122, 162, 247, ${alpha})`;
        ctx.fillRect(sx, sy, ss, ss);
        s.y -= s.speed;
        if (s.y < -5) { s.y = canvas.height + 5; s.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(frame); };
  }, []);

  const sprites = [
    { sprite: 'shield', color: '#7aa2f7', size: 40, x: 8, y: 15, delay: 0, duration: 7 },
    { sprite: 'key', color: '#ff9e64', size: 32, x: 88, y: 20, delay: 1.2, duration: 8 },
    { sprite: 'star', color: '#bb9af7', size: 36, x: 12, y: 75, delay: 0.6, duration: 9 },
    { sprite: 'scroll', color: '#7dcfff', size: 34, x: 85, y: 70, delay: 2.0, duration: 7 },
    { sprite: 'shield', color: '#9ece6a', size: 28, x: 5, y: 45, delay: 1.8, duration: 10 },
    { sprite: 'star', color: '#f7768e', size: 24, x: 92, y: 45, delay: 0.3, duration: 8 },
    { sprite: 'key', color: '#bb9af7', size: 28, x: 18, y: 90, delay: 2.5, duration: 9 },
    { sprite: 'scroll', color: '#ff9e64', size: 30, x: 80, y: 88, delay: 1.0, duration: 7 },
  ];

  const clipOctagon = (inset: number) =>
    `polygon(${inset}px 0, calc(100% - ${inset}px) 0, 100% ${inset}px, 100% calc(100% - ${inset}px), calc(100% - ${inset}px) 100%, ${inset}px 100%, 0 calc(100% - ${inset}px), 0 ${inset}px)`;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Canvas starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-surface z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(122,162,247,0.08)_0%,_transparent_50%)] z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(187,154,247,0.06)_0%,_transparent_50%)] z-[1]" />

      {/* Pixel grid */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(122, 162, 247, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(122, 162, 247, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-[3]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }}
      />

      {/* Floating pixel sprites */}
      <div className="absolute inset-0 z-[4]">
        {sprites.map((s, i) => (
          <FloatingSprite
            key={i}
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

      {/* Main content */}
      <div
        className="relative z-10 w-full max-w-md px-4"
        style={{ animation: 'lp-glitchIn 0.6s ease-out' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(122,162,247,0.15), rgba(187,154,247,0.15))',
              border: '2px solid rgba(122,162,247,0.2)',
              clipPath: clipOctagon(15),
              animation: 'lp-glitchIn 0.6s ease-out 0.1s both',
            }}
          >
            <span className="text-4xl">⚡</span>
          </div>
          <h1
            className="text-3xl font-black font-mono"
            style={{ animation: 'lp-glitchIn 0.6s ease-out 0.2s both' }}
          >
            <span className="bg-gradient-brand bg-clip-text text-transparent">Agentic</span>
            <span className="text-text-muted ml-2 font-light">LMS</span>
          </h1>
          <p
            className="text-xs text-text-faint mt-2 font-mono tracking-wider"
            style={{ animation: 'lp-glitchIn 0.6s ease-out 0.3s both' }}
          >
            <span className="text-accent-green">{'>'}</span> Begin your learning quest
          </p>
        </div>

        {/* Login card */}
        <div
          className="backdrop-blur-sm p-8 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(26,27,46,0.9), rgba(15,15,26,0.95))',
            border: '1px solid rgba(42,43,77,0.8)',
            clipPath: clipOctagon(12),
            animation: 'lp-slideUpFade 0.5s ease-out 0.3s both',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-text-faint uppercase tracking-[0.2em] mb-2">
                Enter the Arena
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@university.edu"
                className="w-full px-4 py-3 text-sm text-text-primary bg-surface-overlay/50
                           border border-surface-border focus:outline-none focus:ring-2 focus:ring-accent-blue/30
                           focus:border-accent-blue/50 placeholder:text-text-faint transition-all duration-200 font-mono"
                style={{ clipPath: clipOctagon(6) }}
                autoFocus
                required
              />
            </div>

            {error && (
              <div
                className="text-sm text-streak bg-streak/10 border border-streak/20 px-4 py-2.5 flex items-center gap-2 animate-shake font-mono"
                style={{ clipPath: clipOctagon(6) }}
              >
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="w-full py-3 font-mono font-bold text-sm uppercase tracking-wider
                         text-[#0f0f1a] disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200 flex items-center justify-center gap-2
                         hover:shadow-lg hover:shadow-accent-blue/20 hover:brightness-110 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7aa2f7, #bb9af7)',
                clipPath: clipOctagon(8),
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-surface/30 border-t-surface animate-spin" />
                  Entering...
                </>
              ) : (
                <>
                  <span>⚔</span>
                  Enter Quest
                </>
              )}
            </button>
          </form>

          {/* Pixel divider */}
          <div className="flex items-center justify-center gap-1 my-6">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '2px',
                  backgroundColor: i >= 6 && i <= 9 ? '#7aa2f7' : '#2a2b4d',
                  animation: `lp-pixelDivider 2s ease-in-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
          </div>

          <p className="text-[10px] text-text-faint text-center uppercase tracking-[0.2em] mb-3 font-mono">
            Quick Select — Dev Mode
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setEmail('demo.faculty@university.edu')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-mono font-medium
                         border border-accent-orange/20 text-accent-orange bg-accent-orange/5
                         hover:bg-accent-orange/10 hover:border-accent-orange/40 transition-all uppercase tracking-wider"
              style={{ clipPath: clipOctagon(6) }}
            >
              <span>📜</span> Faculty
            </button>
            <button
              onClick={() => setEmail('demo.student@university.edu')}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-mono font-medium
                         border border-accent-blue/20 text-accent-blue bg-accent-blue/5
                         hover:bg-accent-blue/10 hover:border-accent-blue/40 transition-all uppercase tracking-wider"
              style={{ clipPath: clipOctagon(6) }}
            >
              <span>⚔</span> Student
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-text-faint mt-6 font-mono tracking-wider">
          <span className="text-accent-green">●</span> Powered by AI agents • Socratic learning • Gamified experience
        </p>
      </div>
    </div>
  );
}
