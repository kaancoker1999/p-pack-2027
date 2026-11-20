import { event } from '@/config/event';
import { fmt } from '@/i18n';
import { getI18n } from '@/i18n/server';
import PageShell from '@/components/PageShell';
import PrintButton from '@/components/PrintButton';
import { barcodeSvg, qrSvg } from '@/lib/codes';
import { getTicket } from '@/lib/orders';
import { formatEventDate, formatEventTime, formatTime } from '@/lib/pricing';
import { barcodeDigits, prettyId, qrPayload, verifyTicketSignature } from '@/lib/tickets';
import { ticketIdSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Bilet — ${event.name}`, robots: { index: false, follow: false } };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getI18n();
  const id = ticketIdSchema.safeParse((await params).id.toUpperCase());
  const found = id.success ? await getTicket(id.data) : null;
  const ticket = found && verifyTicketSignature(found.id, found.signature) ? found : null;

  if (!ticket) {
    return (
      <PageShell t={t} locale={locale} width="max-w-md">
        <div className="card text-center">
          <h1 className="font-display text-2xl font-bold">{t.ticket.notFound}</h1>
          <p className="mt-3 text-sm text-white/60">{t.ticket.notFoundHint}</p>
        </div>
      </PageShell>
    );
  }

  const [qr, barcode] = await Promise.all([qrSvg(qrPayload(ticket.id, ticket.signature)), barcodeSvg(barcodeDigits(ticket.id))]);
  const cancelled = ticket.status === 'CANCELLED';
  const statusStyle = {
    VALID: 'border-emerald-400/70 text-emerald-300',
    USED: 'border-white/40 text-white/70',
    CANCELLED: 'border-crimson text-crimson',
  }[ticket.status];

  return (
    <PageShell t={t} locale={locale} width="max-w-md">
      <article className="relative overflow-hidden rounded-3xl border border-gold/70 bg-ink shadow-[0_0_80px_rgba(139,0,0,0.45)] print:border-black print:shadow-none">
        {/* Üst: etkinlik */}
        <div className="bg-gradient-to-b from-blood to-[#3d0000] px-6 pb-7 pt-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">{t.ticket.admit}</p>
          <p className="gold-text mt-2 font-logo text-4xl font-bold tracking-[0.12em]">{event.name}</p>
          <p className="mt-3 text-sm font-semibold text-white">
            {formatEventDate(locale)} · {formatEventTime()}
          </p>
          <p className="text-sm text-white/80">
            {event.venue.name}, {event.venue.area}
          </p>
        </div>

        {/* Yırtma çizgisi */}
        <div className="relative h-0 border-t border-dashed border-gold/50">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#0a0000]" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#0a0000]" />
        </div>

        <div className="px-6 pb-7 pt-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">{t.ticket.guest}</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{ticket.guest_name}</h1>
          {ticket.invited_by && (
            <p className="mt-1 text-sm text-gold">
              {t.ticket.invitedBy}: {ticket.invited_by}
            </p>
          )}
          <span className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyle}`}>{t.ticket[ticket.status]}</span>

          <div className={`relative mx-auto mt-5 w-full max-w-[260px] ${cancelled ? 'opacity-25' : ''}`}>
            <div className="overflow-hidden rounded-2xl bg-white p-2 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="mt-4 overflow-hidden rounded-lg bg-white px-2 py-2 [&_svg]:block [&_svg]:h-14 [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: barcode }} />
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-wider text-white/40">
            {t.ticket.ticketNo}: {prettyId(ticket.id)}
          </p>

          {cancelled && (
            <p className="mt-4 rounded-xl border border-crimson bg-crimson/15 px-4 py-3 text-sm font-semibold">
              {ticket.replaced_by ? t.ticket.replacedText : t.ticket.cancelledText}
            </p>
          )}
          {ticket.status === 'USED' && ticket.checked_in_at && (
            <p className="mt-4 text-sm text-white/70">{fmt(t.ticket.usedText, { time: formatTime(ticket.checked_in_at) })}</p>
          )}

          <p className="mt-6 rounded-full bg-crimson px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white">{t.ticket.idNote}</p>
          <p className="mt-3 text-xs text-white/50">{t.ticket.openBar}</p>
        </div>
      </article>

      {!cancelled && (
        <div className="no-print mt-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-3">
            <a href={`/api/ticket/${ticket.id}/pdf`} className="btn-gold">
              ↓ {t.ticket.downloadPdf}
            </a>
            <PrintButton label={t.ticket.print} />
          </div>
          <p className="text-xs text-white/50">{t.ticket.brightness}</p>
        </div>
      )}
    </PageShell>
  );
}
