import { fail, json, sameOrigin } from '@/lib/http';
import { adminNewOrderMail, orderReceivedMail } from '@/lib/email/templates';
import { adminRecipients, sendEmails } from '@/lib/email/send';
import { AppError, createOrder } from '@/lib/orders';
import { rateLimit } from '@/lib/rate-limit';
import { verifyReference } from '@/lib/reference';
import { checkReceipt, deleteReceipt, uploadReceipt } from '@/lib/storage';
import { orderSubmitSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * "Ödemeyi yaptım": sipariş ilk kez burada veritabanına yazılır (PAYMENT_SUBMITTED).
 * Gövde multipart/form-data: payload (JSON) + isteğe bağlı receipt (dosya).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail('forbidden', 403);
  if (!(await rateLimit('order', req, 8, 600))) return fail('rate_limit', 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('validation', 400);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get('payload') ?? ''));
  } catch {
    return fail('validation', 400);
  }
  const parsed = orderSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return fail('validation', 400, { fields: parsed.error.issues.map((i) => i.path.join('.')) });
  }
  const input = parsed.data;
  if (!verifyReference(input.reference, input.token)) return fail('token', 400);

  // Dekont: isteğe bağlı; tür (içerik imzasından) ve boyut kontrolü
  const file = form.get('receipt');
  let receipt: Awaited<ReturnType<typeof checkReceipt>> | null = null;
  if (file instanceof File && file.size > 0) {
    receipt = await checkReceipt(file);
    if (!receipt.ok) return fail(receipt.error === 'too_large' ? 'receipt_size' : 'receipt_type', 400);
  }

  let receiptKey: string | null = null;
  try {
    if (receipt?.ok) receiptKey = await uploadReceipt(input.reference, receipt.buf, receipt.kind);
    const { order, duplicate } = await createOrder({
      reference: input.reference,
      guests: input.guests,
      currency: input.currency,
      locale: input.locale,
      receiptKey,
    });
    if (duplicate) {
      if (receiptKey && receiptKey !== order.receipt_url) await deleteReceipt(receiptKey);
    } else {
      const admins = adminRecipients();
      await sendEmails([orderReceivedMail(order), ...(admins.length ? [adminNewOrderMail(order, admins)] : [])]);
    }
    return json({
      reference: order.reference,
      total: order.total,
      unitPrice: order.unit_price,
      currency: order.currency,
      email: order.buyer_email,
    });
  } catch (e) {
    if (receiptKey) await deleteReceipt(receiptKey);
    if (e instanceof AppError) {
      if (e.code === 'capacity') return fail('capacity', 409, e.data);
      if (e.code === 'closed') return fail('closed', 409);
    }
    console.error('[orders] kayıt hatası', e);
    return fail('generic', 500);
  }
}
