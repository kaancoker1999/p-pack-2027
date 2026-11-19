'use client';

import { useEffect, useRef } from 'react';

type Flake = { x: number; y: number; r: number; v: number; sway: number; phase: number; a: number };
type Bubble = { x: number; y: number; r: number; v: number; phase: number; a: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string };

const FIREWORK_COLORS = ['#f6e7a8', '#d4af37', '#ffffff', '#ff5a66'];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Hero üstündeki yılbaşı efektleri: yağan kar, yükselen şampanya baloncukları ve
 * arada bir patlayan küçük havai fişekler. Tek bir canvas üzerinde çizilir;
 * hero ekranda değilken ya da sekme arka plandayken durur.
 */
export default function HeroFx() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];
    let bubbles: Bubble[] = [];
    let sparks: Spark[] = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    let nextFirework = 1.2;
    let clock = 0;

    const newFlake = (anywhere: boolean): Flake => ({
      x: rand(0, w),
      y: anywhere ? rand(0, h) : -8,
      r: rand(0.8, 3.2),
      v: rand(18, 58),
      sway: rand(8, 26),
      phase: rand(0, Math.PI * 2),
      a: rand(0.3, 0.9),
    });
    const newBubble = (anywhere: boolean): Bubble => ({
      x: rand(0, w),
      y: anywhere ? rand(h * 0.35, h) : h + 8,
      r: rand(1.2, 4.6),
      v: rand(26, 84),
      phase: rand(0, Math.PI * 2),
      a: rand(0.25, 0.7),
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.min(150, Math.round(w / 7)) }, () => newFlake(true));
      bubbles = Array.from({ length: Math.min(70, Math.round(w / 18)) }, () => newBubble(true));
    };

    const firework = () => {
      const x = rand(w * 0.12, w * 0.88);
      const y = rand(h * 0.1, h * 0.42);
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const n = 34;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
        const speed = rand(50, 135);
        const max = rand(0.9, 1.6);
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: max, max, color });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (!visible) return;
      clock += dt;
      ctx.clearRect(0, 0, w, h);

      // Havai fişekler
      nextFirework -= dt;
      if (nextFirework <= 0) {
        firework();
        nextFirework = rand(2.6, 5.5);
      }
      ctx.globalCompositeOperation = 'lighter';
      sparks = sparks.filter((s) => s.life > 0);
      for (const s of sparks) {
        s.life -= dt;
        s.vx *= 1 - 1.4 * dt;
        s.vy = s.vy * (1 - 1.4 * dt) + 46 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        ctx.globalAlpha = Math.max(0, s.life / s.max) * 0.75;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Şampanya baloncukları
      ctx.lineWidth = 1;
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.v * dt;
        const x = b.x + Math.sin(clock * 1.6 + b.phase) * 6;
        if (b.y < h * 0.25) b.a -= dt * 0.5;
        if (b.y < -8 || b.a <= 0) {
          bubbles[i] = newBubble(false);
          continue;
        }
        ctx.globalAlpha = b.a;
        ctx.strokeStyle = '#e8c860';
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = b.a * 0.9;
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.5, b.r * 0.22), 0, Math.PI * 2);
        ctx.fill();
      }

      // Kar
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.v * dt;
        const x = f.x + Math.sin(clock * 0.7 + f.phase) * f.sway;
        if (f.y > h + 8) {
          flakes[i] = newFlake(false);
          continue;
        }
        ctx.globalAlpha = f.a;
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
    });
    io.observe(canvas);
    const onVisibility = () => {
      if (document.hidden) visible = false;
      else visible = canvas.getBoundingClientRect().bottom > 0;
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

/** Altın çizgili şampanya kadehi (dekoratif). */
export function Flute({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 400" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="flute-wine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d4af37" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="flute-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6e7a8" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#9a7b1c" />
        </linearGradient>
      </defs>
      {/* Şampanya */}
      <path d="M31.5 62 L88.5 62 C88 122 82 190 60 213 C38 190 32 122 31.5 62 Z" fill="url(#flute-wine)" />
      {/* Köpük */}
      <path d="M31.5 62 q7 -9 14 0 q7 -9 14 0 q7 -9 14 0 q7 -9 15 0" stroke="#fff3c4" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {/* Kadeh */}
      <g stroke="url(#flute-glass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 10 C28 110 36 190 60 215 C84 190 92 110 90 10" />
        <ellipse cx="60" cy="10" rx="30" ry="4.5" />
        <path d="M60 215 L60 360" />
        <ellipse cx="60" cy="368" rx="34" ry="7" />
      </g>
      {/* Parlama */}
      <path d="M40 28 C39 90 42 140 50 172" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      {/* Baloncuklar */}
      <g fill="#fff3c4" opacity="0.85">
        <circle cx="52" cy="150" r="2" />
        <circle cx="66" cy="120" r="2.4" />
        <circle cx="58" cy="96" r="1.6" />
        <circle cx="72" cy="82" r="2" />
        <circle cx="48" cy="80" r="1.5" />
        <circle cx="62" cy="182" r="1.8" />
      </g>
    </svg>
  );
}
