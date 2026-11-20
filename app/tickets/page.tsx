import type { Metadata } from 'next';
import Link from 'next/link';
import { event } from '@/config/event';
import { getI18n } from '@/i18n/server';
import PageShell from '@/components/PageShell';
import TicketFlow from '@/components/TicketFlow';
import { remainingCapacity } from '@/lib/orders';
import { formatEventDate, tierAt } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.flow.title} — ${event.name}` };
}

export default async function TicketsPage() {
  const { t, locale } = await getI18n();
  const tier = tierAt(new Date());
  // Veritabanı bağlı değilken (önizleme yayını) form yine de görünsün.
  const remaining = tier ? await remainingCapacity().catch(() => event.capacity) : 0;
  const unavailable = !tier
    ? { title: t.flow.closedTitle, text: t.flow.closedText }
    : remaining <= 0
      ? { title: t.flow.soldOutTitle, text: t.flow.soldOutText }
      : null;

  return (
    <PageShell t={t} locale={locale}>
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{t.flow.title}</h1>
        <p className="mt-3 text-sm text-white/70">
          {event.name} · {formatEventDate(locale)} · {event.venue.name}
        </p>
      </div>
      {unavailable || !tier ? (
        <div className="card text-center">
          <h2 className="font-display text-2xl font-bold">{unavailable?.title}</h2>
          <p className="mt-3 text-white/70">{unavailable?.text}</p>
          <Link href="/" className="btn-gold mt-6">
            {t.flow.doneHome}
          </Link>
        </div>
      ) : (
        <TicketFlow
          t={t}
          locale={locale}
          remaining={remaining}
          prices={{ TRY: tier.TRY, EUR: tier.EUR }}
          revolutUrl={event.revolutUrl}
          receiptMaxMb={event.receiptMaxMb}
          inviters={event.inviters}
        />
      )}
    </PageShell>
  );
}
