'use client';

import { useState } from 'react';

/** Admin ve kapı girişi için ortak form */
export default function LoginForm({ endpoint, next, withUsername }: { endpoint: string; next: string; withUsername: boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withUsername ? { username, password } : { password }),
      });
      if (res.ok) {
        window.location.assign(next);
        return;
      }
      setError(res.status === 429 ? 'Çok fazla deneme. Biraz sonra tekrar deneyin.' : withUsername ? 'Kullanıcı adı ya da şifre hatalı.' : 'Şifre hatalı.');
    } catch {
      setError('Bağlantı hatası.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      {withUsername && (
        <div>
          <label className="label" htmlFor="username">
            Kullanıcı adı
          </label>
          <input id="username" className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="password">
          Şifre
        </label>
        <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && (
        <p role="alert" className="text-sm text-crimson">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
