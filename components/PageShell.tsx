import type { Dict, Locale } from '@/i18n';
import Footer from './Footer';
import Header from './Header';

/** Alt sayfalar için ortak çerçeve */
export default function PageShell({
  t,
  locale,
  children,
  cta = false,
  width = 'max-w-2xl',
}: {
  t: Dict;
  locale: Locale;
  children: React.ReactNode;
  cta?: boolean;
  width?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_top,rgba(139,0,0,0.35),transparent_60%)]">
      <Header t={t} locale={locale} cta={cta} />
      <main className={`mx-auto w-full flex-1 px-4 pb-20 pt-28 sm:px-6 ${width}`}>{children}</main>
      <Footer t={t} />
    </div>
  );
}
