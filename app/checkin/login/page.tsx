import { redirect } from 'next/navigation';
import { event } from '@/config/event';
import LoginForm from '@/components/LoginForm';
import { requireStaff } from '@/lib/auth';

export const metadata = { title: `Kapı girişi — ${event.name}`, robots: { index: false } };

export default async function CheckinLoginPage() {
  if (await requireStaff()) redirect('/checkin');
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-4">
      <p className="text-center font-logo text-2xl font-bold tracking-[0.2em] text-gold">{event.name}</p>
      <h1 className="mb-6 mt-2 text-center text-sm uppercase tracking-[0.3em] text-white/60">Kapı · bilet okutma</h1>
      <LoginForm endpoint="/api/checkin/login" next="/checkin" withUsername={false} />
    </main>
  );
}
