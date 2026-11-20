import { adminRoute } from '@/lib/admin-api';
import { fail, json, parseJson } from '@/lib/http';
import { rejectOrder } from '@/lib/orders';
import { rejectSchema, uuidSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Reddet: açıklama sipariş sayfasında kullanıcıya gösterilir. */
export const POST = adminRoute<{ id: string }>(async (req, session, params) => {
  const id = uuidSchema.safeParse(params.id);
  if (!id.success) return fail('validation', 400);
  const parsed = await parseJson(req, rejectSchema);
  if ('error' in parsed) return parsed.error;
  await rejectOrder(id.data, session.user, parsed.data.reason);
  return json({ ok: true });
});
