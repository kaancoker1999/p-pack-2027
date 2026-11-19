// Hero için yer tutucu poster üretir (public/poster.jpg). Kendi görselinizi koyduğunuzda gerekmez.
import sharp from 'sharp';

const W = 1600;
const H = 900;
let seed = 2027;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

let dots = '';
for (let i = 0; i < 170; i++) {
  const x = rnd() * W;
  const y = H - Math.pow(rnd(), 1.6) * H;
  const r = 1 + rnd() * 5 + (rnd() > 0.93 ? 14 * rnd() : 0);
  const o = 0.15 + rnd() * 0.6;
  dots += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="url(#g)" opacity="${o.toFixed(2)}"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050505"/><stop offset="0.6" stop-color="#1a0204"/><stop offset="1" stop-color="#5a0008"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="1" r="0.8"><stop offset="0" stop-color="#C1121F" stop-opacity="0.55"/><stop offset="1" stop-color="#C1121F" stop-opacity="0"/></radialGradient>
  <radialGradient id="g"><stop offset="0" stop-color="#fff3c4"/><stop offset="0.5" stop-color="#D4AF37"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="1.2"/></filter>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#glow)"/>
<g filter="url(#blur)">${dots}</g></svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 72, mozjpeg: true }).toFile('public/poster.jpg');
console.log('public/poster.jpg yazıldı');
