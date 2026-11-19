import { adminRoute } from '@/lib/admin-api';
import { sendEmails } from '@/lib/email/send';
import { ticketMail } from '@/lib/email/templates';
import { fail, json, parseJson } from '@/lib/http';
import { replaceTicket } from '@/lib/orders';
import { ticketEditSchema, ticketIdSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** İsim değişikliği: eski bilet iptal, yeni QR ile yeni bilet gönderilir */
export const POST = adminRoute<{ id: string }>(async (req, session, params) => {
  const id = ticketIdSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const parsed = await parseJson(req, ticketEditSchema);
  if ('error' in parsed) return parsed.error;
  const { newTicket } = await replaceTicket(id.data, parsed.data, session.user);
  const mail = await sendEmails([ticketMail(newTicket, { changed: true })]);
  return json({ ok: true, id: newTicket.id, emailsFailed: mail.failed });
});
