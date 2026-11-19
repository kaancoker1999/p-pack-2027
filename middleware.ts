import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

/**
 * Admin ve check-in rotaları sunucu tarafında korunur.
 * (Her API rotası ayrıca kendi içinde de oturumu doğrular.)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const adminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const loginPath = adminArea ? '/admin/login' : '/checkin/login';

  if (pathname === '/admin/login' || pathname === '/checkin/login' || pathname === '/api/admin/login' || pathname === '/api/checkin/login') {
    return NextResponse.next();
  }

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const ok = adminArea ? session?.role === 'admin' : !!session;
  if (ok) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = loginPath;
  url.search = '';
  if (pathname !== '/admin' && pathname !== '/checkin') url.searchParams.set('next', pathname);
  else if (req.nextUrl.search) url.searchParams.set('next', pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/checkin/:path*', '/api/admin/:path*', '/api/checkin/:path*'],
};
