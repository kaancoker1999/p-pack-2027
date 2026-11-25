import type { Metadata } from 'next';
import { event } from '@/config/event';
import { getI18n } from '@/i18n/server';
import PageShell from '@/components/PageShell';
import RegisterForm from '@/components/RegisterForm';
import { formatEventDate } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: `${t.form.title} — ${event.name}` };
}

export default async function RegisterPage() {
  const { t, locale } = await getI18n();
  return (
    <PageShell t={t} locale={locale} width="max-w-xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">{t.form.title}</h1>
        <p className="mt-3 text-sm text-white/70">
          {event.name} · {formatEventDate(locale)} · {event.venue.name}
        </p>
        <p className="mx-auto mt-3 max-w-md text-white/80">{t.form.intro}</p>
      </div>
      <RegisterForm t={t} locale={locale} inviters={event.inviters} />
    </PageShell>
  );
}
