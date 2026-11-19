import { event, type Currency, type PriceTier } from '@/config/event';
import type { Locale } from '@/i18n';

/** Verilen anda geçerli fiyat dönemi. Satış kapandıysa null. */
export function tierAt(now: Date = new Date()): PriceTier | null {
  const t = now.getTime();
  for (const tier of event.priceTiers) {
    if (t < new Date(tier.until).getTime()) return tier;
  }
  return null;
}

/** Şu anki dönemden sonraki dönem (yoksa null). */
export function nextTierAt(now: Date = new Date()): PriceTier | null {
  const current = tierAt(now);
  if (!current) return null;
  const i = event.priceTiers.findIndex((x) => x.id === current.id);
  return event.priceTiers[i + 1] ?? null;
}

export function tierStart(tier: PriceTier): Date | null {
  const i = event.priceTiers.findIndex((x) => x.id === tier.id);
  return i > 0 ? new Date(event.priceTiers[i - 1].until) : null;
}

export function formatMoney(amount: number, currency: Currency, locale: Locale): string {
  const n = amount.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US');
  const sym = currency === 'TRY' ? '₺' : '€';
  return locale === 'tr' ? `${n} ${sym}` : `${sym}${n}`;
}

const dtLocale = (l: Locale) => (l === 'tr' ? 'tr-TR' : 'en-GB');

/** "20 Aralık" / "20 December" — İstanbul saatine göre */
export function formatDayMonth(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(dtLocale(locale), {
    day: 'numeric',
    month: 'long',
    timeZone: event.timeZone,
  }).format(d);
}

export function formatDateTime(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(dtLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: event.timeZone,
  }).format(d);
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: event.timeZone,
  }).format(d);
}

/** "31 Aralık 2026" / "31 December 2026" */
export function formatEventDate(locale: Locale): string {
  return new Intl.DateTimeFormat(dtLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: event.timeZone,
  }).format(new Date(event.startsAt));
}

export function formatEventTime(): string {
  return formatTime(new Date(event.startsAt));
}

/** Türkçe bulunma eki: "20 Aralık" → "20 Aralık'ta", "30 Kasım" → "30 Kasım'da" */
export function trLocative(s: string): string {
  const lower = s.toLocaleLowerCase('tr-TR');
  const vowels = [...lower].filter((c) => 'aeıioöuü'.includes(c));
  const lastVowel = vowels[vowels.length - 1] ?? 'e';
  const back = 'aıou'.includes(lastVowel);
  const hard = 'fstkçşhp'.includes(lower[lower.length - 1]);
  return `${s}'${hard ? 't' : 'd'}${back ? 'a' : 'e'}`;
}

/**
 * Bir dönemin son günü (gösterim için). until = 1 Aralık 00:00 ise son gün 30 Kasım'dır.
 */
export function tierLastDay(tier: PriceTier): Date {
  return new Date(new Date(tier.until).getTime() - 1000);
}
