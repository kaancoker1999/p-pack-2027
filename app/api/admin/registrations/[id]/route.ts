import { adminRoute } from '@/lib/admin-api';
import { fail, json, parseJson } from '@/lib/http';
import { deleteRegistration, setPayment } from '@/lib/registrations';
import { paymentSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Kaydı sil (yanlış / mükerrer / spam kayıtlar için). İşlem kayda geçer. */
export const DELETE = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const deleted = await deleteRegistration(id.data, session.user);
  return deleted ? json({ ok: true }) : fail('not_found', 404);
});

/** Ödeme durumunu değiştir: ödenmedi / nakit / IBAN. */
export const PATCH = adminRoute<{ id: string }>(async (req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const parsed = await parseJson(req, paymentSchema);
  if ('error' in parsed) return parsed.error;
  const updated = await setPayment(id.data, parsed.data.payment, session.user);
  return updated ? json({ ok: true }) : fail('not_found', 404);
});
