'use client';

import { useEffect, useState } from 'react';

type Labels = { days: string; hours: string; minutes: string; seconds: string };

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function useRemaining(target: string): number | null {
  // Sunucu ve istemci saatleri farklı olabileceği için ilk render'da boş başlar (hydration uyumu).
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => setLeft(end - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Hero'daki büyük geri sayım */
export default function Countdown({ target, labels, doneText }: { target: string; labels: Labels; doneText: string }) {
  const left = useRemaining(target);
  if (left !== null && left <= 0) {
    return <p className="font-display text-2xl font-bold text-gold sm:text-3xl">{doneText}</p>;
  }
  const p = left === null ? null : parts(left);
  const items: [string, string][] = [
    [p ? String(p.d) : '––', labels.days],
    [p ? pad(p.h) : '––', labels.hours],
    [p ? pad(p.m) : '––', labels.minutes],
    [p ? pad(p.s) : '––', labels.seconds],
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
      {items.map(([value, label]) => (
        <div
          key={label}
          className="rounded-xl border border-gold/30 bg-black/45 px-1 py-3 text-center backdrop-blur-sm sm:rounded-2xl sm:px-4 sm:py-5"
        >
          <div className="font-display text-3xl font-bold tabular-nums text-white sm:text-6xl">{value}</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gold sm:text-xs">{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Fiyat artışı için tek satırlık küçük geri sayım: "12g 04s 33d 10sn" */
export function InlineCountdown({ target, labels }: { target: string; labels: Labels }) {
  const left = useRemaining(target);
  if (left === null) return <span className="tabular-nums">––</span>;
  if (left <= 0) return null;
  const p = parts(left);
  const unit = (l: string) => l.toLocaleLowerCase();
  return (
    <span className="tabular-nums">
      {p.d > 0 && `${p.d} ${unit(labels.days)} `}
      {pad(p.h)} {unit(labels.hours)} {pad(p.m)} {unit(labels.minutes)} {pad(p.s)} {unit(labels.seconds)}
    </span>
  );
}
