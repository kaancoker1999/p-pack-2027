import { redirect } from 'next/navigation';
import { event } from '@/config/event';
import AdminDashboard, { type AdminData } from '@/components/AdminDashboard';
import { requireAdmin } from '@/lib/auth';
import { db, type AuditRow } from '@/lib/db';
import { listRegistrations } from '@/lib/registrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Admin — ${event.name}`, robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAdmin();
  if (!session) redirect('/admin/login');
  const [registrations, log] = await Promise.all([
    listRegistrations(),
    db()<AuditRow[]>`select * from audit_log order by created_at desc, id desc limit 200`,
  ]);

  const data: AdminData = {
    user: session.user,
    capacity: event.capacity,
    inviters: [...event.inviters],
    registrations: registrations.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      phone: r.phone,
      invitedBy: r.invited_by,
      locale: r.locale,
      createdAt: r.created_at.toISOString(),
    })),
    log: log.map((l) => ({
      id: Number(l.id),
      admin: l.admin,
      action: l.action,
      details: typeof l.details === 'string' ? JSON.parse(l.details) : l.details,
      at: l.created_at.toISOString(),
    })),
  };

  return <AdminDashboard data={data} initialQuery={(await searchParams).q ?? ''} />;
}
