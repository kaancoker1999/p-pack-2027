import { audit } from './audit';
import { kv } from './store';

/** Ödeme durumu: ödenmedi / nakit / IBAN (admin panelinden işaretlenir) */
export type Payment = 'unpaid' | 'cash' | 'iban';

export type Registration = {
  /** Telefonun rakamları (905321234567). Depodaki anahtar da budur: aynı numara iki kez kaydolamaz. */
  id: string;
  firstName: string;
  lastName: string;
  /** +905321234567 */
  phone: string;
  invitedBy: string;
  locale: 'tr' | 'en';
  payment: Payment;
  /** Elle düzeltilmiş cinsiyet (parti listesi rengi); null ise isimden tahmin edilir */
  gender: 'm' | 'f' | 'u' | null;
  createdAt: string;
};

export type NewRegistration = Pick<Registration, 'firstName' | 'lastName' | 'phone' | 'invitedBy' | 'locale'>;

const key = (id: string) => `reg/${id}`;

/**
 * Kayıt oluşturur. Aynı telefon numarası ikinci kez kaydolursa yeni kayıt açılmaz
 * (anahtar telefon numarasıdır ve yalnızca yoksa yazılır); mevcut kayıt döner.
 */
export async function createRegistration(input: NewRegistration): Promise<{ row: Registration; duplicate: boolean }> {
  const store = kv();
  const id = input.phone.replace(/\D/g, '');
  const row: Registration = { id, ...input, payment: 'unpaid', gender: null, createdAt: new Date().toISOString() };
  if (await store.set(key(id), row, { onlyIfNew: true })) return { row, duplicate: false };
  return { row: (await store.get<Registration>(key(id))) ?? row, duplicate: true };
}

/** Tüm kayıtlar, en yeni üstte. */
export async function listRegistrations(): Promise<Registration[]> {
  const store = kv();
  const keys = await store.list('reg/');
  const rows = await Promise.all(keys.map((k) => store.get<Registration>(k)));
  return rows.filter((r): r is Registration => r !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Ödeme durumunu ve/veya parti listesindeki rengi günceller; ödeme değişikliği kayda geçer. */
export async function updateRegistration(
  id: string,
  patch: { payment?: Payment; gender?: 'm' | 'f' | 'u' },
  admin: string,
): Promise<boolean> {
  const store = kv();
  const before = await store.get<Registration>(key(id));
  if (!before) return false;
  await store.set(key(id), { ...before, ...patch });
  if (patch.payment && patch.payment !== before.payment) {
    await audit(admin, 'registration.payment', id, { name: `${before.firstName} ${before.lastName}`, from: before.payment, to: patch.payment });
  }
  return true;
}

export async function deleteRegistration(id: string, admin: string): Promise<boolean> {
  const store = kv();
  const before = await store.get<Registration>(key(id));
  if (!before) return false;
  await store.del(key(id));
  await audit(admin, 'registration.delete', id, { name: `${before.firstName} ${before.lastName}`, invitedBy: before.invitedBy });
  return true;
}
