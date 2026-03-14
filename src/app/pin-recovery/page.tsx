'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function PinRecoveryPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [pin, setPin] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then((sessionResult: { data: { session: { user?: { email?: string } } | null } }) => {
      const { data } = sessionResult;
      const userEmail = data.session?.user?.email ?? '';
      setEmail(userEmail);
      setReady(Boolean(data.session));
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setMessage('PIN must be exactly 6 digits.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Verification session missing. Re-open link from your email.');

      const response = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.error) throw new Error(result.error ?? 'PIN reset failed.');

      setMessage('PIN reset successful. Redirecting to account...');
      setTimeout(() => router.push('/account'), 1000);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'PIN reset failed.';
      setMessage(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-14">
        <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-black/60 p-8 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-400/80">Account Settings</p>
          <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-white">PIN Recovery</h1>

          {!ready ? (
            <p className="text-sm text-white/75">
              Open this page from the verification email link sent from Account Settings.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white/80"
              />
              <input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="New 6-digit PIN"
                required
                pattern="\d{6}"
                maxLength={6}
                className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save New PIN'}
              </button>
            </form>
          )}

          {message && <p className="mt-3 text-xs text-cyan-200/90">{message}</p>}

          <p className="mt-4 text-xs text-white/70">
            Back to{' '}
            <Link href="/account" className="text-cyan-300 hover:text-cyan-200">
              Account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
