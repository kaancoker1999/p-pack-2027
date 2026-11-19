import { adminRoute } from '@/lib/admin-api';
import { sendEmails } from '@/lib/email/send';
import { ticketMail } from '@/lib/email/templates';
import { json, parseJson } from '@/lib/http';
import { createCompTicket } from '@/lib/orders';
import { compTicketSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Elle davetli bileti oluştur */
export const POST = adminRoute(async (req, session) => {
  const parsed = await parseJson(req, compTicketSchema);
  if ('error' in parsed) return parsed.error;
  const { locale, ...guest } = parsed.data;
  const ticket = await createCompTicket(guest, locale, session.user);
  const mail = await sendEmails([ticketMail(ticket)]);
  return json({ ok: true, id: ticket.id, emailsFailed: mail.failed });
});
