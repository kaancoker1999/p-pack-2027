import { adminRoute } from '@/lib/admin-api';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const STATUS_TR: Record<string, string> = { VALID: 'Geçerli', USED: 'Kullanıldı', CANCELLED: 'İptal' };

/** Formül enjeksiyonuna karşı korumalı CSV hücresi */
function cell(v: string): string {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Misafir listesi CSV: ad, e-posta, Instagram, bilet durumu */
export const GET = adminRoute(async (_req, session) => {
  const rows = await db()<{ guest_name: string; guest_email: string; guest_instagram: string; status: string; reference: string | null }[]>`
    select t.guest_name, t.guest_email, t.guest_instagram, t.status, o.reference
    from tickets t left join orders o on o.id = t.order_id
    order by (t.status = 'CANCELLED'), lower(t.guest_name)
  `;
  const lines = [
    ['Ad Soyad', 'E-posta', 'Instagram', 'Bilet durumu', 'Referans'].map(cell).join(','),
    ...rows.map((r) =>
      [r.guest_name, r.guest_email, r.guest_instagram, STATUS_TR[r.status] ?? r.status, r.reference ?? 'Davetli'].map(cell).join(','),
    ),
  ];
  await audit(session.user, 'guests.export', null, { rows: rows.length });
  // BOM: Excel Türkçe karakterleri doğru açsın
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="p-pack-2027-misafir-listesi.csv"',
      'Cache-Control': 'no-store',
    },
  });
});
