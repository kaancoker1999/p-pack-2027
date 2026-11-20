import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { event } from '@/config/event';
import { secret } from './env';

// Karışan karakterler yok: 0/O, 1/I/L
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

/** Tahmin edilemez referans kodu, ör. IST27-7K3QX (kriptografik rastgele). */
export function newReference(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${event.codePrefix}-${s}`;
}

export const REFERENCE_RE = new RegExp(`^${event.codePrefix}-[${ALPHABET}]{5}$`);

function mac(reference: string, ts: string): string {
  return createHmac('sha256', secret('SESSION_SECRET')).update(`ref:${reference}:${ts}`).digest('hex');
}

/**
 * Referans, veritabanına hiçbir şey yazılmadan ödeme ekranında gösterilir.
 * Sunucunun ürettiğini kanıtlamak için imzalı bir jeton eşlik eder.
 */
export function signReference(reference: string): string {
  const ts = Date.now().toString(36);
  return `${ts}.${mac(reference, ts)}`;
}

export function verifyReference(reference: string, token: string): boolean {
  if (!REFERENCE_RE.test(reference)) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued) || Date.now() - issued > TOKEN_TTL_MS) return false;
  const a = Buffer.from(mac(reference, ts));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
