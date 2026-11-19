import { createHash } from 'crypto';
import { db } from './db';

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Postgres tabanlı sabit pencereli sınırlama (serverless'ta bellek paylaşılmadığı için).
 * İzin varsa true döner. IP açık saklanmaz, hash'lenir.
 */
export async function rateLimit(scope: string, req: Request, limit: number, windowSec: number): Promise<boolean> {
  const sql = db();
  const ipHash = createHash('sha256')
    .update(`${process.env.SESSION_SECRET ?? ''}:${clientIp(req)}`)
    .digest('hex')
    .slice(0, 32);
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  const rows = await sql<{ count: number }[]>`
    insert into rate_limits (key, window_start, count)
    values (${`${scope}:${ipHash}`}, ${windowStart}, 1)
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count
  `;
  if (Math.random() < 0.02) {
    await sql`delete from rate_limits where window_start < now() - interval '1 day'`.catch(() => {});
  }
  return rows[0].count <= limit;
}
