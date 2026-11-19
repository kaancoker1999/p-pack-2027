import { cookies } from 'next/headers';
import { fail, json, sameOrigin } from '@/lib/http';
import { SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  (await cookies()).delete(SESSION_COOKIE);
  return json({ ok: true });
}
