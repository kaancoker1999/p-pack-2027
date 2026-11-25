import { adminRoute } from '@/lib/admin-api';
import { fail, json, parseJson } from '@/lib/http';
import { deleteRegistration, setGender, setPayment } from '@/lib/registrations';
import { registrationPatchSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Kaydı sil (yanlış / mükerrer / spam kayıtlar için). İşlem kayda geçer. */
export const DELETE = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const deleted = await deleteRegistration(id.data, session.user);
  return deleted ? json({ ok: true }) : fail('not_found', 404);
});

/** Ödeme durumunu (ödenmedi / nakit / IBAN) ya da parti listesindeki rengi değiştir. */
export const PATCH = adminRoute<{ id: string }>(async (req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const parsed = await parseJson(req, registrationPatchSchema);
  if ('error' in parsed) return parsed.error;
  const { payment, gender } = parsed.data;
  let found = true;
  if (payment) found = await setPayment(id.data, payment, session.user);
  if (found && gender) found = await setGender(id.data, gender);
  return found ? json({ ok: true }) : fail('not_found', 404);
});
