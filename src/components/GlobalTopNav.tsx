'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import BlueChromeWordmark from './BlueChromeWordmark';
import { useCart } from '../context/CartContext';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';
import SignOutButton from './SignOutButton';

type GlobalTopNavProps = {
  showSearch?: boolean;
  hideCartLink?: boolean;
  logoScaleClassName?: string;
  searchFormClassName?: string;
  showSignOut?: boolean;
};

export default function GlobalTopNav({
  showSearch = true,
  hideCartLink = false,
  logoScaleClassName,
  searchFormClassName,
  showSignOut = true,
}: GlobalTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchInput, setSearchInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') ?? '';
  });
  const cartCount = cart.length;

  const showBackToShop = pathname === '/checkout' || pathname === '/cart' || pathname === '/account';
  const showAccountCenterLink = !pathname.startsWith('/account');

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        setIsLoggedIn(Boolean(data.session?.user));
      }
    };

    sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!cancelled) {
        setIsLoggedIn(Boolean(session?.user));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const authHref = useMemo(() => (isLoggedIn ? '/account' : '/login'), [isLoggedIn]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchInput.trim();
    const path = pathname === '/Preview' ? '/Preview' : '/shop';
    router.push(query ? `${path}?q=${encodeURIComponent(query)}` : path);
  };

  useEffect(() => {
    if (!showSearch) return;
    const path = pathname === '/Preview' ? '/Preview' : '/shop';
    const currentQuery =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') ?? '' : '';
    const nextQuery = searchInput.trim();
    if (nextQuery === currentQuery) return;

    const timer = setTimeout(() => {
      router.replace(nextQuery ? `${path}?q=${encodeURIComponent(nextQuery)}` : path);
    }, 180);
    return () => clearTimeout(timer);
  }, [showSearch, searchInput, pathname, router]);

  return (
    <header className="relative z-40 mb-8 w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 rounded-2xl border border-cyan-500/20 bg-black/30 px-3 py-3 backdrop-blur-md md:gap-4 md:px-4">
        <Link href="/shop" className="shrink-0">
          <div className={logoScaleClassName ?? 'origin-left scale-[0.84] md:scale-[1.01]'}>
            <BlueChromeWordmark />
          </div>
        </Link>

        {showSearch && (
          <form onSubmit={handleSearchSubmit} className={searchFormClassName ?? 'flex-1'}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-cyan-500/25 bg-black/40 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/20"
            />
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          {showBackToShop && (
            <Link
              href="/shop"
              className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
            >
              Back to Shop
            </Link>
          )}

          {isLoggedIn ? (
            <>
              {!hideCartLink && (
                <Link
                  href="/cart"
                  className="rounded-xl border border-cyan-500/30 bg-black/30 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  Cart ({cartCount})
                </Link>
              )}
              {showAccountCenterLink && (
                <Link
                  href={authHref}
                  className="rounded-xl border border-cyan-500/30 bg-black/30 px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  Account Center
                </Link>
              )}
              {showSignOut && (
                <SignOutButton
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:opacity-60"
                  label="Sign Out"
                  busyLabel="Signing Out..."
                />
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-cyan-400/60 bg-cyan-400/15 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/25"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-cyan-300"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
