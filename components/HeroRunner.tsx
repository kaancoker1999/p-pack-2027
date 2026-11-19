/**
 * Hero'nun altında bir uçtan diğerine koşturan Noel Baba ve köpeği.
 * Saf SVG + CSS animasyonu (bkz. globals.css → "Koşan Noel Baba").
 */
export default function HeroRunner() {
  return (
    <div className="runner-track pointer-events-none absolute bottom-3 left-0 sm:bottom-6" aria-hidden="true">
      <svg viewBox="0 0 270 130" className="runner-bob h-[74px] w-auto drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)] sm:h-[120px]">
        {/* ───── Noel Baba ───── */}
        {/* Çuval */}
        <ellipse cx="30" cy="48" rx="20" ry="23" fill="#8a5a1c" />
        <path d="M40 30 q8 -6 14 2" stroke="#d4af37" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Arka kol */}
        <g className="swing-b" style={{ transformOrigin: '56px 50px' }}>
          <rect x="51" y="48" width="11" height="26" rx="5.5" fill="#8b0000" />
          <circle cx="56.5" cy="77" r="6" fill="#fff" />
        </g>
        {/* Arka bacak */}
        <g className="swing-a" style={{ transformOrigin: '56px 80px' }}>
          <rect x="50" y="78" width="12" height="28" rx="5" fill="#8b0000" />
          <path d="M48 104 h20 a5 5 0 0 1 5 5 v3 h-25 z" fill="#111" />
        </g>
        {/* Ön bacak */}
        <g className="swing-b" style={{ transformOrigin: '66px 80px' }}>
          <rect x="60" y="78" width="12" height="28" rx="5" fill="#c1121f" />
          <path d="M58 104 h20 a5 5 0 0 1 5 5 v3 h-25 z" fill="#1c1c1c" />
        </g>
        {/* Gövde */}
        <ellipse cx="60" cy="62" rx="24" ry="25" fill="#c1121f" />
        <path d="M37 76 q23 14 46 0 v8 q-23 12 -46 0 z" fill="#fff" />
        <rect x="36" y="60" width="48" height="8" fill="#111" />
        <rect x="64" y="58" width="12" height="12" rx="2" fill="none" stroke="#d4af37" strokeWidth="3" />
        {/* Ön kol */}
        <g className="swing-a" style={{ transformOrigin: '64px 48px' }}>
          <rect x="58" y="46" width="12" height="28" rx="6" fill="#c1121f" />
          <rect x="57" y="68" width="14" height="6" rx="3" fill="#fff" />
          <circle cx="64" cy="79" r="6.5" fill="#111" />
        </g>
        {/* Baş */}
        <circle cx="70" cy="30" r="13" fill="#f2c9a5" />
        <path d="M58 30 q-2 22 14 24 q16 0 12 -22 q-6 8 -13 8 q-8 0 -13 -10 z" fill="#fff" />
        <circle cx="76" cy="27" r="1.8" fill="#111" />
        <circle cx="82" cy="33" r="3" fill="#e79a8a" />
        <path d="M70 37 q6 4 12 0" stroke="#e9e9e9" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Şapka */}
        <path d="M57 24 q4 -22 26 -6 q-18 -6 -44 14 q8 -2 12 -4 z" fill="#c1121f" />
        <rect x="55" y="19" width="30" height="8" rx="4" fill="#fff" />
        <circle cx="38" cy="33" r="6" fill="#fff" />

        {/* ───── Köpek ───── */}
        {/* Kuyruk */}
        <g className="wag" style={{ transformOrigin: '172px 86px' }}>
          <path d="M172 86 q-14 -6 -12 -22" stroke="#b9772f" strokeWidth="7" fill="none" strokeLinecap="round" />
        </g>
        {/* Arka bacaklar */}
        <g className="swing-a" style={{ transformOrigin: '182px 94px' }}>
          <rect x="178" y="92" width="8" height="22" rx="4" fill="#8f5a20" />
        </g>
        <g className="swing-b" style={{ transformOrigin: '190px 94px' }}>
          <rect x="186" y="92" width="8" height="22" rx="4" fill="#b9772f" />
        </g>
        {/* Ön bacaklar */}
        <g className="swing-b" style={{ transformOrigin: '216px 94px' }}>
          <rect x="212" y="92" width="8" height="22" rx="4" fill="#8f5a20" />
        </g>
        <g className="swing-a" style={{ transformOrigin: '224px 94px' }}>
          <rect x="220" y="92" width="8" height="22" rx="4" fill="#b9772f" />
        </g>
        {/* Gövde */}
        <ellipse cx="201" cy="88" rx="30" ry="13" fill="#b9772f" />
        <ellipse cx="204" cy="93" rx="16" ry="6" fill="#e9c48f" />
        {/* Tasma */}
        <rect x="222" y="74" width="7" height="18" rx="3" fill="#c1121f" transform="rotate(-18 225 83)" />
        <circle cx="229" cy="91" r="3" fill="#d4af37" />
        {/* Baş */}
        <circle cx="236" cy="72" r="13" fill="#b9772f" />
        <ellipse cx="249" cy="77" rx="9" ry="7" fill="#e9c48f" />
        <circle cx="256" cy="74" r="3" fill="#111" />
        <circle cx="240" cy="68" r="2" fill="#111" />
        <path d="M246 82 q4 6 9 1" stroke="#c1121f" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M228 62 q-10 4 -6 22 q8 -4 10 -18 z" fill="#7a4a18" />
        {/* Köpeğin minik şapkası */}
        <path d="M228 60 q8 -18 20 -4 z" fill="#c1121f" />
        <rect x="226" y="58" width="24" height="5" rx="2.5" fill="#fff" />
        <circle cx="236" cy="45" r="3.5" fill="#fff" />
      </svg>
    </div>
  );
}
