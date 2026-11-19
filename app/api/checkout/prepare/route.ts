import { event } from '@/config/event';
import { fail, json, parseJson, sameOrigin } from '@/lib/http';
import { remainingCapacity } from '@/lib/orders';
import { tierAt } from '@/lib/pricing';
import { rateLimit } from '@/lib/rate-limit';
import { newReference, signReference } from '@/lib/reference';
import { checkoutSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * Ödeme ekranı için referans kodu ve güncel tutarı üretir.
 * Bu adımda veritabanına sipariş YAZILMAZ; referans imzalı bir jetonla istemciye verilir.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  // Önizleme yayını: veritabanı bağlanmadan satış açılmaz.
  if (!process.env.DATABASE_URL) return fail('preview', 503);
  if (!(await rateLimit('prepare', req, 20, 600))) return fail('rate_limit', 429);

  const parsed = await parseJson(req, checkoutSchema);
  if ('error' in parsed) return parsed.error;
  const { guests, currency } = parsed.data;

  const tier = tierAt(new Date());
  if (!tier) return fail('closed', 409);
  const remaining = await remainingCapacity();
  if (guests.length > remaining) return fail('capacity', 409, { remaining });

  const reference = newReference();
  return json({
    reference,
    token: signReference(reference),
    currency,
    quantity: guests.length,
    unitPrice: tier[currency],
    total: tier[currency] * guests.length,
    tier: tier.id,
    revolutUrl: event.revolutUrl,
  });
}
