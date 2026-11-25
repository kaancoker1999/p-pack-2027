import { randomUUID } from 'crypto';
import { audit } from './audit';
import { db, type RegistrationRow } from './db';

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

export async function deleteRegistration(id: string, admin: string): Promise<boolean> {
  return db().begin(async (tx) => {
    const rows = await tx<RegistrationRow[]>`delete from registrations where id = ${id} returning *`;
    if (!rows[0]) return false;
    await audit(admin, 'registration.delete', id, { name: `${rows[0].first_name} ${rows[0].last_name}`, invitedBy: rows[0].invited_by }, tx);
    return true;
  });
}
