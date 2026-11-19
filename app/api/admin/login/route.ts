import { cookies } from 'next/headers';
import { audit } from '@/lib/audit';
import { verifyAdmin } from '@/lib/auth';
import { fail, json, parseJson, sameOrigin } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';
import { adminLoginSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  if (!(await rateLimit('admin-login', req, 8, 900))) return fail('rate_limit', 429);
  const parsed = await parseJson(req, adminLoginSchema);
  if ('error' in parsed) return parsed.error;

  const user = await verifyAdmin(parsed.data.username, parsed.data.password);
  if (!user) return fail('invalid_credentials', 401);

  (await cookies()).set(SESSION_COOKIE, await createSessionToken({ user, role: 'admin' }), sessionCookieOptions);
  await audit(user, 'admin.login', null);
  return json({ ok: true });
}
