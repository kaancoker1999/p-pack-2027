import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { event } from '@/config/event';
import { secret } from './env';

/** 128 bit rastgele bilet kimliği (32 büyük harf hex). */
export function newTicketId(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

export function signTicket(id: string): string {
  return createHmac('sha256', secret('TICKET_SECRET')).update(id).digest('hex').toUpperCase();
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Veritabanındaki imza gerçekten bu kimliğe mi ait? */
export function verifyTicketSignature(id: string, signature: string): boolean {
  return safeEqual(signTicket(id), signature.toUpperCase());
}

/** QR içeriği: IST27.<id>.<imzanın ilk 128 biti> — büyük harf, QR'ın kompakt alfanümerik modu için. */
export function qrPayload(id: string, signature: string): string {
  return `${event.codePrefix}.${id}.${signature.slice(0, 32)}`;
}

/** Code128 barkod içeriği: kimliğin 40 haneli ondalık hali (Code C ile yarı genişlikte basılır). */
export function barcodeDigits(id: string): string {
  return BigInt(`0x${id}`).toString().padStart(40, '0');
}

/** Kimliği okunur gruplara böler: A1B2 C3D4 … */
export function prettyId(id: string): string {
  return id.match(/.{1,4}/g)?.join(' ') ?? id;
}

export type ParsedCode = { kind: 'id'; id: string } | { kind: 'prefix'; prefix: string } | { kind: 'invalid' };

/** Kapıda okutulan / elle girilen kodu çözer. */
export function parseScannedCode(raw: string): ParsedCode {
  const s = raw.trim().toUpperCase();

  // 1) QR: IST27.<id>.<imza>
  const qr = s.match(new RegExp(`^${event.codePrefix}\\.([0-9A-F]{32})\\.([0-9A-F]{32})$`));
  if (qr) {
    return safeEqual(signTicket(qr[1]).slice(0, 32), qr[2]) ? { kind: 'id', id: qr[1] } : { kind: 'invalid' };
  }
  if (s.startsWith(`${event.codePrefix}.`)) return { kind: 'invalid' };

  // 2) Bilet sayfası linki
  const url = s.match(/\/TICKET\/([0-9A-F]{32})(?:[/?#]|$)/);
  if (url) return { kind: 'id', id: url[1] };

  const compact = s.replace(/[\s\-.]/g, '');
  // 3) Barkod: 40 haneli ondalık
  if (/^\d{40}$/.test(compact)) {
    const hex = BigInt(compact).toString(16).toUpperCase();
    return hex.length <= 32 ? { kind: 'id', id: hex.padStart(32, '0') } : { kind: 'invalid' };
  }
  // 4) Elle giriş: tam kimlik ya da en az 8 karakterlik başlangıcı
  if (/^[0-9A-F]{32}$/.test(compact)) return { kind: 'id', id: compact };
  if (/^[0-9A-F]{8,31}$/.test(compact)) return { kind: 'prefix', prefix: compact };
  return { kind: 'invalid' };
}
