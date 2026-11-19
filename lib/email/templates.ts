import { event } from '@/config/event';
import { fmt, getDict, type Locale } from '@/i18n';
import type { OrderRow, TicketRow } from '../db';
import { siteUrl } from '../env';
import { formatDateTime, formatEventDate, formatEventTime, formatMoney } from '../pricing';
import type { Mail } from './send';

const C = { bg: '#050505', card: '#111111', red: '#C1121F', deep: '#8B0000', gold: '#D4AF37', text: '#F5F5F5', mute: '#A3A3A3', line: '#2A2A2A' };

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function button(href: string, label: string, primary = true): string {
  const style = primary
    ? `background:${C.red};color:#ffffff;border:1px solid ${C.red};`
    : `background:transparent;color:${C.gold};border:1px solid ${C.gold};`;
  return `<a href="${href}" style="display:inline-block;${style}padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px;text-decoration:none;margin:4px 6px 4px 0;">${esc(label)}</a>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:${C.mute};font-size:13px;width:42%;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;color:${C.text};font-size:14px;font-weight:600;">${value}</td></tr>`;
}

function layout(locale: Locale, title: string, body: string): string {
  const t = getDict(locale);
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:${C.text};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding:8px 0 22px;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:6px;color:${C.gold};font-weight:700;">${esc(event.name)}</div>
  <div style="height:2px;width:64px;background:${C.red};margin:12px auto 0;"></div>
</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:28px 24px;">
  <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;">${esc(title)}</h1>
  ${body}
</td></tr>
<tr><td align="center" style="padding:20px 10px;color:${C.mute};font-size:12px;line-height:1.6;">
  ${esc(fmt(t.email.footer, { event: event.name }))}<br>
  ${esc(formatEventDate(locale))} · ${esc(event.venue.name)}, ${esc(event.venue.area)}<br>
  <a href="mailto:${event.ticketsEmail}" style="color:${C.gold};">${event.ticketsEmail}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.text};">${html}</p>`;
const note = (html: string) => `<p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:${C.mute};">${html}</p>`;
const firstName = (name: string) => name.split(/\s+/)[0];

function orderSummary(order: OrderRow, locale: Locale): string {
  const t = getDict(locale);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};margin-top:8px;padding-top:8px;">
${row(t.order.reference, `<span style="font-family:monospace;font-size:16px;color:${C.gold};">${esc(order.reference)}</span>`)}
${row(t.order.people, String(order.quantity))}
${row(t.order.total, esc(formatMoney(order.total, order.currency, locale)))}
${row(t.order.guests, order.guests.map((g) => `${esc(g.name)} <span style="color:${C.mute};font-weight:400;">@${esc(g.instagram)}</span>`).join('<br>'))}
</table>`;
}

/** 6. adım: sipariş sahibine "ödeme bildiriminiz alındı" */
export function orderReceivedMail(order: OrderRow): Mail {
  const locale = order.locale;
  const t = getDict(locale);
  const body =
    p(esc(fmt(t.email.hello, { name: firstName(order.buyer_name) }))) +
    p(esc(t.email.receivedBody)) +
    orderSummary(order, locale) +
    `<div style="margin-top:20px;">${button(`${siteUrl()}/order/${order.reference}`, t.email.trackBtn)}</div>` +
    note(esc(t.pricing.noRefund));
  return {
    to: order.buyer_email,
    subject: fmt(t.email.receivedSubject, { ref: order.reference }),
    html: layout(locale, t.email.receivedTitle, body),
    tag: 'order-received',
  };
}

/** 7. adım: adminlere anında bildirim (Türkçe) */
export function adminNewOrderMail(order: OrderRow, to: string[]): Mail {
  const base = siteUrl();
  const adminLink = `${base}/admin?q=${encodeURIComponent(order.reference)}`;
  const receipt = order.receipt_url
    ? `<a href="${base}/api/admin/receipt/${order.id}" style="color:${C.gold};">Dekontu aç</a>`
    : `<span style="color:${C.mute};">Dekont yüklenmedi</span>`;
  const body =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Referans', `<span style="font-family:monospace;font-size:16px;color:${C.gold};">${esc(order.reference)}</span>`)}
${row('Kişi sayısı', String(order.quantity))}
${row('Tutar', `${esc(formatMoney(order.total, order.currency, 'tr'))} (${order.quantity} × ${esc(formatMoney(order.unit_price, order.currency, 'tr'))})`)}
${row('Para birimi', order.currency)}
${row('Bildirim saati', esc(formatDateTime(order.submitted_at, 'tr')))}
${row('Sipariş sahibi', `${esc(order.buyer_name)}<br><span style="font-weight:400;">${esc(order.buyer_email)}</span>`)}
${row('İsimler', order.guests.map((g) => `${esc(g.name)} <span style="color:${C.mute};font-weight:400;">@${esc(g.instagram)} · ${esc(g.email)}</span>`).join('<br>'))}
${row('Dekont', receipt)}
</table>` + `<div style="margin-top:20px;">${button(adminLink, 'Admin panelinde aç')}</div>`;
  return {
    to,
    subject: `Yeni ödeme bildirimi: ${order.reference} · ${order.quantity} kişi · ${formatMoney(order.total, order.currency, 'tr')}`,
    html: layout('tr', 'Yeni ödeme bildirimi', body),
    tag: 'admin-new-order',
  };
}

