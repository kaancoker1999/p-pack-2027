'use client';

import { useEffect, useState } from 'react';
import HeroFx, { Flute } from './HeroFx';
import HeroRunner from './HeroRunner';

/**
 * Hero arka planı: sürekli oynayan video + yılbaşı efektleri (kar, şampanya baloncukları, havai fişek).
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
      {/* Metin okunsun diye siyah → kırmızı gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/45 to-blood/55" />
      {/* Altın ışık hüzmesi */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_bottom,rgba(212,175,55,0.22),transparent_65%)]" />
      {/* Şampanya kadehleri */}
      <Flute className="absolute -bottom-4 left-[-3%] h-[29vh] max-h-[460px] w-auto rotate-[16deg] opacity-70 drop-shadow-[0_0_18px_rgba(212,175,55,0.35)] sm:left-[4%] sm:h-[62vh]" />
      <Flute className="absolute -bottom-4 right-[-3%] h-[29vh] max-h-[460px] w-auto -rotate-[16deg] -scale-x-100 opacity-70 drop-shadow-[0_0_18px_rgba(212,175,55,0.35)] sm:right-[4%] sm:h-[62vh]" />
      {/* Kar, baloncuk ve havai fişek (hareketi azalt açıksa çizilmez) */}
      {showVideo && <HeroFx />}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
      {/* Koşturan Noel Baba ve köpeği */}
      {showVideo && <HeroRunner />}
    </div>
  );
}
