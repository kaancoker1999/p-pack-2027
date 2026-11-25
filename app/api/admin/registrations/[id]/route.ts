import { adminRoute } from '@/lib/admin-api';
import { fail, json, parseJson } from '@/lib/http';
import { deleteRegistration, updateRegistration } from '@/lib/registrations';
import { registrationIdSchema, registrationPatchSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Kaydı sil (yanlış / mükerrer / spam kayıtlar için). İşlem kayda geçer. */
export const DELETE = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = registrationIdSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const deleted = await deleteRegistration(id.data, session.user);
  return deleted ? json({ ok: true }) : fail('not_found', 404);
});

/** Ödeme durumunu (ödenmedi / nakit / IBAN) ya da parti listesindeki rengi değiştir. */
export const PATCH = adminRoute<{ id: string }>(async (req, session, params) => {
  const id = registrationIdSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const parsed = await parseJson(req, registrationPatchSchema);
  if ('error' in parsed) return parsed.error;
  const found = await updateRegistration(id.data, parsed.data, session.user);
  return found ? json({ ok: true }) : fail('not_found', 404);
});
