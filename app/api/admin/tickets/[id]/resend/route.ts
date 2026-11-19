import { adminRoute } from '@/lib/admin-api';
import { audit } from '@/lib/audit';
import { sendEmails } from '@/lib/email/send';
import { ticketMail } from '@/lib/email/templates';
import { fail, json } from '@/lib/http';
import { getTicket } from '@/lib/orders';
import { ticketIdSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = ticketIdSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const ticket = await getTicket(id.data);
  if (!ticket) return fail('not_found', 404);
  if (ticket.status === 'CANCELLED') return fail('conflict', 409);
  const mail = await sendEmails([ticketMail(ticket)]);
  await audit(session.user, 'ticket.resend', ticket.id, { to: ticket.guest_email, failed: mail.failed });
  return json({ ok: mail.failed === 0, emailsFailed: mail.failed });
});
