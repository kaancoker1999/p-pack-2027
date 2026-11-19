import { staffRoute } from '@/lib/admin-api';
import { json } from '@/lib/http';
import { getStats } from '@/lib/orders';

export const runtime = 'nodejs';

export const GET = staffRoute(async () => {
  const stats = await getStats();
  return json({ checkedIn: stats.checkedIn, totalTickets: stats.confirmedTickets });
});
