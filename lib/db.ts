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

/** Ödeme durumu: ödenmedi / nakit / IBAN (admin panelinden işaretlenir) */
export type Payment = 'unpaid' | 'cash' | 'iban';

export type RegistrationRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  invited_by: string;
  locale: 'tr' | 'en';
  payment: Payment;
  /** Elle düzeltilmiş cinsiyet (parti listesi rengi); null ise isimden tahmin edilir */
  gender: 'm' | 'f' | 'u' | null;
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
