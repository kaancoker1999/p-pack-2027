import { adminRoute } from '@/lib/admin-api';
import { json, parseJson } from '@/lib/http';
import { createCompTicket } from '@/lib/orders';
import { compTicketSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Elle davetli bileti oluştur (linkini admin kendisi iletir) */
export const POST = adminRoute(async (req, session) => {
  const parsed = await parseJson(req, compTicketSchema);
  if ('error' in parsed) return parsed.error;
  const { locale, invitedBy, ...guest } = parsed.data;
  const ticket = await createCompTicket(guest, invitedBy, locale, session.user);
  return json({ ok: true, id: ticket.id });
});
