import { NextResponse } from 'next/server';
import { adminRoute } from '@/lib/admin-api';
import { fail } from '@/lib/http';
import { getOrder } from '@/lib/orders';
import { receiptAccess } from '@/lib/storage';
import { uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Dekontu yalnızca adminler açabilir (özel bucket → 5 dakikalık imzalı link). */
export const GET = adminRoute<{ id: string }>(async (_req, _session, params) => {
  const id = uuidSchema.safeParse(params.id);
  const order = id.success ? await getOrder(id.data) : null;
  if (!order?.receipt_url) return fail('not_found', 404);
  const access = await receiptAccess(order.receipt_url);
  if (!access) return fail('not_found', 404);
  if ('redirect' in access) return NextResponse.redirect(access.redirect);
  return new Response(new Uint8Array(access.body), {
    headers: { 'Content-Type': access.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
});
