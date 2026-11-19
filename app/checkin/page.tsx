import { redirect } from 'next/navigation';
import { event } from '@/config/event';
import CheckinScanner from '@/components/CheckinScanner';
import { requireStaff } from '@/lib/auth';
import { getStats } from '@/lib/orders';

export const dynamic = 'force-dynamic';
export const metadata = { title: `Kapı — ${event.name}`, robots: { index: false } };

export default async function CheckinPage() {
  const session = await requireStaff();
  if (!session) redirect('/checkin/login');
  const stats = await getStats();
  return <CheckinScanner initial={{ checkedIn: stats.checkedIn, totalTickets: stats.confirmedTickets }} isAdmin={session.role === 'admin'} />;
}
