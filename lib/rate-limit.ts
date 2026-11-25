import { createHash } from 'crypto';
import { kv } from './store';

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Sabit pencereli deneme sınırı (depo tabanlı; sunucular arasında paylaşılır).
 * İzin varsa true döner. IP açık saklanmaz, hash'lenir. Sayaç okuma-yazma atomik olmadığı
 * için aynı anda gelen isteklerde sınır birkaç deneme esneyebilir; spam ve şifre denemelerini
 * yavaşlatmak için yeterlidir.
 */
export async function rateLimit(scope: string, req: Request, limit: number, windowSec: number): Promise<boolean> {
  const store = kv();
  const ipHash = createHash('sha256')
    .update(`${process.env.SESSION_SECRET ?? ''}:${clientIp(req)}`)
    .digest('hex')
    .slice(0, 24);
  const window = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl/${scope}/${window}/${ipHash}`;
  const count = ((await store.get<number>(key)) ?? 0) + 1;
  await store.set(key, count);

  // Arada bir eski pencerelerin sayaçlarını temizle
  if (Math.random() < 0.03) {
    const old = (await store.list(`rl/${scope}/`)).filter((k) => Number(k.split('/')[2]) < window - 1);
    await Promise.all(old.slice(0, 200).map((k) => store.del(k)));
  }
  return count <= limit;
}
