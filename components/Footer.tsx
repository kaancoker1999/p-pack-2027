import Link from 'next/link';
import { event } from '@/config/event';
import type { Dict } from '@/i18n';

export default function Footer({ t }: { t: Dict }) {
  return (
    <footer className="no-print border-t border-white/10 bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 text-sm text-white/60 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-logo text-xl font-bold tracking-[0.2em] text-gold">{event.name}</p>
          <p className="mt-3 max-w-xs">{t.footer.age}</p>
        </div>
        <div className="space-y-2">
          <p>
            {t.footer.contact}:{' '}
            <a href={`mailto:${event.contactEmail}`} className="text-white underline-offset-4 hover:underline">
              {event.contactEmail}
            </a>
          </p>
          <p>
            <Link href="/kvkk" className="text-white underline-offset-4 hover:underline">
              {t.footer.kvkk}
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {event.name}. {t.footer.rights}
        <span className="mx-2">·</span>
        <Link href="/admin" className="underline-offset-4 hover:text-white hover:underline">
          {t.footer.admin}
        </Link>
      </div>
    </footer>
  );
}
