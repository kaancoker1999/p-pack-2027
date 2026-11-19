import Link from 'next/link';
import { event } from '@/config/event';
import type { Dict, Locale } from '@/i18n';
import LangToggle from './LangToggle';

export default function Header({ t, locale, cta = true }: { t: Dict; locale: Locale; cta?: boolean }) {
  return (
    <header className="no-print absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="font-logo text-lg font-bold tracking-[0.2em] text-gold" aria-label={t.nav.home}>
          {event.name}
        </Link>
        <div className="flex items-center gap-3">
          {cta && (
            <Link href="/tickets" className="hidden rounded-full bg-crimson px-5 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-[#d81524] sm:inline-flex">
              {t.nav.tickets}
            </Link>
          )}
          <LangToggle locale={locale} label={t.nav.language} />
        </div>
      </div>
    </header>
  );
}
