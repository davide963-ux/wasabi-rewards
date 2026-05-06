'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import s from '@/styles/admin.module.scss';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'login failed');
      }
      router.push('/admin');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={s.loginShell}>
      <div className={s.loginCard}>
        <h1>Admin</h1>
        <p>Wasabi · HODL Rewards</p>

        {error && <div className={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className={s.label}>
            Password
            <input
              type="password"
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className={s.btn} disabled={!password || loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
