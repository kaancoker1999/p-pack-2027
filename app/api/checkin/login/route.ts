import { cookies } from 'next/headers';
import { audit } from '@/lib/audit';
import { verifyCheckinPassword } from '@/lib/auth';
import { fail, json, parseJson, sameOrigin } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/session';
import { checkinLoginSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  if (!(await rateLimit('checkin-login', req, 8, 900))) return fail('rate_limit', 429);
  const parsed = await parseJson(req, checkinLoginSchema);
  if ('error' in parsed) return parsed.error;
  if (!(await verifyCheckinPassword(parsed.data.password))) return fail('invalid_credentials', 401);

  (await cookies()).set(SESSION_COOKIE, await createSessionToken({ user: 'kapi', role: 'staff' }), sessionCookieOptions);
  await audit('kapi', 'checkin.login', null);
  return json({ ok: true });
}
