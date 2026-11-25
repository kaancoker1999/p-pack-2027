'use client';

import Link from 'next/link';
import { useState } from 'react';
import { fmt, type Dict, type Locale } from '@/i18n';

type Props = { t: Dict; locale: Locale; inviters: readonly string[] };
type Done = { duplicate: boolean; firstName: string; inviter: string };

const NAME_RE = /^[\p{L}\p{M}'’.\- ]{2,50}$/u;
/** Sunucudaki normalizePhone ile aynı kabul kuralı (hızlı geri bildirim için). */
function phoneOk(raw: string): boolean {
  let s = raw.trim().replace(/[\s().\-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!/^\+?\d+$/.test(s)) return false;
  if (!s.startsWith('+')) return /^0?5\d{9}$/.test(s) || /^905\d{9}$/.test(s);
  const d = s.slice(1);
  if (d.startsWith('90')) return /^905\d{9}$/.test(d);
  return d.length >= 8 && d.length <= 15 && !d.startsWith('0');
}

export default function RegisterForm({ t, locale, inviters }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [consents, setConsents] = useState({ age: false, kvkk: false });
  const [website, setWebsite] = useState(''); // honeypot
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const errs = {
    firstName: !NAME_RE.test(firstName.trim()),
    lastName: !NAME_RE.test(lastName.trim()),
    phone: !phoneOk(phone),
    invitedBy: !inviters.includes(invitedBy),
  };
  const valid = !errs.firstName && !errs.lastName && !errs.phone && !errs.invitedBy;
  const consentsOk = consents.age && consents.kvkk;
  const e = showErrors ? errs : { firstName: false, lastName: false, phone: false, invitedBy: false };

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setShowErrors(true);
    if (!valid) return setError(t.errors.validation);
    if (!consentsOk) return setError(t.errors.consents);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, invitedBy, locale, consents, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          rate_limit: t.errors.rateLimit,
          validation: t.errors.validation,
          preview: t.errors.preview,
        };
        return setError(map[data.error] ?? t.errors.generic);
      }
      setDone({ duplicate: !!data.duplicate, firstName: firstName.trim(), inviter: invitedBy });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t.errors.network);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFirstName('');
    setLastName('');
    setPhone('');
    setConsents({ age: false, kvkk: false });
    setShowErrors(false);
    setError(null);
    setDone(null);
  }

  if (done) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold text-3xl text-gold">✓</div>
        <h2 className="mt-5 font-display text-3xl font-bold">{done.duplicate ? t.form.dupTitle : t.form.doneTitle}</h2>
        {done.duplicate ? (
          <p className="mx-auto mt-3 max-w-md text-white/80">{t.form.dupText}</p>
        ) : (
          <>
            <p className="mt-3 text-lg text-gold">{fmt(t.form.doneHello, { name: done.firstName })}</p>
            <p className="mx-auto mt-2 max-w-md text-white/80">{fmt(t.form.doneText, { inviter: done.inviter })}</p>
          </>
        )}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            {t.form.home}
          </Link>
          <button type="button" onClick={reset} className="btn-ghost">
            {t.form.another}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="first-name">
              {t.form.firstName} *
            </label>
            <input id="first-name" className={`field ${e.firstName ? 'field-error' : ''}`} value={firstName} onChange={(ev) => setFirstName(ev.target.value)} autoComplete="given-name" maxLength={50} required aria-invalid={e.firstName} />
            {e.firstName && <p className="mt-1 text-xs text-crimson">{t.errors.firstName}</p>}
          </div>
          <div>
            <label className="label" htmlFor="last-name">
              {t.form.lastName} *
            </label>
            <input id="last-name" className={`field ${e.lastName ? 'field-error' : ''}`} value={lastName} onChange={(ev) => setLastName(ev.target.value)} autoComplete="family-name" maxLength={50} required aria-invalid={e.lastName} />
            {e.lastName && <p className="mt-1 text-xs text-crimson">{t.errors.lastName}</p>}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="phone">
            {t.form.phone} *
          </label>
          <input id="phone" type="tel" inputMode="tel" className={`field ${e.phone ? 'field-error' : ''}`} value={phone} onChange={(ev) => setPhone(ev.target.value)} placeholder={t.form.phonePh} autoComplete="tel" maxLength={30} required aria-invalid={e.phone} />
          {e.phone ? <p className="mt-1 text-xs text-crimson">{t.errors.phone}</p> : <p className="mt-1 text-xs text-white/50">{t.form.phoneHint}</p>}
        </div>
        <div>
          <label className="label" htmlFor="invited-by">
            {t.form.invitedBy} *
          </label>
          <select id="invited-by" className={`field ${e.invitedBy ? 'field-error' : ''}`} value={invitedBy} onChange={(ev) => setInvitedBy(ev.target.value)} required aria-invalid={e.invitedBy}>
            <option value="" disabled>
              {t.form.invitedByPh}
            </option>
            {inviters.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {e.invitedBy ? <p className="mt-1 text-xs text-crimson">{t.errors.invitedBy}</p> : <p className="mt-1 text-xs text-white/50">{t.form.invitedByHint}</p>}
        </div>
      </div>

      {/* Honeypot: ekranda görünmez, botlar doldurur */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(ev) => setWebsite(ev.target.value)} />
        </label>
      </div>

      <div className="card space-y-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#C1121F]" checked={consents.age} onChange={(ev) => setConsents((c) => ({ ...c, age: ev.target.checked }))} />
          <span>{t.form.consentAge}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-white/85">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#C1121F]" checked={consents.kvkk} onChange={(ev) => setConsents((c) => ({ ...c, kvkk: ev.target.checked }))} />
          <span>
            <Link href="/kvkk" target="_blank" className="text-gold underline underline-offset-4">
              {t.form.kvkkLink}
            </Link>{' '}
            {t.form.consentKvkk}
          </span>
        </label>
        {showErrors && !consentsOk && <p className="text-xs text-crimson">{t.errors.consents}</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-crimson/60 bg-crimson/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full py-4 text-base">
        {busy ? t.form.sending : t.form.submit}
      </button>
    </form>
  );
}
