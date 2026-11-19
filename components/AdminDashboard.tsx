'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Guest = { name: string; email: string; instagram: string };
type Order = {
  id: string;
  reference: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  unitPrice: number;
  currency: 'TRY' | 'EUR';
  total: number;
  tier: string;
  status: 'PAYMENT_SUBMITTED' | 'PAID' | 'REJECTED';
  hasReceipt: boolean;
  guests: Guest[];
  submittedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectReason: string | null;
};
type Ticket = {
  id: string;
  orderId: string | null;
  name: string;
  email: string;
  instagram: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  checkedInAt: string | null;
  replacedBy: string | null;
};
type LogEntry = { id: number; admin: string; action: string; targetId: string | null; details: Record<string, unknown> | null; at: string };

export type AdminData = {
  user: string;
  now: number;
  approvalWindowHours: number;
  stats: {
    confirmedTickets: number;
    pendingOrders: number;
    pendingPeople: number;
    revenueTRY: number;
    revenueEUR: number;
    remaining: number;
    checkedIn: number;
    capacity: number;
  };
  orders: Order[];
  tickets: Ticket[];
  log: LogEntry[];
};

const ORDER_STATUS = { PAYMENT_SUBMITTED: 'Onay bekliyor', PAID: 'Onaylandı', REJECTED: 'Reddedildi' } as const;
const TICKET_STATUS = { VALID: 'Geçerli', USED: 'İçeride', CANCELLED: 'İptal' } as const;
const ACTIONS: Record<string, string> = {
  'admin.login': 'Admin girişi',
  'checkin.login': 'Kapı girişi',
  'order.approve': 'Sipariş onaylandı',
  'order.reject': 'Sipariş reddedildi',
  'ticket.rename': 'İsim değişikliği',
  'ticket.resend': 'Bilet tekrar gönderildi',
  'ticket.comp': 'Davetli bileti oluşturuldu',
  'ticket.checkin': 'Kapıdan giriş',
  'guests.export': 'Misafir listesi indirildi',
};