function ticketBlock(ticket: TicketRow, locale: Locale): string {
  const t = getDict(locale);
  const base = siteUrl();
  const url = `${base}/ticket/${ticket.id}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border:1px solid ${C.gold};border-radius:14px;margin:16px 0;">
<tr><td align="center" style="padding:22px 18px;">
  <div style="font-family:Georgia,serif;font-size:20px;color:#ffffff;font-weight:700;">${esc(ticket.guest_name)}</div>
  <div style="color:${C.gold};font-size:14px;margin-top:4px;">@${esc(ticket.guest_instagram)}</div>
  <a href="${url}"><img src="${base}/api/ticket/${ticket.id}/qr" width="220" height="220" alt="QR" style="display:block;margin:16px auto;border-radius:10px;background:#ffffff;border:0;"></a>
  <div style="color:${C.mute};font-size:12px;margin-bottom:12px;">${esc(formatEventDate(locale))} · ${formatEventTime()} · ${esc(event.venue.name)}</div>
  ${button(url, t.email.viewTicket)}${button(`${base}/api/ticket/${ticket.id}/pdf`, t.email.downloadPdf, false)}
</td></tr></table>`;
}

/** Her misafire kendi bileti */
export function ticketMail(ticket: TicketRow, opts: { changed?: boolean } = {}): Mail {
  const locale = ticket.locale;
  const t = getDict(locale);
  const body =
    p(esc(fmt(t.email.hello, { name: firstName(ticket.guest_name) }))) +
    p(esc(fmt(opts.changed ? t.email.ticketChangedBody : t.email.ticketBody, { event: event.name }))) +
    ticketBlock(ticket, locale) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row(t.email.when, `${esc(formatEventDate(locale))}, ${formatEventTime()}`)}
${row(t.email.where, `<a href="${event.venue.mapsUrl}" style="color:${C.gold};">${esc(event.venue.name)}, ${esc(event.venue.area)}</a>`)}
</table>` +
    note(`<strong style="color:${C.gold};">${esc(t.email.idNote)}</strong><br>${esc(t.email.oneEntry)}`);
  return {
    to: ticket.guest_email,
    subject: fmt(t.email.ticketSubject, { event: event.name }),
    html: layout(locale, t.email.ticketTitle, body),
    tag: 'ticket',
  };
}

/** Sipariş sahibine tüm biletlerin kopyası */
export function orderTicketsMail(order: OrderRow, tickets: TicketRow[]): Mail {
  const locale = order.locale;
  const t = getDict(locale);
  const body =
    p(esc(fmt(t.email.hello, { name: firstName(order.buyer_name) }))) +
    p(esc(t.email.orderTicketsBody)) +
    tickets.map((tk) => ticketBlock(tk, locale)).join('') +
    note(`<strong style="color:${C.gold};">${esc(t.email.idNote)}</strong><br>${esc(t.email.oneEntry)}`);
  return {
    to: order.buyer_email,
    subject: fmt(t.email.orderTicketsSubject, { ref: order.reference, n: tickets.length }),
    html: layout(locale, t.email.orderTicketsTitle, body),
    tag: 'order-tickets',
  };
}

export function orderRejectedMail(order: OrderRow): Mail {
  const locale = order.locale;
  const t = getDict(locale);
  const reason = order.reject_reason
    ? `<div style="border-left:3px solid ${C.red};padding:8px 14px;margin:0 0 14px;color:${C.text};font-size:15px;line-height:1.6;"><span style="color:${C.mute};font-size:12px;">${esc(t.order.reason)}</span><br>${esc(order.reject_reason)}</div>`
    : '';
  const body =
    p(esc(fmt(t.email.hello, { name: firstName(order.buyer_name) }))) +
    p(esc(fmt(t.email.rejectedBody, { ref: order.reference }))) +
    reason +
    p(esc(t.email.rejectedHelp)) +
    orderSummary(order, locale);
  return {
    to: order.buyer_email,
    subject: fmt(t.email.rejectedSubject, { ref: order.reference }),
    html: layout(locale, t.email.rejectedTitle, body),
    tag: 'order-rejected',
  };
}
