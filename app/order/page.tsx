import { redirect } from 'next/navigation';
import { getI18n } from '@/i18n/server';
import PageShell from '@/components/PageShell';

async function lookup(formData: FormData) {
  'use server';
  const ref = String(formData.get('reference') ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20);
  redirect(ref ? `/order/${ref}` : '/order');
}

export default async function OrderLookupPage() {
  const { t, locale } = await getI18n();
  return (
    <PageShell t={t} locale={locale} cta width="max-w-md">
      <h1 className="text-center font-display text-4xl font-bold">{t.order.lookupTitle}</h1>
      <form action={lookup} className="card mt-8 space-y-4">
        <label className="label" htmlFor="reference">
          {t.order.reference}
        </label>
        <input id="reference" name="reference" className="field font-mono uppercase tracking-widest" placeholder={t.order.lookupPh} maxLength={20} required autoCapitalize="characters" />
        <button className="btn-primary w-full">{t.order.lookupBtn}</button>
      </form>
    </PageShell>
  );
}