const money = (n: number, c: 'TRY' | 'EUR') => `${n.toLocaleString('tr-TR')} ${c === 'TRY' ? '₺' : '€'}`;
const dt = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }).format(new Date(iso));
const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function AdminDashboard({ data, initialQuery }: { data: AdminData; initialQuery: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'orders' | 'tickets' | 'log'>('orders');
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<'ALL' | Order['status'] | 'OVERDUE'>('ALL');
  const [ticketStatus, setTicketStatus] = useState<'ALL' | Ticket['status']>('ALL');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editing, setEditing] = useState<Ticket | 'new' | null>(null);
  const [form, setForm] = useState<Guest & { locale: 'tr' | 'en' }>({ name: '', email: '', instagram: '', locale: 'tr' });

  const overdueMs = data.approvalWindowHours * 3600 * 1000;
  const isOverdue = (o: Order) => o.status === 'PAYMENT_SUBMITTED' && data.now - new Date(o.submittedAt).getTime() > overdueMs;
  const ticketsByOrder = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of data.tickets) if (t.orderId) map.set(t.orderId, [...(map.get(t.orderId) ?? []), t]);
    return map;
  }, [data.tickets]);
  const refByOrder = useMemo(() => new Map(data.orders.map((o) => [o.id, o.reference])), [data.orders]);

  const orders = useMemo(() => {
    const needle = norm(q.trim());
    return data.orders.filter((o) => {
      if (status === 'OVERDUE' ? !isOverdue(o) : status !== 'ALL' && o.status !== status) return false;
      if (!needle) return true;
      const hay = norm([o.reference, o.buyerName, o.buyerEmail, ...o.guests.flatMap((g) => [g.name, g.email, g.instagram])].join(' '));
      return hay.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.orders, q, status]);

  const tickets = useMemo(() => {
    const needle = norm(q.trim());
    return data.tickets.filter((t) => {
      if (ticketStatus !== 'ALL' && t.status !== ticketStatus) return false;
      if (!needle) return true;
      return norm([t.name, t.email, t.instagram, t.id, t.orderId ? (refByOrder.get(t.orderId) ?? '') : 'davetli'].join(' ')).includes(needle);
    });
  }, [data.tickets, q, ticketStatus, refByOrder]);

  async function call(key: string, url: string, body: unknown, okText: string): Promise<boolean> {
    setBusy(key);
    setFlash(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const text =
          res.status === 401
            ? 'Oturum süresi doldu, yeniden giriş yapın.'
            : d.error === 'conflict'
              ? 'Bu kayıt başka biri tarafından zaten işlenmiş. Sayfa yenilendi.'
              : d.error === 'capacity'
                ? 'Kapasite dolu.'
                : d.error === 'validation'
                  ? 'Bilgileri kontrol edin: ad soyad, geçerli e-posta ve Instagram kullanıcı adı gerekli.'
                  : 'İşlem başarısız oldu.';
        setFlash({ ok: false, text });
        router.refresh();
        return false;
      }
      setFlash(
        d.emailsFailed
          ? { ok: false, text: `${okText} Ancak ${d.emailsFailed} e-posta gönderilemedi — "Tekrar gönder" ile yeniden deneyin.` }
          : { ok: true, text: okText },
      );
      router.refresh();
      return true;
    } catch {
      setFlash({ ok: false, text: 'Bağlantı hatası.' });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const approve = (o: Order) => {
    if (!confirm(`${o.reference} onaylansın mı?\n${o.quantity} kişi · ${money(o.total, o.currency)}\n\n${o.quantity} bilet üretilip e-postayla gönderilecek.`)) return;
    void call(`approve:${o.id}`, `/api/admin/orders/${o.id}/approve`, null, `${o.reference} onaylandı, ${o.quantity} bilet gönderildi.`);
  };
  const submitReject = async () => {
    if (!rejecting) return;
    if (await call(`reject:${rejecting.id}`, `/api/admin/orders/${rejecting.id}/reject`, { reason: rejectReason }, `${rejecting.reference} reddedildi.`)) {
      setRejecting(null);
      setRejectReason('');
    }
  };
  const openEdit = (t: Ticket | 'new') => {
    setForm(t === 'new' ? { name: '', email: '', instagram: '', locale: 'tr' } : { name: t.name, email: t.email, instagram: t.instagram, locale: 'tr' });
    setEditing(t);
  };
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const ok =
      editing === 'new'
        ? await call('comp', '/api/admin/tickets', form, `Davetli bileti oluşturuldu ve ${form.email} adresine gönderildi.`)
        : await call(`rename:${editing.id}`, `/api/admin/tickets/${editing.id}/rename`, { name: form.name, email: form.email, instagram: form.instagram }, `Eski bilet iptal edildi, yeni bilet ${form.email} adresine gönderildi.`);
    if (ok) setEditing(null);
  };
  const resend = (t: Ticket) => void call(`resend:${t.id}`, `/api/admin/tickets/${t.id}/resend`, null, `Bilet ${t.email} adresine tekrar gönderildi.`);
  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.assign('/admin/login');
  };

  const s = data.stats;
  const overdueCount = data.orders.filter(isOverdue).length;
  const cards: [string, string, string?][] = [
    ['Onaylı bilet', String(s.confirmedTickets), `kapasite ${s.capacity}`],
    ['Onay bekleyen sipariş', String(s.pendingOrders), `${s.pendingPeople} kişi${overdueCount ? ` · ${overdueCount} gecikmiş` : ''}`],
    ['Gelir (TL)', money(s.revenueTRY, 'TRY')],
    ['Gelir (EUR)', money(s.revenueEUR, 'EUR')],
    ['Kalan kapasite', String(s.remaining)],
    ['İçeri giren', String(s.checkedIn), `/ ${s.confirmedTickets} bilet`],
  ];

  const ticketActions = (t: Ticket) =>
    t.status === 'CANCELLED' ? null : (
      <div className="flex flex-wrap gap-2">
        <a href={`/ticket/${t.id}`} target="_blank" className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:border-white/40">
          Bileti aç
        </a>
        <button onClick={() => resend(t)} disabled={busy !== null} className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:border-white/40 disabled:opacity-40">
          {busy === `resend:${t.id}` ? '…' : 'Tekrar gönder'}
        </button>
        {t.status === 'VALID' && (
          <button onClick={() => openEdit(t)} disabled={busy !== null} className="rounded-lg border border-gold/50 px-2.5 py-1 text-xs text-gold hover:bg-gold/10 disabled:opacity-40">
            İsim değiştir
          </button>
        )}
      </div>
    );

  const ticketBadge = (st: Ticket['status']) => (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st === 'VALID' ? 'border-emerald-400/60 text-emerald-300' : st === 'USED' ? 'border-sky-400/60 text-sky-300' : 'border-white/20 text-white/40'}`}>
      {TICKET_STATUS[st]}
    </span>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-logo text-xl font-bold tracking-[0.2em] text-gold">P-PACK 2027</p>
          <p className="text-xs text-white/50">Admin paneli · {data.user}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/checkin" className="rounded-full border border-white/15 px-4 py-2 hover:border-white/40">
            Kapı ekranı
          </a>
          <a href="/api/admin/export" className="rounded-full border border-gold/60 px-4 py-2 text-gold hover:bg-gold/10">
            ↓ Misafir listesi (CSV)
          </a>
          <button onClick={() => openEdit('new')} className="rounded-full bg-crimson px-4 py-2 font-semibold hover:bg-[#d81524]">
            + Davetli bileti
          </button>
          <button onClick={logout} className="rounded-full border border-white/15 px-4 py-2 text-white/70 hover:border-white/40">
            Çıkış
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value, sub]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wider text-white/50">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-white/50">{sub}</p>}
          </div>
        ))}
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
              ['orders', `Siparişler (${data.orders.length})`],
              ['tickets', `Biletler (${data.tickets.filter((t) => t.status !== 'CANCELLED').length})`],
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: referans, isim, e-posta, Instagram" className="field max-w-xs py-2 text-sm" aria-label="Ara" />
            {tab === 'orders' ? (
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field w-auto py-2 text-sm" aria-label="Durum filtresi">
                <option value="ALL">Tüm durumlar</option>
                <option value="PAYMENT_SUBMITTED">Onay bekliyor</option>
                <option value="OVERDUE">48 saati geçenler</option>
                <option value="PAID">Onaylandı</option>
                <option value="REJECTED">Reddedildi</option>
              </select>
            ) : (
              <select value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value as typeof ticketStatus)} className="field w-auto py-2 text-sm" aria-label="Durum filtresi">
                <option value="ALL">Tüm durumlar</option>
                <option value="VALID">Geçerli</option>
                <option value="USED">İçeride</option>
                <option value="CANCELLED">İptal</option>
              </select>
            )}
          </>
        )}
      </div>

      {tab === 'orders' && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                {['Referans', 'Sipariş sahibi', 'Kişi', 'Tutar', 'Dekont', 'Durum', 'Bildirim saati', 'Onaylayan', ''].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-white/50">
                    Sipariş bulunamadı.
                  </td>
                </tr>
              )}
              {orders.map((o) => {
                const overdue = isOverdue(o);
                const expanded = open === o.id;
                return [
                  <tr key={o.id} className={`border-t border-white/10 align-top ${overdue ? 'bg-crimson/20' : ''}`}>
                    <td className="px-3 py-3">
                      <button onClick={() => setOpen(expanded ? null : o.id)} className="whitespace-nowrap font-mono font-bold text-gold hover:underline" aria-expanded={expanded}>
                        {expanded ? '▾' : '▸'} {o.reference}
                      </button>
                      {overdue && <span className="mt-1 block w-fit rounded bg-crimson px-1.5 py-0.5 text-[10px] font-bold uppercase">48 saati geçti</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium">{o.buyerName}</span>
                      <span className="block text-xs text-white/50">{o.buyerEmail}</span>
                    </td>
                    <td className="px-3 py-3">{o.quantity}</td>
                    <td className="px-3 py-3 font-semibold">
                      {money(o.total, o.currency)}
                      <span className="block text-xs font-normal text-white/50">
                        {o.currency} · {o.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {o.hasReceipt ? (
                        <a href={`/api/admin/receipt/${o.id}`} target="_blank" className="text-gold underline underline-offset-4">
                          Görüntüle
                        </a>
                      ) : (
                        <span className="text-white/30">Yok</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${o.status === 'PAID' ? 'border-emerald-400/60 text-emerald-300' : o.status === 'REJECTED' ? 'border-white/20 text-white/50' : overdue ? 'border-crimson bg-crimson text-white' : 'border-gold/70 text-gold'}`}>
                        {ORDER_STATUS[o.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-white/80">{dt(o.submittedAt)}</td>
                    <td className="px-3 py-3 text-white/80">
                      {o.approvedBy ?? '—'}
                      {o.approvedAt && <span className="block text-xs text-white/50">{dt(o.approvedAt)}</span>}
                    </td>
                    <td className="px-3 py-3">
                      {o.status === 'PAYMENT_SUBMITTED' && (
                        <div className="flex gap-2">
                          <button onClick={() => approve(o)} disabled={busy !== null} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-40">
                            {busy === `approve:${o.id}` ? '…' : 'Onayla'}
                          </button>
                          <button onClick={() => { setRejecting(o); setRejectReason(''); }} disabled={busy !== null} className="rounded-lg border border-crimson px-3 py-1.5 text-xs font-semibold text-crimson hover:bg-crimson/10 disabled:opacity-40">
                            Reddet
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>,
                  expanded && (
                    <tr key={`${o.id}-d`} className="border-t border-white/5 bg-black/40">
                      <td colSpan={9} className="px-4 py-4">
                        {o.status === 'REJECTED' && <p className="mb-3 text-sm text-white/70">Ret açıklaması: {o.rejectReason || '—'}</p>}
                        {o.status === 'PAID' ? (
                          <ul className="space-y-2">
                            {(ticketsByOrder.get(o.id) ?? []).map((t) => (
                              <li key={t.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 ${t.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                                <span>
                                  <span className="font-medium">{t.name}</span> <span className="text-gold">@{t.instagram}</span>
                                  <span className="block text-xs text-white/50">{t.email}</span>
                                </span>
                                <span className="flex flex-wrap items-center gap-3">
                                  {ticketBadge(t.status)}
                                  {ticketActions(t)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {o.guests.map((g, i) => (
                              <li key={i}>
                                <span className="font-medium">{g.name}</span> <span className="text-gold">@{g.instagram}</span> <span className="text-white/50">· {g.email}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                {['Misafir', 'E-posta', 'Sipariş', 'Durum', 'Giriş', ''].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-white/50">
                    Bilet bulunamadı.
                  </td>
                </tr>
              )}
              {tickets.map((t) => (
                <tr key={t.id} className={`border-t border-white/10 ${t.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-3">
                    <span className="font-medium">{t.name}</span> <span className="text-gold">@{t.instagram}</span>
                  </td>
                  <td className="px-3 py-3 text-white/70">{t.email}</td>
                  <td className="px-3 py-3 font-mono text-xs">{t.orderId ? refByOrder.get(t.orderId) : 'Davetli'}</td>
                  <td className="px-3 py-3">{ticketBadge(t.status)}</td>
                  <td className="px-3 py-3 text-white/70">{t.checkedInAt ? dt(t.checkedInAt) : '—'}</td>
                  <td className="px-3 py-3">{ticketActions(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'log' && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/50">
              <tr>
                {['Zaman', 'Kim', 'Ne yaptı', 'Hedef'].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.log.map((l) => {
                const d = l.details ?? {};
                const extra = typeof d.reference === 'string' ? d.reference : typeof d.name === 'string' ? d.name : typeof (d.to as Guest | undefined)?.name === 'string' ? `→ ${(d.to as Guest).name}` : typeof (d.guest as Guest | undefined)?.name === 'string' ? (d.guest as Guest).name : '';
                return (
                  <tr key={l.id} className="border-t border-white/10">
                    <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{dt(l.at)}</td>
                    <td className="px-3 py-2.5 font-medium">{l.admin}</td>
                    <td className="px-3 py-2.5">{ACTIONS[l.action] ?? l.action}</td>
                    <td className="px-3 py-2.5 text-xs text-white/60">
                      {extra} {l.targetId && <span className="font-mono text-white/30">{l.targetId.slice(0, 8)}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rejecting && (
        <Modal title={`${rejecting.reference} reddedilsin mi?`} onClose={() => setRejecting(null)}>
          <p className="text-sm text-white/70">
            {rejecting.buyerName} · {rejecting.quantity} kişi · {money(rejecting.total, rejecting.currency)}. Sipariş sahibine e-posta gider ve kontenjan serbest kalır.
          </p>
          <label className="label mt-4" htmlFor="reason">
            Açıklama (kullanıcıya gösterilir, isteğe bağlı)
          </label>
          <textarea id="reason" className="field min-h-24" maxLength={500} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ör. Ödeme hesabımıza ulaşmadı." />
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setRejecting(null)} className="btn-ghost px-5 py-2.5">
              Vazgeç
            </button>
            <button onClick={submitReject} disabled={busy !== null} className="btn-primary px-5 py-2.5">
              {busy ? '…' : 'Reddet'}
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Davetli bileti oluştur' : 'İsim değişikliği'} onClose={() => setEditing(null)}>
          <p className="text-sm text-white/70">
            {editing === 'new'
              ? 'Siparişsiz bir bilet oluşturulur ve misafirin e-postasına gönderilir. Kapasiteden düşer.'
              : 'Eski bilet iptal edilir; yeni QR kodlu yeni bilet aşağıdaki e-postaya gönderilir.'}
          </p>
          <form onSubmit={submitEdit} className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="e-name">
                Ad Soyad
              </label>
              <input id="e-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="e-email">
                E-posta
              </label>
              <input id="e-email" type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={160} />
            </div>
            <div>
              <label className="label" htmlFor="e-ig">
                Instagram (@ olmadan)
              </label>
              <input id="e-ig" className="field" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value.replace(/^@+/, '') })} required maxLength={30} autoCapitalize="none" />
            </div>
            {editing === 'new' && (
              <div>
                <label className="label" htmlFor="e-locale">
                  Bilet e-postasının dili
                </label>
                <select id="e-locale" className="field" value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value as 'tr' | 'en' })}>
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost px-5 py-2.5">
                Vazgeç
              </button>
              <button disabled={busy !== null} className="btn-primary px-5 py-2.5">
                {busy ? '…' : editing === 'new' ? 'Oluştur ve gönder' : 'Değiştir ve yeni bileti gönder'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-coal p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
