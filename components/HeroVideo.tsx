'use client';

import { useEffect, useState } from 'react';

const SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 61 + 7) % 100}%`,
  size: 3 + ((i * 7) % 6),
  duration: 9 + ((i * 5) % 9),
  delay: -((i * 3.1) % 14),
  drift: `${((i * 37) % 80) - 40}px`,
}));

/**
 * Hero arka planı: sürekli oynayan video (şampanya köpüğü + altın parıltılar).
 * - prefers-reduced-motion açıksa video hiç yüklenmez, yalnızca poster görünür.
 * - Video dosyaları /public/video/hero.webm ve hero.mp4; yoksa poster + parıltılar görünür.
 *   (Dosyaları ekledikten sonra yeniden derleyin/deploy edin.)
 */
const HAS_WEBM = process.env.NEXT_PUBLIC_HERO_WEBM === '1';
const HAS_MP4 = process.env.NEXT_PUBLIC_HERO_MP4 === '1';

export default function HeroVideo() {
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setShowVideo(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/poster.jpg" alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
      {showVideo && (HAS_WEBM || HAS_MP4) && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/poster.jpg"
          className="absolute inset-0 h-full w-full object-cover"
        >
          {HAS_WEBM && <source src="/video/hero.webm" type="video/webm" />}
          {HAS_MP4 && <source src="/video/hero.mp4" type="video/mp4" />}
        </video>
      )}
      {showVideo && (
        <div className="absolute inset-0">
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="sparkle"
              style={{
                left: s.left,
                width: s.size,
                height: s.size,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
                ['--drift' as string]: s.drift,
              }}
            />
          ))}
        </div>
      )}
      {/* Metin okunsun diye siyah → kırmızı gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/45 to-blood/55" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
