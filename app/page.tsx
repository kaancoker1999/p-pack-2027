import Link from 'next/link';
import { event } from '@/config/event';
import { fmt } from '@/i18n';
import { getI18n } from '@/i18n/server';
import Countdown, { InlineCountdown } from '@/components/Countdown';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import HeroVideo from '@/components/HeroVideo';
import PartyScene from '@/components/PartyScene';
import Reveal from '@/components/Reveal';
import { remainingCapacity } from '@/lib/orders';
import {
  formatDayMonth,
  formatEventDate,
  formatEventTime,
  formatMoney,
  nextTierAt,
  tierAt,
  tierLastDay,
  tierStart,
  trLocative,
} from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const icons = {
  bar: 'M8 22h8M12 15v7M5 3h14l-1.2 6.2A6 6 0 0 1 12 14a6 6 0 0 1-5.8-4.8L5 3zM6 8h12',
  dj: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  id: 'M3 5h18v14H3zM7 15h4M7 11h4M15 10a1.5 1.5 0 1 0 0-.01M13 15a2.5 2.5 0 0 1 5 0',
  dress: 'M12 3l2.5 4L12 9 9.5 7 12 3zM12 9l6 12H6l6-12z',
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const now = new Date();
  const current = tierAt(now);
  const next = nextTierAt(now);
  // Veritabanı geçici olarak erişilemezse ana sayfa yine de açılsın.
  const remaining = await remainingCapacity().catch(() => null);
  const soldOut = remaining === 0;
  const countdownLabels = { days: t.hero.days, hours: t.hero.hours, minutes: t.hero.minutes, seconds: t.hero.seconds };
  const eventDate = formatEventDate(locale);

  const highlights = [
    { icon: icons.bar, title: t.night.openBarTitle, text: t.night.openBarText },
    { icon: icons.dj, title: t.night.djTitle, text: t.night.djText },
    { icon: icons.dress, title: t.night.dressTitle, text: t.night.dressText },
  ];

  return (
    <>
      <Header t={t} locale={locale} />
      <main>
        {/* HERO */}
        <section className="relative flex min-h-svh flex-col items-center justify-center px-4 pb-28 pt-20 text-center sm:pb-48 sm:pt-24">
          <HeroVideo />
          <div className="relative z-10 mx-auto w-full max-w-4xl">
            <p className="eyebrow">{t.hero.eyebrow}</p>
            <h1 className="mt-4 font-logo font-bold leading-none">
              <span className="gold-text block text-[15.5vw] tracking-[0.04em] sm:text-8xl lg:text-9xl">{event.logo.top}</span>
              <span className="mt-1 block text-[13vw] tracking-[0.3em] text-white sm:text-7xl">{event.logo.bottom}</span>
            </h1>
            <p className="mt-6 text-base font-medium text-white sm:text-xl">
              {eventDate} · {formatEventTime()} – {t.hero.untilMorning}
            </p>
            <p className="mt-1 text-sm text-white/75 sm:text-base">
              {event.venue.name}, {event.venue.area}
            </p>

            <div className="mx-auto mt-9 max-w-2xl">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-white/70">{t.hero.countdownTitle}</p>
              <Countdown target={event.countdownTo} labels={countdownLabels} doneText={t.hero.happyNewYear} />
            </div>

            <div className="mt-9 flex flex-col items-center gap-3">
              <Link href="/tickets" className="btn-primary px-10 py-4 text-base">
                {t.hero.cta}
              </Link>
              {current && !soldOut && (
                <p className="text-sm text-white/75">
                  {fmt(t.hero.priceNow, {
                    price: `${formatMoney(current.TRY, 'TRY', locale)} / ${formatMoney(current.EUR, 'EUR', locale)}`,
                  })}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* GECE NELER VAR */}
        <section id="night" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <p className="eyebrow">{t.night.eyebrow}</p>
            <h2 className="section-title">{t.night.title}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {highlights.map((h, i) => (
              <Reveal key={h.title} delay={i * 0.08}>
                <div className="card h-full">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 text-gold">
                    <Icon d={h.icon} />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{h.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* BİLET & FİYAT */}
        <section id="tickets" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <p className="eyebrow">{t.pricing.eyebrow}</p>
            <h2 className="section-title">{t.pricing.title}</h2>
            <p className="mt-3 max-w-2xl text-white/70">{t.pricing.subtitle}</p>
          </Reveal>

          <Reveal delay={0.05} className="mt-10">
            <PartyScene />
          </Reveal>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {event.priceTiers.map((tier, i) => {
              const isCurrent = current?.id === tier.id;
              const isPast = !isCurrent && now.getTime() >= new Date(tier.until).getTime();
              const start = tierStart(tier);
              const lastDay = formatDayMonth(tierLastDay(tier), locale);
              const period = start
                ? fmt(t.pricing.range, { from: formatDayMonth(start, locale), to: lastDay })
                : fmt(t.pricing.until, { date: lastDay });
              return (
                <Reveal key={tier.id} delay={i * 0.08}>
                  <div
                    className={`relative h-full rounded-2xl border p-6 transition ${
                      isCurrent
                        ? 'border-gold bg-gradient-to-b from-blood/50 to-black shadow-[0_0_50px_rgba(193,18,31,0.25)]'
                        : 'border-white/10 bg-white/[0.03]'
                    } ${isPast ? 'opacity-45' : ''}`}
                  >
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        isCurrent ? 'bg-gold text-black' : 'border border-white/20 text-white/60'
                      }`}
                    >
                      {isCurrent ? t.pricing.current : isPast ? t.pricing.past : t.pricing.upcoming}
                    </span>
                    <p className="mt-4 font-display text-2xl font-bold text-white">{tier.label}</p>
                    <p className="mt-1 text-sm text-white/70">{period}</p>
                    <p className={`mt-3 font-display text-5xl font-bold ${isPast ? 'line-through decoration-1' : ''}`}>
                      {formatMoney(tier.TRY, 'TRY', locale)}
                    </p>
                    <p className="mt-1 text-lg text-gold">
                      {t.pricing.or} {formatMoney(tier.EUR, 'EUR', locale)}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
              <div className="card">
                {!current ? (
                  <p className="font-display text-xl font-bold">{t.pricing.closed}</p>
                ) : soldOut ? (
                  <p className="font-display text-xl font-bold">{t.pricing.soldOut}</p>
                ) : (
                  <>
                    {next ? (
                      <>
                        <p className="font-display text-xl font-bold text-white sm:text-2xl">
                          {fmt(t.pricing.increase, {
                            date:
                              locale === 'tr'
                                ? trLocative(formatDayMonth(new Date(current.until), locale))
                                : formatDayMonth(new Date(current.until), locale),
                            price: `${formatMoney(next.TRY, 'TRY', locale)} / ${formatMoney(next.EUR, 'EUR', locale)}`,
                          })}
                        </p>
                        <p className="mt-3 text-sm text-white/70">
                          {t.pricing.increaseIn}:{' '}
                          <strong className="font-semibold text-gold">
                            <InlineCountdown target={current.until} labels={countdownLabels} />
                          </strong>
                        </p>
                      </>
                    ) : (
                      <p className="font-display text-xl font-bold">{t.pricing.lastTier}</p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <Link href="/tickets" className="btn-primary">
                        {t.pricing.cta}
                      </Link>
                      {remaining !== null && remaining <= 50 && (
                        <span className="text-sm font-medium text-gold">{fmt(t.pricing.remaining, { n: remaining })}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{t.pricing.included}</p>
                <ul className="mt-4 space-y-2 text-sm text-white/85">
                  {[t.pricing.inc1, t.pricing.inc2, t.pricing.inc3].map((x) => (
                    <li key={x} className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-crimson" />
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/60">{t.pricing.noRefund}</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* MEKAN */}
        <section id="venue" className="border-t border-white/10 bg-coal">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="eyebrow">{t.venue.eyebrow}</p>
              <h2 className="section-title">{event.venue.name}</h2>
              <p className="mt-2 font-display text-xl text-gold">{t.venue.title}</p>
              <p className="mt-5 text-white/85">{event.venue.address}</p>
              <p className="mt-1 text-sm font-medium text-gold">{event.venue.addressNote[locale]}</p>
              <dl className="mt-6 grid max-w-sm grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-white/50">{t.venue.doors}</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">{formatEventTime()}</dd>
                  <dd className="text-xs text-white/60">{eventDate}</dd>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-[0.2em] text-white/50">{t.venue.ends}</dt>
                  <dd className="mt-1 font-display text-2xl font-bold">{t.venue.sunrise}</dd>
                  <dd className="text-xs text-white/60">{formatDayMonth(new Date(event.countdownTo), locale)}</dd>
                </div>
              </dl>
              <a href={event.venue.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-gold mt-7">
                {t.venue.openMaps}
              </a>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black">
                <iframe
                  src={event.venue.mapsEmbedUrl}
                  title={t.venue.mapTitle}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full border-0 grayscale-[0.4] invert-[0.92] hue-rotate-180"
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer t={t} />
    </>
  );
}
