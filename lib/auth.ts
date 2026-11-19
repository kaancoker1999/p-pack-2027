import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken, type Session } from './session';

// Kullanıcı bulunamadığında da bcrypt çalıştırıp süre farkından kullanıcı adı sızmasını önler.
const DUMMY_HASH = bcrypt.hashSync('ppack-dummy-password', 10);

/** ADMIN_USERS="kaan:<bcrypt>,ali:<bcrypt>" */
function adminUsers(): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of (process.env.ADMIN_USERS ?? '').split(',')) {
    const i = part.indexOf(':');
    if (i < 1) continue;
    const user = part.slice(0, i).trim().toLowerCase();
    const hash = part.slice(i + 1).trim();
    if (user && hash.startsWith('$2')) map.set(user, hash);
  }
  return map;
}

export async function verifyAdmin(username: string, password: string): Promise<string | null> {
  const user = username.trim().toLowerCase();
  const hash = adminUsers().get(user);
  const ok = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return hash && ok ? user : null;
}

export async function verifyCheckinPassword(password: string): Promise<boolean> {
  const hash = (process.env.CHECKIN_PASSWORD_HASH ?? '').trim();
  const ok = await bcrypt.compare(password, hash.startsWith('$2') ? hash : DUMMY_HASH);
  return hash.startsWith('$2') && ok;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<Session | null> {
  const s = await getSession();
  return s?.role === 'admin' ? s : null;
}

/** Kapı personeli ya da admin */
export async function requireStaff(): Promise<Session | null> {
  return getSession();
}
