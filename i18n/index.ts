import { tr, type Dict } from './tr';
import { en } from './en';

export type Locale = 'tr' | 'en';
export const LOCALES: Locale[] = ['tr', 'en'];
export const DEFAULT_LOCALE: Locale = 'tr';
export const LOCALE_COOKIE = 'lang';
export type { Dict };

export function getDict(locale: Locale): Dict {
  return locale === 'en' ? en : tr;
}

export function isLocale(v: unknown): v is Locale {
  return v === 'tr' || v === 'en';
}

/** "{n} kişi" gibi metinlerdeki yer tutucuları doldurur. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
