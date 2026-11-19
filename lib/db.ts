import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __ppackSql?: Sql };

/**
 * Tekil Postgres bağlantı havuzu.
 * Supabase'de "Transaction pooler" (port 6543) adresini kullanın; prepare:false bunun için gerekli.
 */
export function db(): Sql {
  if (!g.__ppackSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.');
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__ppackSql = postgres(url, {
      max: Number(process.env.DB_POOL_MAX ?? (local ? 1 : 5)),
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: local ? false : 'require',
      onnotice: () => {},
    });
  }
  return g.__ppackSql;
}

export type OrderStatus = 'PAYMENT_SUBMITTED' | 'PAID' | 'REJECTED';
export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED';

export type Guest = { name: string; email: string; instagram: string };

export type OrderRow = {
  id: string;
  reference: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  unit_price: number;
  currency: 'TRY' | 'EUR';
  total: number;
  price_tier: string;
  status: OrderStatus;
  receipt_url: string | null;
  guests: Guest[];
  locale: 'tr' | 'en';
  submitted_at: Date;
  approved_at: Date | null;
  approved_by: string | null;
  reject_reason: string | null;
};

export type TicketRow = {
  id: string;
  order_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_instagram: string;
  signature: string;
  status: TicketStatus;
  checked_in_at: Date | null;
  replaced_by: string | null;
  locale: 'tr' | 'en';
  created_at: Date;
};

export type AuditRow = {
  id: number;
  admin: string;
  action: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
};

/** jsonb sürücüden string gelirse de diziye çevir. */
export function normalizeOrder<T extends { guests: unknown }>(row: T): T & { guests: Guest[] } {
  const guests = typeof row.guests === 'string' ? JSON.parse(row.guests) : row.guests;
  return { ...row, guests: guests as Guest[] };
}
