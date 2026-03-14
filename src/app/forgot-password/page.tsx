'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setMessage('Password reset email sent. Check your inbox.');
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Unable to send reset email.';
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-14">
        <div className="w-full max-w-md rounded-3xl border border-cyan-400/30 bg-black/60 p-8 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl">
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-400/80">Account Recovery</p>
          <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-white">Reset Password</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-xl border border-white/15 bg-[#0a0a0a] px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-black transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {message && <p className="mt-3 text-xs text-cyan-200/90">{message}</p>}

          <p className="mt-4 text-xs text-white/70">
            Back to{' '}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
