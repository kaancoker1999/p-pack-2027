import { fail, json, parseJson, sameOrigin } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { createRegistration } from '@/lib/registrations';
import { registerSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** Kayıt formu: ad, soyad, telefon, referans kişisi. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  try {
    if (!(await rateLimit('register', req, 30, 600))) return fail('rate_limit', 429);

    const parsed = await parseJson(req, registerSchema);
    if ('error' in parsed) return parsed.error;
    const { firstName, lastName, phone, invitedBy, locale } = parsed.data;

    const { row, duplicate } = await createRegistration({ firstName, lastName, phone, invitedBy, locale });
    // Aynı telefonla ikinci kayıt: başkasının bilgisini sızdırmamak için yalnızca "zaten kayıtlı" denir.
    return json({ ok: true, duplicate, firstName: duplicate ? null : row.firstName });
  } catch (e) {
    console.error('[register] kayıt hatası', e);
    return fail('generic', 500);
  }
}
