import { staffRoute } from '@/lib/admin-api';
import { json, parseJson } from '@/lib/http';
import { checkIn, getStats } from '@/lib/orders';
import { formatTime } from '@/lib/pricing';
import { scanSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = staffRoute(async (req, session) => {
  const parsed = await parseJson(req, scanSchema);
  if ('error' in parsed) return parsed.error;
  const scan = await checkIn(parsed.data.code, session.user, formatTime);
  const stats = await getStats();
  return json({ ...scan, checkedIn: stats.checkedIn, totalTickets: stats.confirmedTickets });
});
