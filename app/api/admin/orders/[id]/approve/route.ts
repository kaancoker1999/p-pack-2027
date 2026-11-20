import { adminRoute } from '@/lib/admin-api';
import { fail, json } from '@/lib/http';
import { approveOrder } from '@/lib/orders';
import { uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Onayla: PAID + her kişiye ayrı bilet. Biletler sipariş sayfasında (/order/<referans>) görünür. */
export const POST = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const { order, tickets } = await approveOrder(id.data, session.user);
  return json({ ok: true, tickets: tickets.length, reference: order.reference });
});
