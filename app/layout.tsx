import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter, Playfair_Display } from 'next/font/google';
import { getI18n } from '@/i18n/server';
import { siteUrl } from '@/lib/env';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['700'],
  variable: '--font-playfair',
  display: 'swap',
});
const cinzel = Cinzel({ subsets: ['latin'], weight: ['700'], variable: '--font-cinzel', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    metadataBase: new URL(siteUrl()),
    title: t.meta.title,
    description: t.meta.description,
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      images: ['/poster.jpg'],
      locale: locale === 'tr' ? 'tr_TR' : 'en_GB',
      type: 'website',
    },
  };
}

export const viewport: Viewport = { themeColor: '#050505', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable} ${cinzel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
