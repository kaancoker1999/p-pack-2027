import type { NextResponse } from 'next/server';
import { requireAdmin, requireStaff } from './auth';
import { fail, sameOrigin } from './http';
import { AppError } from './orders';
import type { Session } from './session';

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: Request, session: Session, params: P) => Promise<Response>;

function guard<P>(check: () => Promise<Session | null>, handler: Handler<P>) {
  return async (req: Request, ctx: Ctx<P>): Promise<Response | NextResponse> => {
    if (req.method !== 'GET' && !sameOrigin(req)) return fail('forbidden', 403);
    const session = await check();
    if (!session) return fail('unauthorized', 401);
    try {
      return await handler(req, session, await ctx.params);
    } catch (e) {
      if (e instanceof AppError) {
        const status = e.code === 'not_found' ? 404 : 409;
        return fail(e.code, status, e.data);
      }
      console.error('[admin-api]', e);
      return fail('generic', 500);
    }
  };
}

/** Yalnızca admin oturumu olanlar */
export const adminRoute = <P = Record<string, never>>(handler: Handler<P>) => guard(requireAdmin, handler);
/** Kapı personeli ya da admin */
export const staffRoute = <P = Record<string, never>>(handler: Handler<P>) => guard(requireStaff, handler);
