import { z } from 'zod';
import { event } from '@/config/event';
import { normalizePhone } from './phone';

/** Ad / soyad: harf, boşluk, kesme ve tire */
const namePart = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[\p{L}\p{M}'’.\- ]+$/u)
  .transform((s) => s.replace(/\s+/g, ' '));

const phone = z
  .string()
  .max(30)
  .transform((s) => normalizePhone(s))
  .refine((v): v is string => v !== null, 'phone');

/** Referans kişisi: yalnızca config'deki organizatör adlarından biri olabilir. */
const invitedBy = z.string().refine((v) => (event.inviters as readonly string[]).includes(v), 'inviter');

export const registerSchema = z.object({
  firstName: namePart,
  lastName: namePart,
  phone,
  invitedBy,
  locale: z.enum(['tr', 'en']),
  consents: z.object({ age: z.literal(true), kvkk: z.literal(true) }),
  /** Honeypot: insanlar bu alanı görmez, boş kalmalıdır. */
  website: z.string().max(0).optional().default(''),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

/** Admin güncellemesi: ödeme durumu ve/veya parti listesindeki renk (cinsiyet) */
export const registrationPatchSchema = z
  .object({ payment: z.enum(['unpaid', 'cash', 'iban']).optional(), gender: z.enum(['m', 'f', 'u']).optional() })
  .refine((v) => v.payment !== undefined || v.gender !== undefined, 'empty');

export const uuidSchema = z.string().uuid();
