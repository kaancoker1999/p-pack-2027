'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Currency } from '@/config/event';
import { fmt, type Dict, type Locale } from '@/i18n';

type Guest = { name: string; email: string; instagram: string };
type Quote = {
  reference: string;
  token: string;
  currency: Currency;
  quantity: number;
  unitPrice: number;
  total: number;
};
type Saved = { guests: Guest[]; currency: Currency; quote: Quote | null };

type Props = {
  t: Dict;
  locale: Locale;
  remaining: number;
  prices: Record<Currency, number>;
  revolutUrl: string;
  receiptMaxMb: number;
};

const STORAGE_KEY = 'ppack-checkout-v1';
const emptyGuest = (): Guest => ({ name: '', email: '', instagram: '' });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const IG_RE = /^[A-Za-z0-9._]{1,30}$/;
const NAME_RE = /^[\p{L}\p{M}'’.\- ]+$/u;

function money(amount: number, currency: Currency, locale: Locale) {
  const n = amount.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US');
  const sym = currency === 'TRY' ? '₺' : '€';
  return locale === 'tr' ? `${n} ${sym}` : `${sym}${n}`;
}

function guestErrors(g: Guest) {
  const name = g.name.trim();
  return {
    name: name.length < 3 || name.split(/\s+/).length < 2 || !NAME_RE.test(name),
    email: !EMAIL_RE.test(g.email.trim()),
    instagram: !IG_RE.test(g.instagram.trim().replace(/^@+/, '')),
  };
}

export default function TicketFlow({ t, locale, remaining, prices, revolutUrl, receiptMaxMb }: Props) {
  const [step, setStep] = useState<'form' | 'pay' | 'done'>('form');
  const [guests, setGuests] = useState<Guest[]>([emptyGuest()]);
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [consents, setConsents] = useState({ age: false, noRefund: false, kvkk: false });
  const [website, setWebsite] = useState(''); // honeypot
  const [showErrors, setShowErrors] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payQr, setPayQr] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; total: number; currency: Currency; email: string } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sayfa yenilenirse (ör. Revolut'tan dönünce) form ve referans kaybolmasın.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (Array.isArray(saved.guests) && saved.guests.length) setGuests(saved.guests.slice(0, Math.max(1, remaining)));
      if (saved.currency === 'TRY' || saved.currency === 'EUR') setCurrency(saved.currency);
      if (saved.quote) {
        setQuote(saved.quote);
        setConsents({ age: true, noRefund: true, kvkk: true });
        setStep('pay');
      }
    } catch {
      /* yok say */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 'done') return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ guests, currency, quote } satisfies Saved));
    } catch {
      /* yok say */
    }
  }, [guests, currency, quote, step]);

  useEffect(() => {
    if (step !== 'pay') return;
    let alive = true;
    import('qrcode').then((QR) =>
      QR.toDataURL(revolutUrl, { margin: 1, width: 320, color: { dark: '#000000', light: '#ffffff' } }).then((url) => {
        if (alive) setPayQr(url);
      }),
    );
    return () => {
      alive = false;
    };
  }, [step, revolutUrl]);

  const goTo = (s: typeof step) => {
    setStep(s);
    setError(null);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const errs = useMemo(() => guests.map(guestErrors), [guests]);
  const guestsValid = errs.every((e) => !e.name && !e.email && !e.instagram);
  const consentsOk = consents.age && consents.noRefund && consents.kvkk;
  const quantity = guests.length;
  const total = quantity * prices[currency];

  const setQuantity = (n: number) => {
    const q = Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, remaining));
    setGuests((prev) => (q > prev.length ? [...prev, ...Array.from({ length: q - prev.length }, emptyGuest)] : prev.slice(0, q)));
  };
  const updateGuest = (i: number, patch: Partial<Guest>) =>
    setGuests((prev) => prev.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  const errorText = (code: string, data: Record<string, unknown> = {}) => {
    switch (code) {
      case 'rate_limit':
        return t.errors.rateLimit;
      case 'validation':
        return t.errors.validation;
      case 'capacity':
        return fmt(t.errors.capacity, { n: Number(data.remaining ?? 0) });
      case 'closed':
        return t.errors.closed;
      case 'receipt_type':
        return t.errors.receiptType;
      case 'receipt_size':
        return fmt(t.errors.receiptSize, { mb: receiptMaxMb });
      case 'token':
        return t.errors.token;
      case 'preview':
        return t.errors.preview;
      default:
        return t.errors.generic;
    }
  };

  const payload = () => ({
    guests: guests.map((g) => ({
      name: g.name.trim().replace(/\s+/g, ' '),
      email: g.email.trim(),
      instagram: g.instagram.trim().replace(/^@+/, ''),
    })),
    currency,
    locale,
    consents,
    website,
  });

  async function prepare(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!guestsValid) return setError(t.errors.validation);
    if (!consentsOk) return setError(t.errors.consents);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(errorText(data.error, data));
      setQuote(data as Quote);
      setNotice(null);
      goTo('pay');
    } catch {
      setError(t.errors.network);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!quote || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set('payload', JSON.stringify({ ...payload(), consents: { age: true, noRefund: true, kvkk: true }, reference: quote.reference, token: quote.token }));
      if (file) body.set('receipt', file);
      const res = await fetch('/api/orders', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'token') setQuote(null);
        return setError(errorText(data.error, data));
      }
      setDone(data);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* yok say */
      }
      goTo('done');
    } catch {
      setError(t.errors.network);
    } finally {
      setBusy(false);
    }
  }

  function pickFile(f: File | null) {
    setError(null);
    if (f && f.size > receiptMaxMb * 1024 * 1024) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      return setError(fmt(t.errors.receiptSize, { mb: receiptMaxMb }));
    }
    setFile(f);
  }

  async function copyRef() {
    if (!quote) return;
    try {
      await navigator.clipboard.writeText(quote.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi yoksa kullanıcı elle seçer */
    }
  }

  const steps = [t.flow.step1, t.flow.step2, t.flow.step3];
  const stepIndex = step === 'form' ? 0 : step === 'pay' ? 1 : 2;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-medium sm:gap-4">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2 sm:gap-4">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
                i <= stepIndex ? 'border-gold bg-gold text-black' : 'border-white/20 text-white/50'
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= stepIndex ? 'text-white' : 'text-white/50'}>{label}</span>
            {i < steps.length - 1 && <span className="h-px w-5 bg-white/20 sm:w-10" />}
          </li>
        ))}
      </ol>

      {step === 'form' && (
        <form onSubmit={prepare} noValidate className="space-y-6">
          <div className="card">
            <label htmlFor="qty" className="font-display text-xl font-bold">
              {t.flow.quantity}
            </label>
            <p className="mt-1 text-sm text-white/60">{fmt(t.flow.quantityHint, { n: remaining })}</p>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} className="h-12 w-12 rounded-full border border-white/20 text-2xl leading-none transition hover:border-gold disabled:opacity-30" aria-label="−">
                −
              </button>
              <input
                id="qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={remaining}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="field w-24 text-center font-display text-2xl font-bold"
              />
              <button type="button" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= remaining} className="h-12 w-12 rounded-full border border-white/20 text-2xl leading-none transition hover:border-gold disabled:opacity-30" aria-label="+">
                +
              </button>
            </div>
          </div>

          {guests.map((g, i) => {
            const e = showErrors ? errs[i] : { name: false, email: false, instagram: false };
            return (
              <fieldset key={i} className="card">
                <legend className="sr-only">{fmt(t.flow.guest, { n: i + 1 })}</legend>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-xl font-bold">{fmt(t.flow.guest, { n: i + 1 })}</h3>
                  {i === 0 && <span className="rounded-full bg-gold px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-black">{t.flow.owner}</span>}
                </div>
                {i === 0 && <p className="mt-1 text-sm text-white/60">{t.flow.ownerHint}</p>}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor={`name-${i}`}>
                      {t.flow.name} *
                    </label>
                    <input id={`name-${i}`} className={`field ${e.name ? 'field-error' : ''}`} value={g.name} onChange={(ev) => updateGuest(i, { name: ev.target.value })} autoComplete={i === 0 ? 'name' : 'off'} maxLength={80} required aria-invalid={e.name} />
                    {e.name && <p className="mt-1 text-xs text-crimson">{t.errors.name}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor={`email-${i}`}>
                      {t.flow.email} *
                    </label>
                    <input id={`email-${i}`} type="email" inputMode="email" className={`field ${e.email ? 'field-error' : ''}`} value={g.email} onChange={(ev) => updateGuest(i, { email: ev.target.value })} autoComplete={i === 0 ? 'email' : 'off'} autoCapitalize="none" maxLength={160} required aria-invalid={e.email} />
                    {e.email && <p className="mt-1 text-xs text-crimson">{t.errors.email}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor={`ig-${i}`}>
                      {t.flow.instagram} *
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
                      <input id={`ig-${i}`} className={`field pl-9 ${e.instagram ? 'field-error' : ''}`} value={g.instagram} onChange={(ev) => updateGuest(i, { instagram: ev.target.value.replace(/^@+/, '') })} placeholder={t.flow.instagramPh} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={31} required aria-invalid={e.instagram} />
                    </div>
                    {e.instagram && <p className="mt-1 text-xs text-crimson">{t.errors.instagram}</p>}
                  </div>
                </div>
              </fieldset>
            );
          })}

          {/* Honeypot: ekranda görünmez, botlar doldurur */}
          <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <div className="card">
            <p className="font-display text-xl font-bold">{t.flow.currency}</p>
            <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t.flow.currency}>
              {(['TRY', 'EUR'] as Currency[]).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => setCurrency(c)} className={`rounded-xl border px-4 py-4 text-left transition ${currency === c ? 'border-gold bg-gold/10' : 'border-white/15 hover:border-white/40'}`}>
                  <span className="block text-xs uppercase tracking-widest text-white/60">{c === 'TRY' ? 'TL' : 'EUR'}</span>
                  <span className="mt-1 block font-display text-2xl font-bold">{money(prices[c], c, locale)}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
              <div className="text-sm text-white/60">
                {fmt(t.flow.people, { n: quantity })} × {money(prices[currency], currency, locale)}
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-white/60">{t.flow.total}</div>
                <div className="gold-text font-display text-4xl font-bold" aria-live="polite">
                  {money(total, currency, locale)}
                </div>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            {(
              [
                ['age', t.flow.consentAge],
                ['noRefund', t.flow.consentRefund],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#C1121F]" checked={consents[key]} onChange={(e) => setConsents((c) => ({ ...c, [key]: e.target.checked }))} />
                <span>{label}</span>
              </label>
            ))}
            <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#C1121F]" checked={consents.kvkk} onChange={(e) => setConsents((c) => ({ ...c, kvkk: e.target.checked }))} />
              <span>
                <Link href="/kvkk" target="_blank" className="text-gold underline underline-offset-4">
                  {t.flow.kvkkLink}
                </Link>{' '}
                {t.flow.consentKvkk}
              </span>
            </label>
            {showErrors && !consentsOk && <p className="text-xs text-crimson">{t.errors.consents}</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-crimson/60 bg-crimson/10 px-4 py-3 text-sm text-white">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !consentsOk} className="btn-primary w-full py-4 text-base">
            {busy ? t.flow.sending : `${t.flow.continue} · ${money(total, currency, locale)}`}
          </button>
        </form>
      )}

      {step === 'pay' && quote && (
        <div className="space-y-6">
          {notice && <p className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm">{notice}</p>}
          <div className="card text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t.flow.amountDue}</p>
            <p className="gold-text mt-2 font-display text-6xl font-bold sm:text-7xl">{money(quote.total, quote.currency, locale)}</p>
            <p className="mt-2 text-sm text-white/60">
              {fmt(t.flow.people, { n: quote.quantity })} × {money(quote.unitPrice, quote.currency, locale)}
            </p>
          </div>

          <div className="card">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t.flow.reference}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="select-all rounded-xl border border-gold/50 bg-black px-5 py-3 font-mono text-2xl font-bold tracking-widest text-gold sm:text-3xl">{quote.reference}</code>
              <button type="button" onClick={copyRef} className="btn-gold px-5 py-3">
                {copied ? `✓ ${t.flow.copied}` : t.flow.copy}
              </button>
            </div>
            <p className="mt-4 rounded-xl border border-crimson/50 bg-crimson/10 px-4 py-3 text-sm font-semibold text-white">{t.flow.instruction}</p>
          </div>

          <div className="card">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-white/80">
              <li>{t.flow.steps1}</li>
              <li>{t.flow.steps2}</li>
              <li>{t.flow.steps3}</li>
            </ol>
            <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
              <a href={revolutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full px-8 py-4 text-base sm:w-auto">
                {t.flow.payWithRevolut} ↗
              </a>
              <div className="flex items-center gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {payQr && <img src={payQr} alt="Revolut QR" width={112} height={112} className="h-full w-full" />}
                </div>
                <p className="max-w-[10rem] text-xs text-white/60">{t.flow.scanToPay}</p>
              </div>
            </div>
            <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/50">{t.flow.priceNote}</p>
          </div>

          <div className="card">
            <label htmlFor="receipt" className="font-display text-lg font-bold">
              {t.flow.receipt}
            </label>
            <p className="mt-1 text-xs text-white/60">{fmt(t.flow.receiptHint, { mb: receiptMaxMb })}</p>
            <input ref={fileRef} id="receipt" type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} className="mt-4 block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-white/20" />
            {file && (
              <p className="mt-3 flex items-center gap-3 text-xs text-white/70">
                {fmt(t.flow.receiptSelected, { name: file.name })}
                <button type="button" className="text-gold underline" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                  {t.flow.removeFile}
                </button>
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-crimson/60 bg-crimson/10 px-4 py-3 text-sm text-white">
              {error}
            </p>
          )}
          <button type="button" onClick={submit} disabled={busy} className="btn-primary w-full py-4 text-base">
            {busy ? t.flow.sending : `✓ ${t.flow.iPaid}`}
          </button>
          <button type="button" onClick={() => { setQuote(null); goTo('form'); }} disabled={busy} className="mx-auto block text-sm text-white/60 underline underline-offset-4 hover:text-white">
            ← {t.flow.back}
          </button>
        </div>
      )}

      {step === 'pay' && !quote && (
        <div className="card text-center">
          <p className="text-sm text-white/80">{error ?? t.errors.token}</p>
          <button type="button" onClick={() => goTo('form')} className="btn-gold mt-5">
            {t.flow.back}
          </button>
        </div>
      )}

      {step === 'done' && done && (
        <div className="card text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold text-3xl text-gold">✓</div>
          <h2 className="mt-5 font-display text-3xl font-bold">{t.flow.doneTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-white/80">{t.flow.doneText}</p>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/60">{t.flow.doneRef}</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-gold">{done.reference}</p>
          <p className="mt-2 text-sm text-white/70">{money(done.total, done.currency, locale)}</p>
          <p className="mt-4 text-xs text-white/50">{fmt(t.flow.doneMail, { email: done.email })}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/order/${done.reference}`} className="btn-primary">
              {t.flow.doneTrack}
            </Link>
            <Link href="/" className="btn-ghost">
              {t.flow.doneHome}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
