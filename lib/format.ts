import { event } from '@/config/event';
import type { Locale } from '@/i18n';

const dtLocale = (l: Locale) => (l === 'tr' ? 'tr-TR' : 'en-GB');

/** "31 Aralık" / "31 December" — İstanbul saatine göre */
export function formatDayMonth(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(dtLocale(locale), { day: 'numeric', month: 'long', timeZone: event.timeZone }).format(d);
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

/** "22:00" */
export function formatEventTime(): string {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: event.timeZone }).format(
    new Date(event.startsAt),
  );
}
