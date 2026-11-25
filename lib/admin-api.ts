import type { NextResponse } from 'next/server';
import { requireAdmin } from './auth';
import { fail, sameOrigin } from './http';
import type { Session } from './session';

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: Request, session: Session, params: P) => Promise<Response>;

/** Yalnızca admin oturumu olanlar. Durum değiştiren isteklerde kaynak (CSRF) kontrolü de yapar. */
export function adminRoute<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response | NextResponse> => {
    if (req.method !== 'GET' && !sameOrigin(req)) return fail('forbidden', 403);
    const session = await requireAdmin();
    if (!session) return fail('unauthorized', 401);
    try {
      return await handler(req, session, await ctx.params);
    } catch (e) {
      console.error('[admin-api]', e);
      return fail('generic', 500);
    }
  };
}
