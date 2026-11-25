import { SignJWT, jwtVerify } from 'jose';

/** Bu dosya middleware'de (edge) de çalışır: yalnızca jose kullanır. */

export const SESSION_COOKIE = 'ppack_session';
export const SESSION_HOURS = 12;

export type Role = 'admin';
export type Session = { user: string; role: Role };

function key(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET tanımlı değil ya da 32 karakterden kısa.');
  return new TextEncoder().encode(s);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.user)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    const role = payload.role;
    if (typeof payload.sub !== 'string' || role !== 'admin') return null;
    return { user: payload.sub, role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_HOURS * 3600,
};
