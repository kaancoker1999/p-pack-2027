import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[\p{L}\p{M}'’.\- ]+$/u)
  .refine((s) => s.split(/\s+/).length >= 2, 'full_name');

const email = z.string().trim().toLowerCase().max(160).email();

/** Instagram kullanıcı adı: baştaki @ atılır, küçük harfe çevrilir. */
const instagram = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@+/, '').toLowerCase())
  .pipe(z.string().regex(/^[a-z0-9._]{1,30}$/));

export const guestSchema = z.object({ name, email, instagram });

export const checkoutSchema = z.object({
  guests: z.array(guestSchema).min(1).max(250),
  currency: z.enum(['TRY', 'EUR']),
  locale: z.enum(['tr', 'en']),
  consents: z.object({
    age: z.literal(true),
    noRefund: z.literal(true),
    kvkk: z.literal(true),
  }),
  /** Honeypot: insanlar bu alanı görmez, boş kalmalıdır. */
  website: z.string().max(0).optional().default(''),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderSubmitSchema = checkoutSchema.extend({
  reference: z.string().trim().toUpperCase().max(20),
  token: z.string().max(200),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});
export const checkinLoginSchema = z.object({ password: z.string().min(1).max(200) });

export const rejectSchema = z.object({ reason: z.string().trim().max(500).optional().default('') });

export const ticketEditSchema = guestSchema;
export const compTicketSchema = guestSchema.extend({ locale: z.enum(['tr', 'en']).default('tr') });

export const scanSchema = z.object({ code: z.string().trim().min(1).max(300) });

export const uuidSchema = z.string().uuid();
export const ticketIdSchema = z.string().regex(/^[0-9A-F]{32}$/);
