import { adminRoute } from '@/lib/admin-api';
import { audit } from '@/lib/audit';
import { prettyPhone } from '@/lib/phone';
import { listRegistrations } from '@/lib/registrations';

export const runtime = 'nodejs';

/** Formül enjeksiyonuna karşı korumalı CSV hücresi */
function cell(v: string): string {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
}

const when = (d: Date) =>
  new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(d);

const PAYMENT_TR = { unpaid: 'Ödenmedi', cash: 'Nakit', iban: 'IBAN' } as const;

/** Parti listesi CSV (isme göre sıralı): sıra, ad, soyad, telefon, referans kişisi, ödeme durumu, kayıt zamanı */
export const GET = adminRoute(async (_req, session) => {
  const rows = (await listRegistrations()).sort(
    (a, b) => a.first_name.localeCompare(b.first_name, 'tr') || a.last_name.localeCompare(b.last_name, 'tr'),
  );
  const lines = [
    ['Sıra', 'Ad', 'Soyad', 'Telefon', 'Referans kişisi', 'Ödeme durumu', 'Kayıt zamanı'].map(cell).join(','),
    // Telefon başındaki + Excel'de formül sayılmasın diye boşluklu biçimde ve tırnak içinde yazılır.
    ...rows.map((r, i) =>
      [String(i + 1), r.first_name, r.last_name, ` ${prettyPhone(r.phone)}`, r.invited_by, PAYMENT_TR[r.payment], when(r.created_at)].map(cell).join(','),
    ),
  ];
  await audit(session.user, 'registrations.export', null, { rows: rows.length });
  // BOM: Excel Türkçe karakterleri doğru açsın
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="istanbul-2027-parti-listesi.csv"',
      'Cache-Control': 'no-store',
    },
  });
});
