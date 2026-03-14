'use client';

import { Suspense } from 'react';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import BlueChromeWordmark from '../../components/BlueChromeWordmark';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinSetupMode, setPinSetupMode] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const queryWantsPinSetup = searchParams.get('pin_setup') === '1';
    const prefillEmail = searchParams.get('email');
    if (prefillEmail) setEmail(prefillEmail);

    const checkOauthPinStatus = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const response = await fetch('/api/auth/pin-status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = (await response.json()) as { hasPin?: boolean; email?: string | null };

      if (result.email) setEmail(result.email);
      if (result.hasPin) {
        if (queryWantsPinSetup) router.replace('/account');
      } else {
        setPinSetupMode(true);
        setOauthToken(session.access_token);
      }
    };

    checkOauthPinStatus();
  }, [router, searchParams]);

  const handleGoogleOAuth = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/signup?pin_setup=1`,
      },
    });
  };

  const handleFinalizePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!oauthToken) return;
    if (!/^\d{6}$/.test(pin)) {
      setMessage('PIN must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${oauthToken}`,
        },
        body: JSON.stringify({ pin }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? 'PIN setup failed');
      router.push('/account');
    } catch (err) {
      const text = err instanceof Error ? err.message : 'PIN setup failed';
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          pin,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Registration failed');
      }

      setMessage(data.message ?? 'Registration successful.');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Registration failed';
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center items-center">
        <div className="absolute top-[-5%] left-[-5%] w-[65%] h-[65%] bg-emerald-500/30 rounded-full blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[10%] right-[-10%] w-[55%] h-[55%] bg-red-600/30 rounded-full blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-5%] left-[15%] w-[75%] h-[75%] bg-blue-600/35 rounded-full blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-14">
        <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-black/60 p-8 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <div className="mb-2 origin-left scale-[0.85]">
            <BlueChromeWordmark />
          </div>
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-400/80">Secure Registration</p>
          <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-white">
            {pinSetupMode ? 'Finalize Account' : 'Create Account'}
          </h1>

          {pinSetupMode ? (
            <form onSubmit={handleFinalizePin} className="space-y-4">
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
                placeholder="Set your 6-digit transaction PIN"
                required
                pattern="\d{6}"
                maxLength={6}
                className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-[0.28em] text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Finalize Account'}
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogleOAuth}
                className="mb-4 w-full rounded-xl border border-cyan-400/40 bg-black/40 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
              >
                Continue with Google
              </button>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password (8+ chars)"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm Password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                />
                <input
                  type="password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit transaction PIN"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-[0.28em] text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Creating...' : 'Sign Up'}
                </button>
              </form>
            </>
          )}

          {message && <p className="mt-3 text-xs text-cyan-200/90">{message}</p>}

          <p className="mt-4 text-xs text-white/70">
            Already have access?{' '}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<>Loading...</>}>
      <SignupPageContent />
    </Suspense>
  );
}
