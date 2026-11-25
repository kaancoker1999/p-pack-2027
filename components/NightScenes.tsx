/**
 * "Gece neler var" kartlarının hareketli görselleri: open bar, DJ kabini ve şık çift.
 * Saf SVG + CSS animasyonu (bkz. globals.css → "Gece sahneleri").
 * Dar ekranda sahnenin ortası görünür; önemli öğeler x 80–440 aralığında tutulur.
 */

const RED = '#c1121f';
const DEEP = '#8b0000';
const GOLD = '#d4af37';
const WHITE = '#f4f4f4';
const INK = '#1c1c1c';
const SKIN = '#f2c9a5';
const SKIN2 = '#d9a47a';

function Frame({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className="overflow-hidden bg-gradient-to-b from-[#1a0204] via-[#120103] to-black">
      <svg viewBox="0 0 520 200" preserveAspectRatio="xMidYMax slice" className={`block w-full ${className}`} aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

const STAR = 'M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z';

/* ───────────────────────── Open bar ───────────────────────── */

const BOTTLES = [
  { x: 150, h: 46, c: '#1f4d2b' },
  { x: 180, h: 54, c: '#8a5a1c' },
  { x: 210, h: 42, c: RED },
  { x: 240, h: 58, c: '#d9d9d9' },
  { x: 280, h: 58, c: '#1f4d2b' },
  { x: 310, h: 44, c: GOLD },
  { x: 340, h: 52, c: '#8a5a1c' },
  { x: 370, h: 46, c: RED },
];

export function OpenBarScene({ className = 'h-44 sm:h-60 md:h-48' }: { className?: string }) {
  return (
    <Frame className={className}>
      <defs>
        <radialGradient id="bar-glow" cx="0.5" cy="0.2" r="0.6">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.28" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bar-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1a0a" />
          <stop offset="1" stopColor="#170803" />
        </linearGradient>
      </defs>
      <rect x="-140" y="0" width="800" height="170" fill="url(#bar-glow)" />

      {/* Raf ve şişeler */}
      <rect x="130" y="86" width="260" height="4" rx="2" fill={GOLD} opacity="0.8" />
      {BOTTLES.map((b, i) => (
        <g key={b.x}>
          <rect x={b.x - 8} y={86 - b.h + 14} width="16" height={b.h - 14} rx="4" fill={b.c} />
          <rect x={b.x - 3} y={86 - b.h} width="6" height="16" rx="2" fill={b.c} />
          <rect x={b.x - 4} y={86 - b.h - 3} width="8" height="4" rx="1.5" fill={GOLD} />
          <rect x={b.x - 6} y={86 - b.h + 22} width="12" height="9" rx="1.5" fill={WHITE} opacity="0.75" />
          <rect className="disco-twinkle" style={{ animationDelay: `${-0.17 * i}s`, animationDuration: '1.1s' }} x={b.x - 6} y={86 - b.h + 16} width="2.5" height={b.h - 22} rx="1" fill="#fff" opacity="0.5" />
        </g>
      ))}

      {/* Barmen */}
      <rect x="236" y="96" width="48" height="60" rx="12" fill={WHITE} />
      <path d="M236 110 q0 -14 12 -14 l12 22 l12 -22 q12 0 12 14 v46 h-48 z" fill={INK} />
      <path d="M252 97 l8 7 l8 -7 l0 9 l-8 -4 l-8 4 z" fill={RED} />
      <g className="bar-shake" style={{ transformOrigin: '260px 112px' }}>
        <path d="M240 108 q-16 -18 14 -38" stroke={WHITE} strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M280 108 q16 -18 -8 -38" stroke={WHITE} strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* Shaker */}
        <g transform="rotate(-18 262 58)">
          <rect x="252" y="40" width="20" height="34" rx="6" fill="#d9d9d9" />
          <rect x="254" y="32" width="16" height="12" rx="4" fill="#bdbdbd" />
          <rect x="257" y="27" width="10" height="7" rx="3" fill="#a9a9a9" />
          <rect x="255" y="44" width="3" height="26" rx="1.5" fill="#fff" opacity="0.7" />
        </g>
        <circle cx="254" cy="70" r="6" fill={SKIN} />
        <circle cx="272" cy="70" r="6" fill={SKIN} />
      </g>
      <circle cx="260" cy="82" r="15" fill={SKIN} />
      <path d="M245 80 q1 -16 15 -16 q14 0 15 16 q-15 -9 -30 0 z" fill="#2a1a0f" />
      <circle cx="255" cy="83" r="1.8" fill="#111" />
      <circle cx="265" cy="83" r="1.8" fill="#111" />
      <path d="M255 89 q5 4 10 0" stroke="#a33" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Tezgâh */}
      <rect x="-60" y="150" width="640" height="50" fill="url(#bar-wood)" />
      <rect x="-60" y="144" width="640" height="9" fill="#6b5310" />
      <rect x="-60" y="144" width="640" height="3" fill={GOLD} opacity="0.7" />
      {[0, 65, 130, 200, 260, 320, 390, 455, 520].map((x) => (
        <rect key={x} x={x} y="158" width="2" height="42" fill="#000" opacity="0.35" />
      ))}

      {/* Martini */}
      <path d="M130 108 h44 l-22 24 z" fill={RED} opacity="0.85" />
      <path d="M126 104 h52 l-26 29 z M152 133 v11 M140 144 h24" stroke={WHITE} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx="160" cy="112" r="3.5" fill="#6b8e23" />
      <path d="M160 112 L170 96" stroke={GOLD} strokeWidth="1.5" />

      {/* Şampanya kadehi ve baloncuklar */}
      <path d="M362 100 h20 q0 26 -10 30 q-10 -4 -10 -30 z" fill={GOLD} opacity="0.55" />
      <path d="M360 92 h24 q1 34 -12 39 q-13 -5 -12 -39 z M372 131 v13 M362 144 h20" stroke={WHITE} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      {[0, -0.5, -1, -1.5].map((d, i) => (
        <circle key={d} className="bar-bubble" style={{ animationDelay: `${d}s` }} cx={367 + i * 3.4} cy="124" r="1.8" fill="#fff3c4" />
      ))}

      {/* Shot bardakları */}
      {[404, 422, 440].map((x, i) => (
        <g key={x}>
          <path d={`M${x - 6} 128 h12 l-2 16 h-8 z`} fill={[GOLD, RED, GOLD][i]} opacity="0.6" />
          <path d={`M${x - 7} 124 h14 l-3 20 h-8 z`} stroke={WHITE} strokeWidth="1.5" fill="none" opacity="0.85" />
        </g>
      ))}
      {/* Limon dilimi ve kokteyl */}
      <path d="M84 122 h26 l-3 22 h-20 z" fill="#f2a900" opacity="0.7" />
      <path d="M82 116 h30 l-4 28 h-22 z" stroke={WHITE} strokeWidth="1.5" fill="none" opacity="0.85" />
      <circle cx="110" cy="116" r="7" fill="#f6d743" />
      <path d="M100 100 L92 140" stroke={RED} strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  );
}

/* ───────────────────────── DJ ───────────────────────── */

export function DjScene({ className = 'h-44 sm:h-60 md:h-48' }: { className?: string }) {
  return (
    <Frame className={className}>
      <defs>
        <linearGradient id="dj-beam-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={RED} stopOpacity="0.7" />
          <stop offset="1" stopColor={RED} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dj-beam-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.6" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Işık hüzmeleri */}
      <g className="disco-beams" style={{ transformOrigin: '120px 0px' }}>
        <path d="M120 0 L210 200 h60 z" fill="url(#dj-beam-r)" opacity="0.55" />
        <path d="M120 0 L60 200 h50 z" fill="url(#dj-beam-g)" opacity="0.35" />
      </g>
      <g className="disco-beams" style={{ transformOrigin: '400px 0px', animationDelay: '-1.2s' }}>
        <path d="M400 0 L250 200 h60 z" fill="url(#dj-beam-g)" opacity="0.45" />
        <path d="M400 0 L410 200 h50 z" fill="url(#dj-beam-r)" opacity="0.4" />
      </g>

      {/* Hoparlörler */}
      {[92, 428].map((x) => (
        <g key={x}>
          <rect x={x - 32} y="66" width="64" height="134" rx="6" fill="#111" stroke="#2c2c2c" strokeWidth="2" />
          <circle className="dj-speaker" cx={x} cy="96" r="14" fill="#262626" stroke={GOLD} strokeWidth="2" />
          <circle className="dj-speaker" style={{ animationDelay: '-0.1s' }} cx={x} cy="150" r="24" fill="#262626" stroke={GOLD} strokeWidth="2.5" />
          <circle cx={x} cy="96" r="4" fill="#0a0a0a" />
          <circle cx={x} cy="150" r="8" fill="#0a0a0a" />
        </g>
      ))}

      {/* Notalar */}
      {[
        { x: 168, d: 0 },
        { x: 352, d: -0.8 },
        { x: 300, d: -1.5 },
      ].map((n) => (
        <text key={n.x} className="dj-note" style={{ animationDelay: `${n.d}s` }} x={n.x} y="70" fontSize="22" fill={GOLD}>
          ♪
        </text>
      ))}

      {/* DJ */}
      <g className="dj-bob">
        <rect x="236" y="82" width="48" height="56" rx="12" fill={DEEP} />
        <path d="M250 84 h20 l-10 14 z" fill={INK} />
        {/* Havadaki kol */}
        <g className="arm-up-r" style={{ transformOrigin: '280px 90px' }}>
          <rect x="275" y="88" width="10" height="36" rx="5" fill={DEEP} />
          <circle cx="280" cy="126" r="6" fill={SKIN2} />
        </g>
        {/* Plaktaki kol */}
        <path d="M240 92 q-22 14 -30 34" stroke={DEEP} strokeWidth="10" fill="none" strokeLinecap="round" />
        <circle cx="209" cy="127" r="6" fill={SKIN2} />
        <circle cx="260" cy="66" r="15" fill={SKIN2} />
        <path d="M245 62 q2 -14 15 -14 q13 0 15 14 q-15 -7 -30 0 z" fill="#111" />
        <rect x="251" y="64" width="18" height="6" rx="3" fill="#111" />
        {/* Kulaklık */}
        <path d="M244 68 q0 -22 16 -22 q16 0 16 22" stroke={GOLD} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <rect x="239" y="62" width="8" height="14" rx="4" fill={GOLD} />
        <rect x="273" y="62" width="8" height="14" rx="4" fill={GOLD} />
        <path d="M255 76 q5 4 10 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* Kabin */}
      <rect x="160" y="136" width="200" height="64" rx="6" fill="#141414" stroke={GOLD} strokeWidth="1.5" />
      <rect x="152" y="128" width="216" height="12" rx="4" fill="#2a2a2a" />
      {/* Plaklar (dönen parlama) */}
      {[206, 314].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy="128" rx="30" ry="8" fill="#0a0a0a" stroke="#3a3a3a" strokeWidth="1.5" />
          <ellipse className="dj-spin" style={{ animationDelay: `${-0.4 * i}s` }} cx={x} cy="128" rx="22" ry="5.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="14 110" opacity="0.8" />
          <ellipse cx={x} cy="128" rx="8" ry="2.2" fill={RED} />
        </g>
      ))}
      <rect x="246" y="124" width="28" height="8" rx="2" fill="#3a3a3a" />
      {[251, 258, 265].map((x) => (
        <rect key={x} x={x} y="122" width="3" height="6" rx="1" fill={GOLD} />
      ))}
      {/* Ekolayzır */}
      {Array.from({ length: 14 }, (_, i) => (
        <rect
          key={i}
          className="dj-eq"
          style={{ animationDelay: `${-((i * 37) % 60) / 100}s`, animationDuration: `${0.32 + ((i * 13) % 5) * 0.05}s` }}
          x={176 + i * 12.4}
          y="150"
          width="8"
          height="40"
          rx="2"
          fill={i % 3 === 0 ? GOLD : RED}
        />
      ))}
    </Frame>
  );
}

