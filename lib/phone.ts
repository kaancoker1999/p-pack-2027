/**
 * Telefon numarasını tek biçime getirir: +905321234567
 * Kabul edilenler: 0532 123 45 67 · 532 123 45 67 · +90 532 123 45 67 · 0090… · +44 7911 123456
 * Geçersizse null döner.
 */
export function normalizePhone(raw: string): string | null {
  let s = raw.trim().replace(/[\s().\-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!/^\+?\d+$/.test(s)) return null;
  if (!s.startsWith('+')) {
    if (/^0?5\d{9}$/.test(s)) s = `+90${s.replace(/^0/, '')}`; // Türkiye cep
    else if (/^90?5\d{9}$/.test(s) && s.length === 12) s = `+${s}`;
    else return null; // yurt dışı numaralar ülke koduyla (+) yazılmalı
  }
  const digits = s.slice(1);
  if (digits.length < 8 || digits.length > 15 || digits.startsWith('0')) return null;
  if (digits.startsWith('90') && !/^905\d{9}$/.test(digits)) return null;
  return `+${digits}`;
}

/** +905321234567 → +90 532 123 45 67 (yalnızca gösterim) */
export function prettyPhone(e164: string): string {
  const m = e164.match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+90 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
