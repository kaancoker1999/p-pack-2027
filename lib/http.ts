import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

/** CSRF önlemi: durum değiştiren istekler yalnızca kendi sitemizden gelebilir. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site';
  try {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** JSON gövdeyi okuyup zod şemasıyla doğrular. */
export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: fail('validation', 400) };
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    return { error: fail('validation', 400, { fields: r.error.issues.map((i) => i.path.join('.')) }) };
  }
  return { data: r.data };
}
