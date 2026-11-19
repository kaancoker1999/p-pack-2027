import { adminRoute } from '@/lib/admin-api';
import { sendEmails } from '@/lib/email/send';
import { orderTicketsMail, ticketMail } from '@/lib/email/templates';
import { fail, json } from '@/lib/http';
import { approveOrder } from '@/lib/orders';
import { uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Onayla: PAID + her kişiye ayrı bilet + her misafire kendi e-postası + sipariş sahibine hepsinin kopyası */
export const POST = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const { order, tickets } = await approveOrder(id.data, session.user);
  const mail = await sendEmails([...tickets.map((t) => ticketMail(t)), orderTicketsMail(order, tickets)]);
  return json({ ok: true, tickets: tickets.length, emailsFailed: mail.failed });
});
