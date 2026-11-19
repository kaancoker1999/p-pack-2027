import { redirect } from 'next/navigation';
import { event } from '@/config/event';
import AdminDashboard, { type AdminData } from '@/components/AdminDashboard';
import { requireAdmin } from '@/lib/auth';
import { db, normalizeOrder, type AuditRow, type OrderRow, type TicketRow } from '@/lib/db';
import { getStats } from '@/lib/orders';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Admin — ${event.name}`, robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAdmin();
  if (!session) redirect('/admin/login');
  const sql = db();
  const [orders, tickets, log, stats] = await Promise.all([
    sql<OrderRow[]>`select * from orders order by submitted_at desc`,
    sql<TicketRow[]>`select * from tickets order by created_at desc`,
    sql<AuditRow[]>`select * from audit_log order by created_at desc, id desc limit 300`,
    getStats(),
  ]);

  const data: AdminData = {
    user: session.user,
    now: Date.now(),
    approvalWindowHours: event.approvalWindowHours,
    stats,
    orders: orders.map(normalizeOrder).map((o) => ({
      id: o.id,
      reference: o.reference,
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      quantity: o.quantity,
      unitPrice: o.unit_price,
      currency: o.currency,
      total: o.total,
      tier: o.price_tier,
      status: o.status,
      hasReceipt: !!o.receipt_url,
      guests: o.guests,
      submittedAt: o.submitted_at.toISOString(),
      approvedAt: o.approved_at?.toISOString() ?? null,
      approvedBy: o.approved_by,
      rejectReason: o.reject_reason,
    })),
    tickets: tickets.map((t) => ({
      id: t.id,
      orderId: t.order_id,
      name: t.guest_name,
      email: t.guest_email,
      instagram: t.guest_instagram,
      status: t.status,
      checkedInAt: t.checked_in_at?.toISOString() ?? null,
      replacedBy: t.replaced_by,
    })),
    log: log.map((l) => ({
      id: Number(l.id),
      admin: l.admin,
      action: l.action,
      targetId: l.target_id,
      details: typeof l.details === 'string' ? JSON.parse(l.details) : l.details,
      at: l.created_at.toISOString(),
    })),
  };

  return <AdminDashboard data={data} initialQuery={(await searchParams).q ?? ''} />;
}
