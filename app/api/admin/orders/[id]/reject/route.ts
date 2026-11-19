import { adminRoute } from '@/lib/admin-api';
import { sendEmails } from '@/lib/email/send';
import { orderRejectedMail } from '@/lib/email/templates';
import { fail, json, parseJson } from '@/lib/http';
import { rejectOrder } from '@/lib/orders';
import { rejectSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = adminRoute<{ id: string }>(async (req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const parsed = await parseJson(req, rejectSchema);
  if ('error' in parsed) return parsed.error;
  const order = await rejectOrder(id.data, session.user, parsed.data.reason);
  const mail = await sendEmails([orderRejectedMail(order)]);
  return json({ ok: true, emailsFailed: mail.failed });
});
