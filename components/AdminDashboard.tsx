'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Payment = 'unpaid' | 'cash' | 'iban';
type Registration = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  invitedBy: string;
  payment: Payment;
  createdAt: string;
};
type LogEntry = { id: number; admin: string; action: string; details: Record<string, unknown> | null; at: string };

export type AdminData = {
  user: string;
  capacity: number;
  inviters: string[];
  registrations: Registration[];
  log: LogEntry[];
};

const PAYMENT: Record<Payment, string> = { unpaid: 'Ödenmedi', cash: 'Nakit', iban: 'IBAN' };
const PAYMENT_STYLE: Record<Payment, string> = {
  unpaid: 'border-crimson/70 text-[#ff8a93]',
  cash: 'border-emerald-400/70 text-emerald-300',
  iban: 'border-sky-400/70 text-sky-300',
};
const ACTIONS: Record<string, string> = {
  'admin.login': 'Admin girişi',
  'registration.delete': 'Kayıt silindi',
  'registration.payment': 'Ödeme durumu değişti',
  'registrations.export': 'Parti listesi indirildi',
};

const dt = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }).format(new Date(iso));
const norm = (s: string) => s.toLocaleLowerCase('tr-TR');
const prettyPhone = (p: string) => {
  const m = p.match(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+90 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
};
const byName = (a: Registration, b: Registration) =>
  a.firstName.localeCompare(b.firstName, 'tr') || a.lastName.localeCompare(b.lastName, 'tr');

export default function AdminDashboard({ data, initialQuery }: { data: AdminData; initialQuery: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'party' | 'log'>('list');
  const [q, setQ] = useState(initialQuery);
  const [inviter, setInviter] = useState('ALL');
  const [payFilter, setPayFilter] = useState<'ALL' | 'PAID' | Payment>('ALL');
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  // Sunucudan yanıt gelene kadar seçimi hemen göstermek için
  const [pending, setPending] = useState<Record<string, Payment>>({});

  const regs = useMemo(() => data.registrations.map((r) => (pending[r.id] ? { ...r, payment: pending[r.id] } : r)), [data.registrations, pending]);

  const perInviter = useMemo(() => {
    const map = new Map<string, number>(data.inviters.map((n) => [n, 0]));
    for (const r of regs) map.set(r.invitedBy, (map.get(r.invitedBy) ?? 0) + 1);
    return [...map.entries()];
  }, [regs, data.inviters]);

  const counts = useMemo(() => {
    const c = { unpaid: 0, cash: 0, iban: 0 };
    for (const r of regs) c[r.payment]++;
    return c;
  }, [regs]);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    const digits = q.replace(/\D/g, '').replace(/^0/, '');
    return regs.filter((r) => {
      if (inviter !== 'ALL' && r.invitedBy !== inviter) return false;
      if (payFilter === 'PAID' ? r.payment === 'unpaid' : payFilter !== 'ALL' && r.payment !== payFilter) return false;
      if (!needle) return true;
      if (norm(`${r.firstName} ${r.lastName} ${r.invitedBy}`).includes(needle)) return true;
      return digits.length >= 3 && r.phone.replace(/\D/g, '').includes(digits);
    });
  }, [regs, q, inviter, payFilter]);

  // Kayıtlar: en yeni üstte · Parti listesi: isme göre A→Z
  const rows = useMemo(() => (tab === 'party' ? [...filtered].sort(byName) : filtered), [filtered, tab]);

  async function changePayment(r: Registration, payment: Payment) {
    setPending((p) => ({ ...p, [r.id]: payment }));
    setFlash(null);
    try {
      const res = await fetch(`/api/admin/registrations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment }),
      });
      if (!res.ok) {
        setFlash({ ok: false, text: res.status === 401 ? 'Oturum süresi doldu, yeniden giriş yapın.' : `${r.firstName} ${r.lastName}: ödeme durumu kaydedilemedi.` });
        setPending((p) => {
          const { [r.id]: _drop, ...rest } = p;
          return rest;
        });
      }
      router.refresh();
    } catch {
      setFlash({ ok: false, text: 'Bağlantı hatası: ödeme durumu kaydedilemedi.' });
      setPending((p) => {
        const { [r.id]: _drop, ...rest } = p;
        return rest;
      });
    }
  }

  async function remove(r: Registration) {
    if (!confirm(`${r.firstName} ${r.lastName} kaydı silinsin mi?\nBu işlem geri alınamaz.`)) return;
    setBusy(r.id);
    setFlash(null);
    try {
      const res = await fetch(`/api/admin/registrations/${r.id}`, { method: 'DELETE' });
      if (res.ok) setFlash({ ok: true, text: `${r.firstName} ${r.lastName} kaydı silindi.` });
      else setFlash({ ok: false, text: res.status === 401 ? 'Oturum süresi doldu, yeniden giriş yapın.' : 'Kayıt silinemedi.' });
      router.refresh();
    } catch {
      setFlash({ ok: false, text: 'Bağlantı hatası.' });
    } finally {
      setBusy(null);
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  };

  const total = regs.length;
  const paid = counts.cash + counts.iban;
  const party = tab === 'party';

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-logo text-xl font-bold tracking-[0.2em] text-gold">Istanbul 2027</p>
          <p className="text-xs text-white/50">Admin paneli · {data.user}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/api/admin/export" className="rounded-full border border-gold/60 px-4 py-2 text-gold hover:bg-gold/10">
            ↓ Parti listesi (CSV)
          </a>
          <button onClick={logout} className="rounded-full border border-white/15 px-4 py-2 text-white/70 hover:border-white/40">
            Çıkış
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-gold/40 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Toplam kayıt</p>
          <p className="mt-1 font-display text-3xl font-bold">{total}</p>
          <p className="text-xs text-white/50">hedef {data.capacity}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Ödeyen</p>
          <p className="mt-1 font-display text-3xl font-bold">{paid}</p>
          <p className="text-xs text-white/50">
            {counts.cash} nakit · {counts.iban} IBAN
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Ödenmedi</p>
          <p className="mt-1 font-display text-3xl font-bold">{counts.unpaid}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Referans kişisine göre</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {perInviter.map(([name, count]) => (
              <button
                key={name}
                onClick={() => {
                  setInviter(inviter === name ? 'ALL' : name);
                  if (tab === 'log') setTab('list');
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${inviter === name ? 'border-gold bg-gold text-black' : 'border-white/15 hover:border-white/40'}`}
              >
                {name} <strong>{count}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      {flash && (
        <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${flash.ok ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-crimson/60 bg-crimson/10'}`}>
          {flash.text}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-white/15 p-0.5 text-sm">
          {(
            [
              ['list', `Kayıtlar (${total})`],
              ['party', 'Parti listesi'],
              ['log', 'İşlem kaydı'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 ${tab === k ? 'bg-gold font-semibold text-black' : 'text-white/70 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab !== 'log' && (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: isim, telefon, referans" className="field max-w-xs py-2 text-sm" aria-label="Ara" />
            <select value={inviter} onChange={(e) => setInviter(e.target.value)} className="field w-auto py-2 text-sm" aria-label="Referans filtresi">
              <option value="ALL">Tüm referanslar</option>
              {data.inviters.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select value={payFilter} onChange={(e) => setPayFilter(e.target.value as typeof payFilter)} className="field w-auto py-2 text-sm" aria-label="Ödeme filtresi">
              <option value="ALL">Tüm ödeme durumları</option>
              <option value="PAID">Ödeyenler (nakit + IBAN)</option>
              <option value="unpaid">Ödenmedi</option>
              <option value="cash">Nakit</option>
              <option value="iban">IBAN</option>
            </select>
          </>
        )}
      </div>
      {tab !== 'log' && (
        <p className="mt-3 text-xs text-white/50">
          {party ? 'Tüm parti listesi, isme göre A→Z sıralı.' : 'Kayıtlar, en yeni üstte.'} {rows.length} kişi gösteriliyor.
        </p>
      )}

      {tab !== 'log' && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                {[...(party ? ['#'] : []), 'İsim', 'Soyad', 'Telefon', 'Referans kişisi', 'Ödeme durumu', ...(party ? [] : ['Kayıt zamanı']), ''].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-white/50">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-white/10">
                  {party && <td className="px-3 py-3 tabular-nums text-white/40">{i + 1}</td>}
                  <td className="px-3 py-3 font-medium">{r.firstName}</td>
                  <td className="px-3 py-3 font-medium">{r.lastName}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <a href={`tel:${r.phone}`} className="hover:text-gold">
                      {prettyPhone(r.phone)}
                    </a>
                  </td>
                  <td className="px-3 py-3 text-gold">{r.invitedBy}</td>
                  <td className="px-3 py-3">
                    <select
                      value={r.payment}
                      onChange={(e) => changePayment(r, e.target.value as Payment)}
                      aria-label={`${r.firstName} ${r.lastName} ödeme durumu`}
                      className={`rounded-full border bg-black/60 px-3 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-gold ${PAYMENT_STYLE[r.payment]}`}
                    >
                      {(Object.keys(PAYMENT) as Payment[]).map((p) => (
                        <option key={p} value={p} className="bg-black text-white">
                          {PAYMENT[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  {!party && <td className="whitespace-nowrap px-3 py-3 text-white/70">{dt(r.createdAt)}</td>}
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => remove(r)} disabled={busy !== null} className="rounded-lg border border-crimson/60 px-2.5 py-1 text-xs text-crimson hover:bg-crimson/10 disabled:opacity-40">
                      {busy === r.id ? '…' : 'Sil'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'log' && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                {['Zaman', 'Kim', 'Ne yaptı', 'Ayrıntı'].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.log.map((l) => {
                const d = l.details ?? {};
                const name = typeof d.name === 'string' ? d.name : '';
                const change = typeof d.to === 'string' ? ` · ${PAYMENT[d.from as Payment] ?? d.from} → ${PAYMENT[d.to as Payment] ?? d.to}` : '';
                const extra = name ? `${name}${change}` : typeof d.rows === 'number' ? `${d.rows} kişi` : '';
                return (
                  <tr key={l.id} className="border-t border-white/10">
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{dt(l.at)}</td>
                    <td className="px-3 py-2.5 font-medium">{l.admin}</td>
                    <td className="px-3 py-2.5">{ACTIONS[l.action] ?? l.action}</td>
                    <td className="px-3 py-2.5 text-xs text-white/60">{extra}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
