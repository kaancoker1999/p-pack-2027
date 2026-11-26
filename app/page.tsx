import Link from 'next/link';
import { event } from '@/config/event';
import { getI18n } from '@/i18n/server';
import Countdown from '@/components/Countdown';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import HeroVideo from '@/components/HeroVideo';
import { DjScene, ElegantScene, OpenBarScene } from '@/components/NightScenes';
import PartyScene from '@/components/PartyScene';
import Reveal from '@/components/Reveal';
import { formatDayMonth, formatEventDate, formatEventTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const countdownLabels = { days: t.hero.days, hours: t.hero.hours, minutes: t.hero.minutes, seconds: t.hero.seconds };
  const eventDate = formatEventDate(locale);

  // "Gece neler var" kartları: her birinin kendi hareketli görseli var.
  const highlights = [
    { scene: <OpenBarScene />, title: t.night.openBarTitle, text: t.night.openBarText },
    { scene: <DjScene />, title: t.night.djTitle, text: t.night.djText },
    { scene: <ElegantScene />, title: t.night.dressTitle, text: t.night.dressText },
    { scene: <PartyScene className="h-44 sm:h-60 md:h-48" />, title: t.night.donerTitle, text: t.night.donerText },
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
              <Link href="/register" className="btn-primary px-10 py-4 text-base">
                {t.hero.cta}
              </Link>
            </div>
          </div>
        </section>

        {/* GECE NELER VAR */}
        <section id="night" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <p className="eyebrow">{t.night.eyebrow}</p>
            <h2 className="section-title">{t.night.title}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {highlights.map((h, i) => (
              <Reveal key={h.title} delay={i * 0.08}>
                <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  {h.scene}
                  <div className="p-6 pt-5">
                    <h3 className="font-display text-xl font-bold">{h.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">{h.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* KAYIT */}
        <section id="register" className="border-y border-white/10 bg-gradient-to-b from-blood/25 via-coal to-ink">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <Reveal>
              <p className="eyebrow">{t.join.eyebrow}</p>
              <h2 className="section-title">{t.join.title}</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/75">{t.join.text}</p>
              <Link href="/register" className="btn-primary mt-8 px-10 py-4 text-base">
                {t.join.cta}
              </Link>
            </Reveal>
          </div>
        </section>

        {/* MEKAN */}
        <section id="venue" className="bg-coal">
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
