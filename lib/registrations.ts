import { randomUUID } from 'crypto';
import { audit } from './audit';
import { db, type Payment, type RegistrationRow } from './db';

export type NewRegistration = {
  firstName: string;
  lastName: string;
  phone: string;
  invitedBy: string;
  locale: 'tr' | 'en';
};

/**
 * Kayıt oluşturur. Aynı telefon numarası ikinci kez kaydolursa yeni satır açılmaz
 * (telefon benzersizdir); mevcut kayıt döner.
 */
export async function createRegistration(input: NewRegistration): Promise<{ row: RegistrationRow; duplicate: boolean }> {
  const sql = db();
  const inserted = await sql<RegistrationRow[]>`
    insert into registrations (id, first_name, last_name, phone, invited_by, locale)
    values (${randomUUID()}, ${input.firstName}, ${input.lastName}, ${input.phone}, ${input.invitedBy}, ${input.locale})
    on conflict (phone) do nothing
    returning *
  `;
  if (inserted[0]) return { row: inserted[0], duplicate: false };
  const [existing] = await sql<RegistrationRow[]>`select * from registrations where phone = ${input.phone}`;
  return { row: existing, duplicate: true };
}

export async function listRegistrations(): Promise<RegistrationRow[]> {
  return db()<RegistrationRow[]>`select * from registrations order by created_at desc, id`;
}

/** Ödeme durumunu günceller; değişiklik kayda geçer. */
export async function setPayment(id: string, payment: Payment, admin: string): Promise<boolean> {
  return db().begin(async (tx) => {
    const [before] = await tx<RegistrationRow[]>`select * from registrations where id = ${id} for update`;
    if (!before) return false;
    if (before.payment !== payment) {
      await tx`update registrations set payment = ${payment} where id = ${id}`;
      await audit(admin, 'registration.payment', id, { name: `${before.first_name} ${before.last_name}`, from: before.payment, to: payment }, tx);
    }
    return true;
  });
}

export async function deleteRegistration(id: string, admin: string): Promise<boolean> {
  return db().begin(async (tx) => {
    const rows = await tx<RegistrationRow[]>`delete from registrations where id = ${id} returning *`;
    if (!rows[0]) return false;
    await audit(admin, 'registration.delete', id, { name: `${rows[0].first_name} ${rows[0].last_name}`, invitedBy: rows[0].invited_by }, tx);
    return true;
  });
}
