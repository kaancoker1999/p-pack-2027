import { redirect } from 'next/navigation';
import { event } from '@/config/event';
import AdminDashboard, { type AdminData } from '@/components/AdminDashboard';
import { recentAudit } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth';
import { listRegistrations } from '@/lib/registrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Admin — ${event.name}`, robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAdmin();
  if (!session) redirect('/admin/login');
  const [registrations, log] = await Promise.all([listRegistrations(), recentAudit(200)]);

  const data: AdminData = {
    user: session.user,
    capacity: event.capacity,
    inviters: [...event.inviters],
    registrations: registrations.map(({ id, firstName, lastName, phone, invitedBy, payment, gender, createdAt }) => ({
      id,
      firstName,
      lastName,
      phone,
      invitedBy,
      payment,
      gender,
      createdAt,
    })),
    log: log.map((l, i) => ({ id: i, admin: l.admin, action: l.action, details: l.details, at: l.at })),
  };

  return <AdminDashboard data={data} initialQuery={(await searchParams).q ?? ''} />;
}
