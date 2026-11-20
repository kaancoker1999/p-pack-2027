import { headers } from 'next/headers';
import Link from 'next/link';
import { event } from '@/config/event';
import { getI18n } from '@/i18n/server';
import PageShell from '@/components/PageShell';
import { getOrderByReference, getOrderTickets } from '@/lib/orders';
import { formatDateTime, formatMoney } from '@/lib/pricing';
import { rateLimit } from '@/lib/rate-limit';
import { REFERENCE_RE } from '@/lib/reference';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { t, locale } = await getI18n();
  const reference = decodeURIComponent((await params).reference).trim().toUpperCase();
  const h = await headers();
  const allowed = await rateLimit('order-status', new Request('http://local', { headers: h }), 40, 600).catch(() => true);
  const order = allowed && REFERENCE_RE.test(reference) ? await getOrderByReference(reference).catch(() => null) : null;
  const tickets = order?.status === 'PAID' ? await getOrderTickets(order.id) : [];

  const badge = {
    PAYMENT_SUBMITTED: 'border-gold text-gold',
    PAID: 'border-emerald-400 text-emerald-300',
    REJECTED: 'border-crimson text-crimson',
  } as const;

  return (
    <PageShell t={t} locale={locale} cta={!order}>
      <h1 className="text-center font-display text-4xl font-bold">{t.order.title}</h1>
      {!allowed ? (
        <div className="card mt-8 text-center text-white/80">{t.errors.rateLimit}</div>
      ) : !order ? (
        <div className="card mt-8 text-center">
          <p className="font-display text-xl font-bold">{t.order.notFound}</p>
          <p className="mt-3 text-sm text-white/60">{t.order.notFoundHint}</p>
          <Link href="/order" className="btn-gold mt-6">
            {t.order.lookupTitle}
          </Link>
        </div>
      ) : (
        <div className="card mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t.order.reference}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-gold">{order.reference}</p>
            </div>
            <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${badge[order.status]}`}>{t.order[order.status]}</span>
          </div>

          <p className="mt-6 text-white/85">
            {order.status === 'PAYMENT_SUBMITTED' ? t.order.pendingText : order.status === 'PAID' ? t.order.paidText : t.order.rejectedText}
          </p>
          {order.status === 'REJECTED' && order.reject_reason && (
            <p className="mt-4 border-l-2 border-crimson pl-4 text-sm text-white/80">
              <span className="block text-xs text-white/50">{t.order.reason}</span>
              {order.reject_reason}
            </p>
          )}

          {tickets.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">{t.order.tickets}</h2>
              <ul className="mt-3 space-y-2">
                {tickets.map((tk) => (
                  <li key={tk.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                    <span>
                      <span className="block font-medium">{tk.guest_name}</span>
                      <span className={`text-xs ${tk.status === 'USED' ? 'text-white/50' : 'text-emerald-300'}`}>{t.ticket[tk.status]}</span>
                    </span>
                    <Link href={`/ticket/${tk.id}`} className="btn-gold shrink-0 px-5 py-2.5">
                      {t.order.openTicket}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/50">{t.order.keepPage}</p>
            </div>
          )}

          <dl className="mt-6 divide-y divide-white/10 border-t border-white/10 text-sm">
            {[
              [t.order.people, String(order.quantity)],
              [t.order.total, formatMoney(order.total, order.currency, locale)],
              [t.order.submittedAt, formatDateTime(order.submitted_at, locale)],
              [t.order.invitedBy, order.invited_by ?? '—'],
              ...(order.status === 'PAID' ? [] : [[t.order.guests, order.guests.map((g) => g.name).join(', ')]]),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-3">
                <dt className="text-white/60">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs text-white/50">
            {t.order.help}{' '}
            <a className="text-gold" href={`mailto:${event.ticketsEmail}?subject=${order.reference}`}>
              {event.ticketsEmail}
            </a>
          </p>
        </div>
      )}
    </PageShell>
  );
}
