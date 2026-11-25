import { adminRoute } from '@/lib/admin-api';
import { fail, json } from '@/lib/http';
import { deleteRegistration } from '@/lib/registrations';
import { uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Kaydı sil (yanlış / mükerrer / spam kayıtlar için). İşlem kayda geçer. */
export const DELETE = adminRoute<{ id: string }>(async (_req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const deleted = await deleteRegistration(id.data, session.user);
  return deleted ? json({ ok: true }) : fail('not_found', 404);
});
