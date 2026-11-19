import { event } from '@/config/event';
import { fmt } from '@/i18n';
import { getI18n } from '@/i18n/server';
import PageShell from '@/components/PageShell';

export default async function KvkkPage() {
  const { t, locale } = await getI18n();
  return (
    <PageShell t={t} locale={locale} cta>
      <h1 className="font-display text-4xl font-bold">{t.kvkk.title}</h1>
      <p className="mt-2 text-xs text-white/50">{t.kvkk.updated}</p>
      <div className="mt-8 space-y-7">
        {t.kvkk.sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl font-bold text-gold">{s.h}</h2>
            <p className="mt-2 leading-relaxed text-white/80">{fmt(s.p, { email: event.ticketsEmail })}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
