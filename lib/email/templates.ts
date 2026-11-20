import { event } from '@/config/event';
import type { OrderRow } from '../db';
import { siteUrl } from '../env';
import { formatDateTime, formatMoney } from '../pricing';
import type { Mail } from './send';

/**
 * Misafirlerden e-posta toplanmıyor; biletler sipariş sayfasında (/order/<referans>) görünür.
 * Tek e-posta: yeni ödeme bildirimi geldiğinde adminlere giden bildirim.
 */

const C = { bg: '#050505', card: '#111111', red: '#C1121F', gold: '#D4AF37', text: '#F5F5F5', mute: '#A3A3A3', line: '#2A2A2A' };

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:${C.mute};font-size:13px;width:42%;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;color:${C.text};font-size:14px;font-weight:600;">${value}</td></tr>`;
}

/** Adminlere anında bildirim (Türkçe) */
export function adminNewOrderMail(order: OrderRow, to: string[]): Mail {
  const base = siteUrl();
  const adminLink = `${base}/admin?q=${encodeURIComponent(order.reference)}`;
  const receipt = order.receipt_url
    ? `<a href="${base}/api/admin/receipt/${order.id}" style="color:${C.gold};">Dekontu aç</a>`
    : `<span style="color:${C.mute};">Dekont yüklenmedi</span>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:${C.text};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:28px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding:8px 0 22px;font-family:Georgia,serif;font-size:26px;letter-spacing:5px;color:${C.gold};font-weight:700;">${esc(event.name)}</td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:28px 24px;">
  <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:22px;color:#ffffff;">Yeni ödeme bildirimi</h1>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Referans', `<span style="font-family:monospace;font-size:16px;color:${C.gold};">${esc(order.reference)}</span>`)}
${row('Kişi sayısı', String(order.quantity))}
${row('Tutar', `${esc(formatMoney(order.total, order.currency, 'tr'))} (${order.quantity} × ${esc(formatMoney(order.unit_price, order.currency, 'tr'))})`)}
${row('Para birimi', order.currency)}
${row('Davet eden', esc(order.invited_by ?? '—'))}
${row('Bildirim saati', esc(formatDateTime(order.submitted_at, 'tr')))}
${row('İsimler', order.guests.map((g) => esc(g.name)).join('<br>'))}
${row('Dekont', receipt)}
  </table>
  <div style="margin-top:20px;"><a href="${adminLink}" style="display:inline-block;background:${C.red};color:#ffffff;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px;text-decoration:none;">Admin panelinde aç</a></div>
</td></tr></table></td></tr></table></body></html>`;
  return {
    to,
    subject: `Yeni ödeme bildirimi: ${order.reference} · ${order.quantity} kişi · ${formatMoney(order.total, order.currency, 'tr')} · ${order.invited_by ?? ''}`,
    html,
    tag: 'admin-new-order',
  };
}