/* ───────────────────────── Dress code: yılbaşı konsepti ───────────────────────── */

const SPARKLES = [
  { x: 60, y: 130, s: 0.9, d: 0 },
  { x: 196, y: 120, s: 0.7, d: -0.3 },
  { x: 204, y: 52, s: 0.7, d: -0.6 },
  { x: 318, y: 56, s: 0.8, d: -0.2 },
  { x: 330, y: 126, s: 0.7, d: -0.5 },
  { x: 462, y: 132, s: 0.9, d: -0.8 },
];

export function ElegantScene({ className = 'h-44 sm:h-60 md:h-48' }: { className?: string }) {
  return (
    <Frame className={className}>
      <defs>
        <radialGradient id="el-glow" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.3" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="el-sequin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e7a8" />
          <stop offset="1" stopColor="#b8901f" />
        </linearGradient>
      </defs>
      <rect x="-140" y="0" width="800" height="200" fill="url(#el-glow)" />

      {/* Süs zinciri */}
      <path d="M-20 10 q140 44 280 6 q140 -38 280 8" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.7" />
      {[40, 100, 160, 220, 300, 360, 420, 480].map((x, i) => (
        <path
          key={x}
          className="disco-twinkle"
          style={{ animationDelay: `${-0.13 * i}s`, animationDuration: '0.9s' }}
          d="M0 0 l5 9 h-10 z"
          transform={`translate(${x} ${[26, 36, 38, 30, 16, 12, 14, 22][i]})`}
          fill={[RED, GOLD, '#fff3c4'][i % 3]}
        />
      ))}

      {/* 2027 balonları */}
      {[
        { x: 104, y: 78, d: '2', c: GOLD, delay: 0 },
        { x: 150, y: 62, d: '0', c: RED, delay: -0.6 },
        { x: 372, y: 62, d: '2', c: RED, delay: -0.3 },
        { x: 418, y: 78, d: '7', c: GOLD, delay: -0.9 },
      ].map((b) => (
        <g key={b.x} className="el-balloon" style={{ animationDelay: `${b.delay}s` }}>
          <path d={`M${b.x} ${b.y + 26} q-8 40 4 96`} stroke="#bdbdbd" strokeWidth="1" fill="none" opacity="0.6" />
          <ellipse cx={b.x} cy={b.y} rx="21" ry="26" fill={b.c} />
          <ellipse cx={b.x - 8} cy={b.y - 10} rx="4" ry="7" fill="#fff" opacity="0.35" />
          <path d={`M${b.x - 4} ${b.y + 25} h8 l-4 6 z`} fill={b.c} />
          <text x={b.x} y={b.y + 9} textAnchor="middle" fontSize="26" fontWeight="700" fill={b.c === GOLD ? '#3a2a00' : '#fff'} fontFamily="Georgia, serif">
            {b.d}
          </text>
        </g>
      ))}

      <ellipse cx="260" cy="192" rx="74" ry="6" fill="#000" opacity="0.5" />

      {/* Şık ama rahat giyinmiş çift: takım elbise / gece elbisesi yok */}
      <g className="el-waltz" style={{ transformOrigin: '260px 190px' }}>
        {/* Bey: gömlek + koyu pantolon */}
        <rect x="222" y="140" width="10" height="50" rx="5" fill="#23262e" />
        <rect x="236" y="140" width="10" height="50" rx="5" fill="#23262e" />
        <path d="M218 188 h16 v5 h-20 z M234 188 h16 v5 h-20 z" fill={WHITE} />
        <rect x="216" y="90" width="36" height="56" rx="11" fill={DEEP} />
        <path d="M226 90 l8 10 l8 -10 l-3 -4 h-10 z" fill="#a40f1b" />
        <path d="M234 100 v44" stroke="#5a0000" strokeWidth="1.5" />
        {[110, 122, 134].map((y) => (
          <circle key={y} cx="234" cy={y} r="1.4" fill="#fff3c4" />
        ))}
        <circle cx="234" cy="72" r="14" fill={SKIN2} />
        <path d="M220 70 q1 -15 14 -15 q13 0 14 13 q-14 -6 -28 2 z" fill="#1a120b" />
        <path d="M230 78 q4 3 8 0" stroke="#7a2e2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Hanım: pullu bluz + siyah pantolon */}
        <rect x="278" y="140" width="10" height="50" rx="5" fill={INK} />
        <rect x="292" y="140" width="10" height="50" rx="5" fill={INK} />
        <path d="M274 188 h16 v5 h-20 z M290 188 h16 v5 h-20 z" fill={RED} />
        <rect x="270" y="94" width="36" height="52" rx="11" fill="url(#el-sequin)" />
        {[
          [278, 106],
          [290, 112],
          [298, 102],
          [282, 124],
          [296, 130],
          [288, 138],
        ].map(([x, y], i) => (
          <circle key={`${x}-${y}`} className="disco-twinkle" style={{ animationDelay: `${-0.2 * i}s`, animationDuration: '0.7s' }} cx={x} cy={y} r="1.8" fill="#fff" />
        ))}
        <circle cx="288" cy="78" r="13" fill={SKIN} />
        <path d="M275 80 q-3 -20 13 -20 q16 0 13 20 q2 14 -2 22 q1 -24 -11 -30 q-12 6 -11 30 q-4 -8 -2 -22 z" fill="#7a4a18" />
        <path d="M284 84 q4 3 8 0" stroke="#a33" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Parti şapkaları */}
        <path d="M224 60 l10 -24 l10 24 z" fill={GOLD} />
        <circle cx="234" cy="35" r="3.5" fill={RED} />
        <path d="M278 66 l10 -24 l10 24 z" fill={RED} />
        <circle cx="288" cy="41" r="3.5" fill={GOLD} />
        {/* Kollar: kadeh tokuşturuyorlar */}
        <path d="M250 102 q10 -6 10 -28" stroke={DEEP} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M272 104 q-8 -8 -8 -30" stroke="url(#el-sequin)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="260" cy="72" r="5.5" fill={SKIN2} />
        <circle cx="264" cy="72" r="5.5" fill={SKIN} />
        <path d="M252 46 h10 q0 14 -5 16 q-5 -2 -5 -16 z M257 62 v8" stroke={WHITE} strokeWidth="1.5" fill="#f6e7a8" fillOpacity="0.6" />
        <path d="M262 46 h10 q0 14 -5 16 q-5 -2 -5 -16 z M267 62 v8" stroke={WHITE} strokeWidth="1.5" fill="#f6e7a8" fillOpacity="0.6" />
        <path className="disco-twinkle" d={STAR} transform="translate(262 40) scale(0.8)" fill="#fff" />
        <path d="M218 104 q-10 20 6 36" stroke={DEEP} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M304 106 q10 18 -4 34" stroke="url(#el-sequin)" strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>

      {/* Işıltılar */}
      {SPARKLES.map((p) => (
        <path
          key={`${p.x}-${p.y}`}
          className="disco-twinkle"
          style={{ animationDelay: `${p.d}s`, animationDuration: '0.8s' }}
          d={STAR}
          transform={`translate(${p.x} ${p.y}) scale(${p.s})`}
          fill="#fff3c4"
        />
      ))}
    </Frame>
  );
}
