import { redirect } from 'next/navigation';
import { event } from '@/config/event';
import LoginForm from '@/components/LoginForm';
import { requireAdmin } from '@/lib/auth';
import { safeNext } from '@/lib/safe-next';

export const metadata = { title: `Admin girişi — ${event.name}`, robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, '/admin', '/admin');
  if (await requireAdmin()) redirect(next);
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-4">
      <p className="text-center font-logo text-2xl font-bold tracking-[0.2em] text-gold">{event.name}</p>
      <h1 className="mb-6 mt-2 text-center text-sm uppercase tracking-[0.3em] text-white/60">Admin paneli</h1>
      <LoginForm endpoint="/api/admin/login" next={next} withUsername />
    </main>
  );
}
