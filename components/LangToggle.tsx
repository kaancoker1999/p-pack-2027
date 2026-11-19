'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n';

export default function LangToggle({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const set = (l: Locale) => {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center rounded-full border border-white/20 bg-black/40 p-0.5 text-xs font-semibold backdrop-blur ${pending ? 'opacity-60' : ''}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          aria-pressed={l === locale}
          className={`min-w-10 rounded-full px-3 py-2 uppercase tracking-wider transition ${
            l === locale ? 'bg-gold text-black' : 'text-white/70 hover:text-white'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
