/** Sitenin dış adresi (e-postalardaki linkler için). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** En az 32 karakterlik gizli anahtar okur; yoksa açık bir hata verir. */
export function secret(name: 'TICKET_SECRET' | 'SESSION_SECRET'): string {
  const v = process.env[name];
  if (!v || v.length < 32) {
    throw new Error(`${name} tanımlı değil ya da 32 karakterden kısa. .env dosyasını kontrol edin.`);
  }
  return v;
}

/**
 * Üretim modu. LOCAL_DEV_MODE=1 ise (yalnızca kendi bilgisayarınızda) Resend/Supabase Storage
 * tanımlı olmasa da e-postalar ve dekontlar .dev-data klasörüne yazılır.
 */
export const isProd = process.env.NODE_ENV === 'production' && process.env.LOCAL_DEV_MODE !== '1';
