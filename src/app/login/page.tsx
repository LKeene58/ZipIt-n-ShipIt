'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const checkCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const pinStatus = await fetch('/api/auth/pin-status', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const pinData = (await pinStatus.json()) as { hasPin?: boolean };
      if (pinData.hasPin) {
        router.replace('/account');
      } else {
        router.replace('/signup?pin_setup=1');
      }
    };
    checkCurrentUser();
  }, [router]);

  const handleGoogleOAuth = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/signup?pin_setup=1`,
      },
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        router.push('/account');
        return;
      }

      // Route all sign-up attempts to the dedicated sign-up flow that captures PIN.
      router.push(`/signup${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`);
      return;
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Authentication failed';
      setMessage(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -right-20 bottom-16 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto mt-8 w-full max-w-6xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.18em] text-cyan-300/80">
          Zip-It &apos;n Ship-It: Professional Creator Gear, US-Warehouse Fast.
        </p>
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 z-30 rounded-full border border-cyan-400/30 bg-black/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/90 backdrop-blur-md">
        2-5 Day Domestic Shipping
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-14">
        <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-black/60 p-8 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-400/80">ZIP-IT &apos;N SHIP-IT Portal</p>
          <h1 className="mb-6 text-4xl font-black uppercase tracking-tight text-white">
            Command Login
          </h1>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.2em] transition ${
                mode === 'sign-in'
                  ? 'border-cyan-400 bg-cyan-400 text-black'
                  : 'border-white/15 bg-[#0a0a0a] text-cyan-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.2em] transition ${
                mode === 'sign-up'
                  ? 'border-cyan-400 bg-cyan-400 text-black'
                  : 'border-white/15 bg-[#0a0a0a] text-cyan-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleOAuth}
              className="w-full rounded-xl border border-cyan-400/40 bg-black/40 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
            >
              Continue with Google
            </button>
            <div>
              <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.25em] text-cyan-400/75">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="lkeene0430@gmail.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs uppercase tracking-[0.25em] text-cyan-400/75">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-[0.28em] text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Routing...' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </button>
            {message && <p className="text-xs text-cyan-200/90">{message}</p>}
          </form>
          <p className="mt-4 text-xs text-white/70">
            Need a new account?{' '}
            <Link href="/signup" className="text-cyan-300 hover:text-cyan-200">
              Go to Sign Up
            </Link>
          </p>
          <p className="mt-2 text-xs text-white/70">
            Forgot password?{' '}
            <Link href="/forgot-password" className="text-cyan-300 hover:text-cyan-200">
              Recover access
            </Link>
          </p>
        </div>
      </section>

      <footer className="relative z-10 mx-auto mt-[-2rem] w-full max-w-6xl px-6 pb-8">
        <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4 backdrop-blur-md">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-white/60">
            <Link href="/legal/privacy-policy" className="hover:text-cyan-300">
              Privacy Policy
            </Link>
            <Link href="/legal/terms-of-service" className="hover:text-cyan-300">
              Terms of Service
            </Link>
            <Link href="/legal/refund-policy" className="hover:text-cyan-300">
              Refund Policy
            </Link>
            <Link href="/legal/shipping-policy" className="hover:text-cyan-300">
              Shipping Policy
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
