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

/** Kayıt listesi CSV: ad, soyad, telefon, referans kişisi, kayıt zamanı */
export const GET = adminRoute(async (_req, session) => {
  const rows = await listRegistrations();
  const lines = [
    ['Ad', 'Soyad', 'Telefon', 'Referans kişisi', 'Kayıt zamanı'].map(cell).join(','),
    // Telefon başındaki + Excel'de formül sayılmasın diye boşluklu biçimde ve tırnak içinde yazılır.
    ...rows.map((r) => [r.first_name, r.last_name, ` ${prettyPhone(r.phone)}`, r.invited_by, when(r.created_at)].map(cell).join(',')),
  ];
  await audit(session.user, 'registrations.export', null, { rows: rows.length });
  // BOM: Excel Türkçe karakterleri doğru açsın
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="istanbul-2027-kayit-listesi.csv"',
      'Cache-Control': 'no-store',
    },
  });
});
