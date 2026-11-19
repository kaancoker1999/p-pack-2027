import { db } from './db';

type Runner = ReturnType<typeof db>;

/** Her yönetim işlemi kayda geçer: kim, ne zaman, ne yaptı. */
export async function audit(
  admin: string,
  action: string,
  targetId: string | null,
  details?: Record<string, unknown>,
  runner?: unknown,
): Promise<void> {
  const sql = (runner as Runner | undefined) ?? db();
  await sql`
    insert into audit_log (admin, action, target_id, details)
    values (${admin}, ${action}, ${targetId}, ${details ? JSON.stringify(details) : null}::jsonb)
  `;
}
