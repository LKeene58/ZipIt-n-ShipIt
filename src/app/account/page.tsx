'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlobalTopNav from '../../components/GlobalTopNav';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('Loading...');
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinResetLinkBusy, setPinResetLinkBusy] = useState(false);
  const [pinResetLinkMessage, setPinResetLinkMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const userEmail = data.session?.user?.email;
      const accessToken = data.session?.access_token;

      if (!active) return;
      if (!userEmail) {
        router.replace('/login');
        return;
      }
      setEmail(userEmail);

      if (accessToken) {
        const pinStatusResponse = await fetch('/api/auth/pin-status', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const pinStatus = (await pinStatusResponse.json()) as { hasPin?: boolean };
        if (!active) return;
        setHasPin(Boolean(pinStatus.hasPin));
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleManagePayments = async () => {
    if (!email || email === 'Loading...') return;
    setBillingBusy(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Unable to open billing portal.');
      }
      window.location.assign(data.url);
    } catch (err) {
      console.error('Billing portal error:', err);
    } finally {
      setBillingBusy(false);
    }
  };

  const handleSetPin = async () => {
    const normalizedPin = pin.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(normalizedPin)) {
      setPinMessage('PIN must be exactly 6 digits.');
      return;
    }

    setPinBusy(true);
    setPinMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: normalizedPin }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || result.error) {
        throw new Error(result.error ?? 'Unable to save PIN.');
      }

      setHasPin(true);
      setPin('');
      setPinMessage('Transaction PIN saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save PIN.';
      setPinMessage(message);
    } finally {
      setPinBusy(false);
    }
  };

  const handleSendPinResetLink = async () => {
    if (!email || email === 'Loading...') return;
    setPinResetLinkBusy(true);
    setPinResetLinkMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/pin-recovery`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;
      setPinResetLinkMessage('Verification link sent. Open your email to continue PIN reset.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send verification link.';
      setPinResetLinkMessage(message);
    } finally {
      setPinResetLinkBusy(false);
    }
  };

  return (
    <main className="relative z-10 min-h-screen overflow-hidden bg-[#020202] px-4 py-6 text-white md:px-8">
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <GlobalTopNav showSignOut={false} />

        <section className="rounded-3xl border border-cyan-500/20 bg-black/25 p-6 backdrop-blur-md md:p-8">
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white md:text-3xl">
            Command Center
          </h1>
          <p className="mt-2 text-sm uppercase tracking-[0.14em] text-cyan-300">
            Welcome back, {email}
          </p>

          {hasPin !== null && (
            <div className="mt-6 rounded-2xl border border-amber-400/45 bg-amber-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
                {hasPin ? 'PIN Recovery / Reset' : 'PIN Required For Purchase Authorization'}
              </p>
              {hasPin ? (
                <>
                  <p className="mt-2 text-sm text-amber-100/85">
                    Reset PIN from Account Settings by verifying with a secure email link.
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleSendPinResetLink}
                      disabled={pinResetLinkBusy}
                      className="rounded-xl bg-amber-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60"
                    >
                      {pinResetLinkBusy ? 'Sending...' : 'Email PIN Reset Link'}
                    </button>
                  </div>
                  {pinResetLinkMessage && (
                    <p className="mt-2 text-xs text-amber-100/90">{pinResetLinkMessage}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-amber-100/85">
                    Add a 6-digit transaction PIN now so checkout authorization can proceed.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="password"
                      value={pin}
                      onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Set 6-digit PIN"
                      maxLength={6}
                      className="w-full rounded-xl border border-amber-300/35 bg-black/40 px-4 py-3 text-white outline-none focus:border-amber-200"
                    />
                    <button
                      type="button"
                      onClick={handleSetPin}
                      disabled={pinBusy}
                      className="rounded-xl bg-amber-300 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black disabled:opacity-60"
                    >
                      {pinBusy ? 'Saving...' : 'Set PIN'}
                    </button>
                  </div>
                  {pinMessage && <p className="mt-2 text-xs text-amber-100/90">{pinMessage}</p>}
                </>
              )}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/shop"
              className="rounded-xl border border-cyan-500/20 bg-black/30 p-4 text-center text-xs font-black uppercase tracking-[0.18em] text-cyan-300 transition hover:border-cyan-400"
            >
              Return to Shop
            </Link>
            <Link
              href="/cart"
              className="rounded-xl border border-cyan-500/20 bg-black/30 p-4 text-center text-xs font-black uppercase tracking-[0.18em] text-cyan-300 transition hover:border-cyan-400"
            >
              View Current Cart
            </Link>
            <Link
              href="/account/history"
              className="rounded-xl border border-cyan-500/20 bg-black/30 p-4 text-center text-xs font-black uppercase tracking-[0.18em] text-cyan-300 transition hover:border-cyan-400"
            >
              Order History
            </Link>
            <button
              type="button"
              onClick={handleManagePayments}
              disabled={billingBusy}
              className="rounded-xl border border-cyan-500/20 bg-black/30 p-4 text-center text-xs font-black uppercase tracking-[0.18em] text-cyan-300 transition hover:border-cyan-400 disabled:opacity-50"
            >
              {billingBusy ? 'Opening...' : 'Manage Payments'}
            </button>
            <button
              type="button"
              onClick={handleManagePayments}
              disabled={billingBusy}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-xs font-black uppercase tracking-[0.18em] text-emerald-300 transition hover:border-emerald-400 disabled:opacity-50"
            >
              {billingBusy ? 'Opening...' : 'Add Payment Method'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-xs font-black uppercase tracking-[0.18em] text-red-300 transition hover:border-red-400 disabled:opacity-50"
            >
              {busy ? 'Signing Out...' : 'Logout'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
