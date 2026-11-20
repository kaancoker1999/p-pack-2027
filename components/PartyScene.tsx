/**
 * Bilet bölümündeki eğlenceli sahne: dönen döner + onu kesen usta ve yanında dans eden kalabalık.
 * Saf SVG + CSS animasyonu (bkz. globals.css → "Döner ve dans sahnesi").
 */

type DancerProps = {
  x: number;
  y?: number;
  scale?: number;
  top: string;
  bottom: string;
  skin: string;
  hair: string;
  arms: 'up' | 'low' | 'mixed';
  delay: number;
  dress?: boolean;
  opacity?: number;
};

function Dancer({ x, y = 222, scale = 1, top, bottom, skin, hair, arms, delay, dress, opacity = 1 }: DancerProps) {
  const d = { animationDelay: `${delay}s` };
  const left = arms === 'low' ? 'arm-low-l' : 'arm-up-l';
  const right = arms === 'up' ? 'arm-up-r' : 'arm-low-r';
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <g className="dance-bounce" style={d}>
        <g className="dance-sway" style={{ ...d, transformOrigin: '0px 0px' }}>
          {/* Bacaklar */}
          <rect x="-10" y="-40" width="8" height="40" rx="4" fill={bottom} />
          <rect x="2" y="-40" width="8" height="40" rx="4" fill={bottom} />
          {/* Kollar */}
          <g className={left} style={{ ...d, transformOrigin: '-12px -76px' }}>
            <rect x="-16" y="-78" width="8" height="32" rx="4" fill={top} />
            <circle cx="-12" cy="-44" r="4.5" fill={skin} />
          </g>
          <g className={right} style={{ ...d, transformOrigin: '12px -76px' }}>
            <rect x="8" y="-78" width="8" height="32" rx="4" fill={top} />
            <circle cx="12" cy="-44" r="4.5" fill={skin} />
          </g>
          {/* Gövde */}
          {dress ? (
            <path d="M-12 -80 h24 l8 52 h-40 z" fill={top} />
          ) : (
            <rect x="-13" y="-80" width="26" height="44" rx="8" fill={top} />
          )}
          {/* Baş */}
          <circle cx="0" cy="-93" r="11" fill={skin} />
          {dress ? (
            <path d="M-12 -92 q0 -15 12 -15 q12 0 12 15 q2 14 -3 20 q2 -18 -9 -22 q-11 4 -9 22 q-5 -6 -3 -20 z" fill={hair} />
          ) : (
            <path d="M-11 -95 q1 -12 11 -12 q10 0 11 12 q-11 -7 -22 0 z" fill={hair} />
          )}
        </g>
      </g>
    </g>
  );
}

const RED = '#c1121f';
const DEEP = '#8b0000';
const GOLD = '#d4af37';
const WHITE = '#f4f4f4';
const INK = '#1c1c1c';
const SKINS = ['#f2c9a5', '#d9a47a', '#b97d54', '#f5d6ba'];
const HAIRS = ['#2a1a0f', '#111111', '#7a4a18', '#d9b45a'];

const BACK_ROW: DancerProps[] = Array.from({ length: 16 }, (_, i) => ({
  x: 30 + i * 56,
  y: 206,
  scale: 0.78,
  opacity: 0.5,
  top: [DEEP, '#3a3a3a', '#6b5310'][i % 3],
  bottom: '#151515',
  skin: SKINS[(i + 1) % 4],
  hair: HAIRS[(i + 2) % 4],
  arms: (['up', 'mixed', 'low'] as const)[i % 3],
  delay: -(i * 0.13),
  dress: i % 4 === 1,
}));

const FRONT_STYLES: Omit<DancerProps, 'x'>[] = [
  { top: RED, bottom: INK, skin: SKINS[0], hair: HAIRS[0], arms: 'up', delay: 0, dress: true },
  { top: WHITE, bottom: INK, skin: SKINS[1], hair: HAIRS[1], arms: 'mixed', delay: -0.2 },
  { top: GOLD, bottom: INK, skin: SKINS[3], hair: HAIRS[3], arms: 'up', delay: -0.1, dress: true },
  { top: INK, bottom: '#2b2b2b', skin: SKINS[2], hair: HAIRS[1], arms: 'low', delay: -0.3 },
  { top: RED, bottom: INK, skin: SKINS[1], hair: HAIRS[2], arms: 'up', delay: -0.15 },
];
/** Ön sıra: dönercinin solunda ve sağında beşer kişi (ortası ustaya ayrılmış). */
const FRONT_ROW: DancerProps[] = [
  ...[300, 235, 170, 105, 40].map((x, i) => ({ ...FRONT_STYLES[i], x })),
  ...[600, 665, 730, 795, 860].map((x, i) => ({ ...FRONT_STYLES[(i + 2) % 5], x, delay: -0.07 * i - 0.05 })),
];

