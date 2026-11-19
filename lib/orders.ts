import { randomUUID } from 'crypto';
import { event, type Currency } from '@/config/event';
import { audit } from './audit';
import { db, normalizeOrder, type Guest, type OrderRow, type TicketRow } from './db';
import { tierAt } from './pricing';
import { newReference } from './reference';
import { newTicketId, parseScannedCode, signTicket, verifyTicketSignature } from './tickets';

/** Kapasite transaction'larını sıraya sokan advisory lock anahtarı. */
const CAPACITY_LOCK = 20270101;

export class AppError extends Error {
  constructor(
    public code: 'capacity' | 'closed' | 'not_found' | 'conflict',
    public data: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

type Tx = ReturnType<typeof db>;

/** Dolu yer = onay bekleyen siparişlerdeki kişiler + geçerli/kullanılmış biletler. */
async function usedCapacity(sql: Tx): Promise<number> {
  const [row] = await sql<{ used: number }[]>`
    select
      (select coalesce(sum(quantity), 0) from orders where status = 'PAYMENT_SUBMITTED')::int
      + (select count(*) from tickets where status in ('VALID', 'USED'))::int as used
  `;
  return row.used;
}

export async function remainingCapacity(): Promise<number> {
  return Math.max(0, event.capacity - (await usedCapacity(db())));
}

export type NewOrderInput = {
  reference: string;
  guests: Guest[];
  currency: Currency;
  locale: 'tr' | 'en';
  receiptKey: string | null;
};

/**
 * Ödeme bildirimi: fiyatı sunucu saatiyle (İstanbul dönemlerine göre) hesaplar,
 * kapasiteyi kilit altında kontrol eder ve siparişi yazar.
 */
export async function createOrder(input: NewOrderInput): Promise<{ order: OrderRow; duplicate: boolean }> {
  const sql = db();
  const tier = tierAt(new Date());
  if (!tier) throw new AppError('closed');
  const quantity = input.guests.length;
  const unitPrice = tier[input.currency];
  const buyer = input.guests[0];

  const insert = async (reference: string) =>
    sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${CAPACITY_LOCK})`;
      const used = await usedCapacity(tx as unknown as Tx);
      if (used + quantity > event.capacity) {
        throw new AppError('capacity', { remaining: Math.max(0, event.capacity - used) });
      }
      const rows = await tx<OrderRow[]>`
        insert into orders
          (id, reference, buyer_name, buyer_email, quantity, unit_price, currency, total, price_tier,
           status, receipt_url, guests, locale)
        values
          (${randomUUID()}, ${reference}, ${buyer.name}, ${buyer.email}, ${quantity}, ${unitPrice},
           ${input.currency}, ${unitPrice * quantity}, ${tier.id}, 'PAYMENT_SUBMITTED',
           ${input.receiptKey}, ${JSON.stringify(input.guests)}::jsonb, ${input.locale})
        returning *
      `;
      return normalizeOrder(rows[0]);
    });

  let reference = input.reference;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return { order: await insert(reference), duplicate: false };
    } catch (e) {
      if ((e as { code?: string }).code !== '23505') throw e;
      // Aynı referans zaten kayıtlı: çift tıklama ise mevcut siparişi dön, değilse yeni kod üret.
      const [existing] = await sql<OrderRow[]>`select * from orders where reference = ${reference}`;
      if (existing && existing.buyer_email === buyer.email) {
        return { order: normalizeOrder(existing), duplicate: true };
      }
      reference = newReference();
    }
  }
  throw new Error('Referans üretilemedi');
}

export async function getOrderByReference(reference: string): Promise<OrderRow | null> {
  const [row] = await db()<OrderRow[]>`select * from orders where reference = ${reference}`;
  return row ? normalizeOrder(row) : null;
}

export async function getOrder(id: string): Promise<OrderRow | null> {
  const [row] = await db()<OrderRow[]>`select * from orders where id = ${id}`;
  return row ? normalizeOrder(row) : null;
}

export async function getTicket(id: string): Promise<TicketRow | null> {
  const [row] = await db()<TicketRow[]>`select * from tickets where id = ${id}`;
  return row ?? null;
}

async function insertTicket(tx: Tx, orderId: string | null, guest: Guest, locale: 'tr' | 'en'): Promise<TicketRow> {
  const id = newTicketId();
  const rows = await tx<TicketRow[]>`
    insert into tickets (id, order_id, guest_name, guest_email, guest_instagram, signature, status, locale)
    values (${id}, ${orderId}, ${guest.name}, ${guest.email}, ${guest.instagram}, ${signTicket(id)}, 'VALID', ${locale})
    returning *
  `;
  return rows[0];
}

/** Onay: sipariş PAID olur, her misafir için ayrı bilet üretilir. */
export async function approveOrder(orderId: string, admin: string): Promise<{ order: OrderRow; tickets: TicketRow[] }> {
  return db().begin(async (txRaw) => {
    const tx = txRaw as unknown as Tx;
    const [found] = await tx<OrderRow[]>`select * from orders where id = ${orderId} for update`;
    if (!found) throw new AppError('not_found');
    if (found.status !== 'PAYMENT_SUBMITTED') throw new AppError('conflict', { status: found.status });
    const order = normalizeOrder(found);
    const tickets: TicketRow[] = [];
    for (const guest of order.guests) tickets.push(await insertTicket(tx, order.id, guest, order.locale));
    const [updated] = await tx<OrderRow[]>`
      update orders set status = 'PAID', approved_at = now(), approved_by = ${admin}
      where id = ${order.id} returning *
    `;
    await audit(admin, 'order.approve', order.id, { reference: order.reference, tickets: tickets.map((t) => t.id) }, tx);
    return { order: normalizeOrder(updated), tickets };
  });
}

export async function rejectOrder(orderId: string, admin: string, reason: string): Promise<OrderRow> {
  return db().begin(async (txRaw) => {
    const tx = txRaw as unknown as Tx;
    const [found] = await tx<OrderRow[]>`select * from orders where id = ${orderId} for update`;
    if (!found) throw new AppError('not_found');
    if (found.status !== 'PAYMENT_SUBMITTED') throw new AppError('conflict', { status: found.status });
    const [updated] = await tx<OrderRow[]>`
      update orders set status = 'REJECTED', reject_reason = ${reason || null} where id = ${orderId} returning *
    `;
    await audit(admin, 'order.reject', orderId, { reference: found.reference, reason }, tx);
    return normalizeOrder(updated);
  });
}

/** İsim değişikliği: eski bilet iptal edilir, yeni kimlik + yeni QR ile yeni bilet açılır. */
export async function replaceTicket(ticketId: string, guest: Guest, admin: string): Promise<{ oldTicket: TicketRow; newTicket: TicketRow }> {
  return db().begin(async (txRaw) => {
    const tx = txRaw as unknown as Tx;
    const [old] = await tx<TicketRow[]>`select * from tickets where id = ${ticketId} for update`;
    if (!old) throw new AppError('not_found');
    if (old.status !== 'VALID') throw new AppError('conflict', { status: old.status });
    const fresh = await insertTicket(tx, old.order_id, guest, old.locale);
    const [cancelled] = await tx<TicketRow[]>`
      update tickets set status = 'CANCELLED', replaced_by = ${fresh.id} where id = ${old.id} returning *
    `;
    await audit(
      admin,
      'ticket.rename',
      old.id,
      {
        newTicket: fresh.id,
        from: { name: old.guest_name, email: old.guest_email, instagram: old.guest_instagram },
        to: guest,
      },
      tx,
    );
    return { oldTicket: cancelled, newTicket: fresh };
  });
}

/** Elle davetli bileti: siparişsiz, kapasiteye dahil. */
export async function createCompTicket(guest: Guest, locale: 'tr' | 'en', admin: string): Promise<TicketRow> {
  return db().begin(async (txRaw) => {
    const tx = txRaw as unknown as Tx;
    await tx`select pg_advisory_xact_lock(${CAPACITY_LOCK})`;
    const used = await usedCapacity(tx);
    if (used + 1 > event.capacity) throw new AppError('capacity', { remaining: 0 });
    const ticket = await insertTicket(tx, null, guest, locale);
    await audit(admin, 'ticket.comp', ticket.id, { guest }, tx);
    return ticket;
  });
}

export type ScanResult =
  | { result: 'VALID'; name: string; instagram: string; time: string }
  | { result: 'ALREADY_USED'; name: string; instagram: string; time: string | null }
  | { result: 'INVALID'; reason: 'not_found' | 'cancelled' | 'bad_code' | 'ambiguous' };

/**
 * Kapıda okutma. Bilet tek bir atomik UPDATE ile kullanılmış olarak işaretlenir:
 * aynı anda iki cihaz okutsa bile yalnızca biri satır döndürür.
 */
export async function checkIn(rawCode: string, staff: string, timeFmt: (d: Date) => string): Promise<ScanResult> {
  const sql = db();
  const parsed = parseScannedCode(rawCode);
  if (parsed.kind === 'invalid') return { result: 'INVALID', reason: 'bad_code' };

  let id: string;
  if (parsed.kind === 'prefix') {
    const matches = await sql<{ id: string }[]>`
      select id from tickets where id like ${parsed.prefix + '%'} limit 2
    `;
    if (matches.length === 0) return { result: 'INVALID', reason: 'not_found' };
    if (matches.length > 1) return { result: 'INVALID', reason: 'ambiguous' };
    id = matches[0].id;
  } else {
    id = parsed.id;
  }

  const [used] = await sql<TicketRow[]>`
    update tickets set status = 'USED', checked_in_at = now()
    where id = ${id} and status = 'VALID'
    returning *
  `;
  if (used) {
    if (!verifyTicketSignature(used.id, used.signature)) {
      // İmza tutmuyorsa (sahte satır / yanlış TICKET_SECRET) girişi geri al ve reddet.
      await sql`update tickets set status = 'VALID', checked_in_at = null where id = ${id}`;
      return { result: 'INVALID', reason: 'bad_code' };
    }
    await audit(staff, 'ticket.checkin', used.id, { name: used.guest_name });
    return { result: 'VALID', name: used.guest_name, instagram: used.guest_instagram, time: timeFmt(used.checked_in_at!) };
  }

  const [existing] = await sql<TicketRow[]>`select * from tickets where id = ${id}`;
  if (!existing) return { result: 'INVALID', reason: 'not_found' };
  if (existing.status === 'USED') {
    return {
      result: 'ALREADY_USED',
      name: existing.guest_name,
      instagram: existing.guest_instagram,
      time: existing.checked_in_at ? timeFmt(existing.checked_in_at) : null,
    };
  }
  return { result: 'INVALID', reason: 'cancelled' };
}

export type Stats = {
  confirmedTickets: number;
  pendingOrders: number;
  pendingPeople: number;
  revenueTRY: number;
  revenueEUR: number;
  remaining: number;
  checkedIn: number;
  capacity: number;
};

export async function getStats(): Promise<Stats> {
  const [r] = await db()<
    { confirmed: number; checked_in: number; pending_orders: number; pending_people: number; try: number; eur: number }[]
  >`
    select
      (select count(*) from tickets where status in ('VALID', 'USED'))::int as confirmed,
      (select count(*) from tickets where status = 'USED')::int as checked_in,
      (select count(*) from orders where status = 'PAYMENT_SUBMITTED')::int as pending_orders,
      (select coalesce(sum(quantity), 0) from orders where status = 'PAYMENT_SUBMITTED')::int as pending_people,
      (select coalesce(sum(total), 0) from orders where status = 'PAID' and currency = 'TRY')::int as try,
      (select coalesce(sum(total), 0) from orders where status = 'PAID' and currency = 'EUR')::int as eur
  `;
  return {
    confirmedTickets: r.confirmed,
    pendingOrders: r.pending_orders,
    pendingPeople: r.pending_people,
    revenueTRY: r.try,
    revenueEUR: r.eur,
    remaining: Math.max(0, event.capacity - r.confirmed - r.pending_people),
    checkedIn: r.checked_in,
    capacity: event.capacity,
  };
}
