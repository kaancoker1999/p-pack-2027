import { randomBytes } from 'crypto';
import { kv } from './store';

export type AuditEntry = { admin: string; action: string; target: string | null; details: Record<string, unknown> | null; at: string };

/** Her yönetim işlemi kayda geçer: kim, ne zaman, ne yaptı. Anahtarlar zamana göre sıralıdır. */
export async function audit(admin: string, action: string, target: string | null, details?: Record<string, unknown>): Promise<void> {
  const at = new Date().toISOString();
  const entry: AuditEntry = { admin, action, target, details: details ?? null, at };
  await kv().set(`log/${at}-${randomBytes(3).toString('hex')}`, entry);
}

/** Son işlemler, en yeni üstte. */
export async function recentAudit(limit = 200): Promise<AuditEntry[]> {
  const store = kv();
  const keys = (await store.list('log/')).sort().reverse().slice(0, limit);
  const entries = await Promise.all(keys.map((k) => store.get<AuditEntry>(k)));
  return entries.filter((e): e is AuditEntry => e !== null);
}