function DonerStand() {
  return (
    <g transform="translate(345 0)">
      <defs>
        <linearGradient id="doner-meat" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6e3a12" />
          <stop offset="0.45" stopColor="#c47a35" />
          <stop offset="1" stopColor="#7c4317" />
        </linearGradient>
        <clipPath id="doner-clip">
          <path d="M60 50 h30 q24 20 22 52 q-2 48 -20 86 h-34 q-18 -38 -20 -86 q-2 -32 22 -52 z" />
        </clipPath>
        <radialGradient id="doner-heat" cx="0" cy="0.5" r="1">
          <stop offset="0" stopColor="#ff7a1a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Zemin */}
      <ellipse cx="150" cy="222" rx="135" ry="7" fill="#000" opacity="0.45" />

      {/* Izgara / ısıtıcı */}
      <rect x="14" y="52" width="18" height="150" rx="4" fill="#2a2a2a" />
      <g className="doner-glow">
        {[66, 92, 118, 144, 170].map((y) => (
          <rect key={y} x="18" y={y} width="10" height="16" rx="3" fill="#ff7a1a" />
        ))}
      </g>
      <rect x="30" y="48" width="70" height="160" fill="url(#doner-heat)" />

      {/* Şiş ve taban */}
      <rect x="73" y="26" width="4" height="184" fill="#bdbdbd" />
      <rect x="40" y="206" width="72" height="10" rx="3" fill="#3a3a3a" />
      <circle cx="75" cy="34" r="9" fill="#d62828" />
      <path d="M75 25 q4 -6 8 -3" stroke="#3a7d2c" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Döner (dönme efekti: içindeki çizgiler yana kayar) */}
      <path d="M60 50 h30 q24 20 22 52 q-2 48 -20 86 h-34 q-18 -38 -20 -86 q-2 -32 22 -52 z" fill="url(#doner-meat)" />
      <g clipPath="url(#doner-clip)">
        <g className="doner-spin">
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M${18 + i * 16} 46 q6 24 -2 48 q-8 24 2 48 q8 24 -2 50`}
              stroke="#5a2d0c"
              strokeWidth="3.5"
              fill="none"
              opacity="0.55"
            />
          ))}
        </g>
        {/* Yatay kat izleri */}
        {[74, 98, 122, 146, 170].map((y) => (
          <path key={y} d={`M30 ${y} q45 7 90 0`} stroke="#4a240a" strokeWidth="1.5" fill="none" opacity="0.4" />
        ))}
        <rect x="88" y="46" width="10" height="150" fill="#ffd9a0" opacity="0.18" />
      </g>

      {/* Buhar */}
      <g stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path className="doner-steam" d="M58 44 q-6 -9 0 -18 q6 -9 0 -18" />
        <path className="doner-steam" style={{ animationDelay: '-0.9s' }} d="M92 44 q6 -9 0 -18 q-6 -9 0 -18" />
      </g>

      {/* Düşen dilimler */}
      {[0, -0.45, -0.9].map((delay) => (
        <rect key={delay} className="doner-slice" style={{ animationDelay: `${delay}s` }} x="108" y="118" width="10" height="4" rx="2" fill="#a85f25" />
      ))}

      {/* ───── Usta ───── */}
      {/* Bacaklar */}
      <rect x="180" y="168" width="11" height="46" rx="5" fill={INK} />
      <rect x="196" y="168" width="11" height="46" rx="5" fill={INK} />
      <path d="M170 212 h22 v6 h-26 z M194 212 h22 v6 h-26 z" fill="#0c0c0c" />
      {/* Tabak tutan kol */}
      <path d="M182 122 q-22 26 -40 50" stroke={WHITE} strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx="142" cy="172" r="5.5" fill={SKINS[0]} />
      <ellipse cx="128" cy="180" rx="27" ry="5" fill="#e6e6e6" />
      <path d="M110 178 q8 -9 18 -6 q10 -5 18 6 z" fill="#a85f25" />
      {/* Gövde */}
      <rect x="170" y="98" width="46" height="78" rx="12" fill={WHITE} />
      <path d="M176 130 h34 v46 h-34 z" fill={RED} />
      <circle cx="193" cy="110" r="2" fill={GOLD} />
      <circle cx="193" cy="120" r="2" fill={GOLD} />
      {/* Baş */}
      <circle cx="192" cy="80" r="16" fill={SKINS[0]} />
      <circle cx="185" cy="78" r="2" fill="#111" />
      <path d="M176 86 q8 -6 14 1 q-7 5 -14 -1 z" fill="#2a1a0f" />
      <path d="M180 92 q5 3 9 0" stroke="#a33" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Aşçı şapkası */}
      <rect x="178" y="56" width="30" height="12" rx="2" fill={WHITE} />
      <circle cx="183" cy="50" r="9" fill={WHITE} />
      <circle cx="194" cy="46" r="10" fill={WHITE} />
      <circle cx="204" cy="51" r="8" fill={WHITE} />
      {/* Bıçaklı kol (yukarı-aşağı keser) */}
      <g className="doner-knife" style={{ transformOrigin: '186px 114px' }}>
        <path d="M186 114 L146 114" stroke={WHITE} strokeWidth="10" strokeLinecap="round" />
        <circle cx="142" cy="114" r="6" fill={SKINS[0]} />
        <rect x="130" y="110.5" width="16" height="7" rx="3" fill="#3b2412" />
        <path d="M130 111 L84 112.5 q-4 1.5 0 3 L130 117 z" fill="#d9d9d9" />
      </g>
    </g>
  );
}

export default function PartyScene() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a0204] via-[#120103] to-black">
      {/* Dar ekranda sahnenin ortası (usta + yanındakiler) görünür, geniş ekranda tamamı. */}
      <svg viewBox="0 0 900 240" preserveAspectRatio="xMidYMax slice" className="block h-56 w-full sm:h-64 lg:h-72" aria-hidden="true">
        <defs>
          <radialGradient id="floor-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={RED} stopOpacity="0.5" />
            <stop offset="1" stopColor={RED} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3c4" stopOpacity="0.5" />
            <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="450" cy="226" rx="440" ry="150" fill="url(#floor-glow)" />

        {/* Disko topu ve ışıklar */}
        <g className="disco-beams" style={{ transformOrigin: '450px 30px' }}>
          <path d="M450 30 L250 240 h50 z" fill="url(#beam)" opacity="0.45" />
          <path d="M450 30 L600 240 h50 z" fill="url(#beam)" opacity="0.4" />
          <path d="M450 30 L60 240 h46 z" fill="url(#beam)" opacity="0.28" />
          <path d="M450 30 L800 240 h46 z" fill="url(#beam)" opacity="0.28" />
        </g>
        <rect x="449" y="0" width="2" height="14" fill="#bdbdbd" />
        <circle cx="450" cy="30" r="16" fill="#cfcfcf" />
        <g stroke="#8d8d8d" strokeWidth="1" fill="none">
          <path d="M434 30 h32 M437 21 h26 M437 39 h26 M450 14 v32 M441 16 q-6 14 0 28 M459 16 q6 14 0 28" />
        </g>
        <circle className="disco-twinkle" cx="443" cy="23" r="3" fill="#ffffff" />
        <circle className="disco-twinkle" style={{ animationDelay: '-0.4s' }} cx="458" cy="36" r="2.5" fill="#fff3c4" />

        <ellipse cx="450" cy="224" rx="430" ry="8" fill="#000" opacity="0.45" />
        {BACK_ROW.map((p, i) => (
          <Dancer key={`b${i}`} {...p} />
        ))}
        {/* Dönerci kalabalığın tam ortasında */}
        <DonerStand />
        {FRONT_ROW.map((p, i) => (
          <Dancer key={`f${i}`} {...p} />
        ))}
      </svg>
    </div>
  );
}
