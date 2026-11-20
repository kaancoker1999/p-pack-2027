'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Counts = { checkedIn: number; totalTickets: number };
type Result =
  | { result: 'VALID'; name: string; invitedBy: string | null; time: string }
  | { result: 'ALREADY_USED'; name: string; invitedBy: string | null; time: string | null }
  | { result: 'INVALID'; reason: string }
  | { result: 'ERROR'; message: string };

const READER_ID = 'ppack-qr-reader';
/** Aynı kod bu süre içinde tekrar okunursa yok sayılır (kamera aynı QR'ı saniyede birçok kez görür). */
const SAME_CODE_MS = 6000;

export default function CheckinScanner({ initial, isAdmin }: { initial: Counts; isAdmin: boolean }) {
  const [counts, setCounts] = useState(initial);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState('');
  const [camera, setCamera] = useState<'starting' | 'on' | 'error'>('starting');
  const [cameraError, setCameraError] = useState('');
  const lock = useRef(false);
  const last = useRef({ code: '', at: 0 });
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setResult(null);
    lock.current = false;
  }, []);

  const show = useCallback(
    (r: Result) => {
      setResult(r);
      try {
        navigator.vibrate?.(r.result === 'VALID' ? 80 : [120, 80, 120]);
      } catch {
        /* yok say */
      }
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      // Yeşil sonuç kendiliğinden kapanır; kırmızı sonuçta personelin dokunması beklenir.
      if (r.result === 'VALID') dismissTimer.current = setTimeout(dismiss, 3500);
    },
    [dismiss],
  );

  const scan = useCallback(
    async (raw: string, fromCamera: boolean) => {
      const code = raw.trim();
      if (!code || lock.current) return;
      const now = Date.now();
      if (fromCamera && code === last.current.code && now - last.current.at < SAME_CODE_MS) return;
      lock.current = true;
      last.current = { code, at: now };
      try {
        const res = await fetch('/api/checkin/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (res.status === 401) {
          window.location.assign('/checkin/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (typeof data.checkedIn === 'number') setCounts({ checkedIn: data.checkedIn, totalTickets: data.totalTickets });
        last.current.at = Date.now();
        show(data as Result);
      } catch {
        show({ result: 'ERROR', message: 'Bağlantı hatası — tekrar okutun.' });
        last.current = { code: '', at: 0 };
      }
    },
    [show],
  );

  // Kamera: QR + Code128
  useEffect(() => {
    let stopped = false;
    let scanner: { stop: () => Promise<void>; clear: () => void; isScanning: boolean } | null = null;
    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (stopped) return;
        const instance = new Html5Qrcode(READER_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128],
          verbose: false,
        });
        scanner = instance;
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w: number, h: number) => ({ width: Math.floor(Math.min(w, h) * 0.8), height: Math.floor(Math.min(w, h) * 0.8) }) },
          (text: string) => void scan(text, true),
          () => {},
        );
        if (stopped) {
          await instance.stop().catch(() => {});
          return;
        }
        setCamera('on');
      } catch (e) {
        if (stopped) return;
        setCamera('error');
        setCameraError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, [scan]);

  // Sayaç başka kapıdaki cihazlarla eşit kalsın
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/checkin/stats');
        if (res.ok) setCounts(await res.json());
      } catch {
        /* yok say */
      }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual;
    setManual('');
    void scan(code, false);
  };

  const overlay = result && {
    VALID: { bg: 'bg-emerald-600', title: 'GEÇERLİ', icon: '✓' },
    ALREADY_USED: { bg: 'bg-red-700', title: 'ZATEN KULLANILDI', icon: '✕' },
    INVALID: { bg: 'bg-red-700', title: 'GEÇERSİZ / İPTAL EDİLMİŞ', icon: '✕' },
    ERROR: { bg: 'bg-neutral-800', title: 'HATA', icon: '!' },
  }[result.result];

  const invalidDetail: Record<string, string> = {
    cancelled: 'Bu bilet iptal edilmiş (isim değişikliği olabilir — yeni bileti isteyin).',
    not_found: 'Böyle bir bilet yok.',
    bad_code: 'Kod tanınmadı ya da imzası geçersiz.',
    ambiguous: 'Kod birden fazla bilete uyuyor — daha fazla karakter girin.',
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-4 pb-8 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-logo text-lg font-bold tracking-[0.2em] text-gold">Istanbul 2027</p>
          <p className="text-xs text-white/50">Kapı · bilet okutma</p>
        </div>
        <div className="rounded-2xl border border-gold/50 px-4 py-2 text-right" aria-live="polite">
          <p className="text-[10px] uppercase tracking-wider text-white/50">İçeride / Bilet</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {counts.checkedIn} <span className="text-white/40">/ {counts.totalTickets}</span>
          </p>
        </div>
      </header>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/15 bg-black">
        <div id={READER_ID} className="min-h-[300px] w-full [&_video]:!w-full [&_video]:object-cover" />
        {camera !== 'on' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/70">
            {camera === 'starting' ? (
              'Kamera açılıyor…'
            ) : (
              <>
                <strong className="text-white">Kamera açılamadı</strong>
                <span>Tarayıcıya kamera izni verin ya da kodu aşağıdan elle girin.</span>
                <span className="text-xs text-white/40">{cameraError}</span>
                <button onClick={() => window.location.reload()} className="mt-2 rounded-full border border-white/30 px-4 py-1.5 text-xs">
                  Tekrar dene
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-white/50">QR kodu ya da barkodu çerçevenin içine getirin.</p>

      <form onSubmit={submitManual} className="mt-5">
        <label htmlFor="manual" className="label">
          Kodu elle gir
        </label>
        <div className="flex gap-2">
          <input id="manual" className="field font-mono uppercase placeholder:font-sans placeholder:normal-case" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Bilet no" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          <button className="btn-primary shrink-0 px-6" disabled={!manual.trim()}>
            Kontrol et
          </button>
        </div>
        <p className="mt-2 text-xs text-white/40">Biletteki barkodun altında yazan bilet numarasının ilk 8 karakteri yeterli.</p>
      </form>

      <div className="mt-auto flex justify-between pt-8 text-xs text-white/40">
        {isAdmin ? <a href="/admin">← Admin paneli</a> : <span />}
        <button
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.assign('/checkin/login');
          }}
        >
          Çıkış
        </button>
      </div>

      {result && overlay && (
        <button type="button" onClick={dismiss} className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center text-white ${overlay.bg}`} aria-live="assertive">
          <span className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white text-7xl font-bold leading-none">{overlay.icon}</span>
          <span className="text-4xl font-extrabold tracking-wide sm:text-5xl">{overlay.title}</span>
          {result.result === 'VALID' && (
            <span className="text-2xl font-semibold">
              {result.name}
              {result.invitedBy && <span className="block text-xl font-normal opacity-90">Davet eden: {result.invitedBy}</span>}
            </span>
          )}
          {result.result === 'ALREADY_USED' && (
            <>
              <span className="text-5xl font-bold tabular-nums">{result.time ?? '—'}</span>
              <span className="text-lg opacity-90">
                {result.name}
                {result.invitedBy ? ` · Davet eden: ${result.invitedBy}` : ''}
              </span>
            </>
          )}
          {result.result === 'INVALID' && <span className="max-w-xs text-lg opacity-90">{invalidDetail[result.reason] ?? ''}</span>}
          {result.result === 'ERROR' && <span className="text-lg opacity-90">{result.message}</span>}
          <span className="mt-6 rounded-full border border-white/60 px-6 py-2 text-sm">Devam etmek için dokun</span>
        </button>
      )}
    </main>
  );
}
