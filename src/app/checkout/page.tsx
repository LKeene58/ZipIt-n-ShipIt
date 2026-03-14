'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';
import GlobalTopNav from '../../components/GlobalTopNav';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

interface Product {
  id: number;
  name: string;
  sale_price: number;
  image_url: string;
  description?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function Checkout() {
  const { cart, addToCart, removeOneFromCart, removeFromCart } = useCart();
  const [showPinPrompt, setShowPinPrompt] = React.useState(false);
  const [transactionPin, setTransactionPin] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [authToken, setAuthToken] = React.useState('');
  const [processingPayment, setProcessingPayment] = React.useState(false);
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [hasPin, setHasPin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then((sessionResult: { data: { session: { access_token?: string; user?: { email?: string } } | null } }) => {
      const { data } = sessionResult;
      const token = data.session?.access_token;
      const sessionEmail = data.session?.user?.email;
      if (sessionEmail) setEmail(sessionEmail);
      if (token) setAuthToken(token);

      if (!token) return;
      fetch('/api/auth/pin-status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((result: { hasPin?: boolean }) => {
          setHasPin(Boolean(result.hasPin));
        })
        .catch(() => {
          setHasPin(null);
        });
    });
  }, []);

  // GROUP ITEMS FOR CLEAN UI
  const groupedCart = cart.reduce((acc: Record<number, CartItem>, item: Product) => {
    if (!acc[item.id]) {
      acc[item.id] = { ...item, quantity: 1 };
    } else {
      acc[item.id].quantity += 1;
    }
    return acc;
  }, {});

  const cartItems: CartItem[] = Object.values(groupedCart);
  
  // CALCULATE TOTAL WITH 5% PROFIT PROTECTION FEE
  const rawSubtotal = cart.reduce((sum: number, item: Product) => sum + (item.sale_price || 0), 0);
  const subtotalWithFee = rawSubtotal * 1.05;

  const executePayment = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    try {
      if (!/^\d{6}$/.test(transactionPin)) {
        setPinError('Enter your 6-digit transaction PIN.');
        return;
      }
      if (!email.trim()) {
        setPinError('Email is required for PIN verification.');
        return;
      }

      setProcessingPayment(true);
      setPinError(null);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          items: cartItems,
          email: email.trim().toLowerCase(),
          pin: transactionPin,
        }),
      });

      const data = await response.json();
      
      if (data.error || (!data.checkoutUrl && !data.sessionId)) {
        throw new Error(data.error || "Session initialization failed");
      }

      // Redirect using Stripe-provided URL to avoid invalid /pay/<session_id> 404s.
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl as string);
      } else {
        throw new Error('Checkout URL missing from server response.');
      }
      
    } catch (err) {
      console.error("Payment Error:", err);
      const message = err instanceof Error ? err.message : 'Payment failed.';
      setPinError(message);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#010101] text-white p-6 md:p-12 overflow-hidden font-sans">
      
      {/* RESTORED: 3 THICK NORTHERN LIGHTS STRANDS */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[15%] left-[-10%] w-[120%] h-[500px] bg-emerald-500/25 rounded-full blur-[140px] animate-aurora-thick [animation-delay:-5s]" />
        <div className="absolute top-[40%] left-0 w-[110%] h-[500px] bg-cyan-500/30 rounded-full blur-[140px] animate-aurora-thick" />
        <div className="absolute bottom-[-10%] left-[5%] w-[100%] h-[400px] bg-red-600/20 rounded-full blur-[140px] animate-aurora-thick [animation-delay:-10s]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <GlobalTopNav />
        <div className="flex justify-between items-baseline mb-16 border-b border-white/5 pb-8">
          <h1 className="text-7xl font-black tracking-tighter uppercase italic">
            YOUR <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(0,209,255,0.4)]">CART</span>
          </h1>
          <Link href="/shop" className="text-white/20 hover:text-cyan-400 font-bold text-xs tracking-[0.5em] transition-all">
            ← BACK TO SHOP
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-3xl p-24 text-center">
            <h2 className="text-4xl font-thin text-white/10 uppercase tracking-[1em]">Empty</h2>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {cartItems.map((item) => {
              const imageSrc = item.image_url ? (item.image_url.split(', ')[0].startsWith('/') ? item.image_url.split(', ')[0] : `/${item.image_url.split(', ')[0]}`) : '/file.svg';

              return (
                <div key={item.id} className="group bg-white/[0.05] backdrop-blur-3xl border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all duration-700 hover:bg-white/[0.08] hover:border-cyan-500/20">
                  <div className="flex items-center gap-10 w-full md:w-auto">
                    <div className="relative w-28 h-28 bg-white/[0.1] rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(0,209,255,0.5)] group-hover:scale-105">
                      <Image src={imageSrc} alt={item.name} fill className="object-cover opacity-70 group-hover:opacity-100 transition-all" />
                    </div>
                    <div className="flex flex-col gap-4">
                      <h3 className="text-2xl font-bold text-white/80 uppercase tracking-widest">{item.name}</h3>
                      <div className="flex items-center gap-6 bg-white/5 border border-white/5 rounded-full px-5 py-2 w-max">
                        <button onClick={() => removeOneFromCart(item.id)} className="text-white/20 hover:text-cyan-400 font-bold px-2">−</button>
                        <span className="text-cyan-400 font-mono text-sm font-black">QTY: {item.quantity}</span>
                        <button onClick={() => addToCart(item)} className="text-white/20 hover:text-cyan-400 font-bold px-2">+</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-6">
                    <span className="text-4xl font-black text-white tracking-tighter">${(item.sale_price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-black text-red-500/30 hover:text-red-500 uppercase tracking-[0.3em] transition-colors">DELETE_ITEM</button>
                  </div>
                </div>
              );
            })}

            <div className="bg-cyan-400/[0.05] backdrop-blur-3xl border border-cyan-400/10 rounded-[40px] p-12 mt-8 shadow-2xl">
              <div className="flex justify-between items-end mb-12">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white/10 uppercase tracking-[0.8em]">SYSTEM_TOTAL:</span>
                  <span className="text-[10px] text-cyan-400/40 uppercase font-bold mt-2 tracking-widest">Includes 5% Proc. Fee</span>
                </div>
                <span className="text-7xl font-black text-white drop-shadow-[0_0_40px_rgba(0,209,255,0.2)]">
                  ${subtotalWithFee.toFixed(2)}
                </span>
              </div>
              
              <button 
                onClick={() => {
                  if (hasPin === false) return;
                  setShowPinPrompt(true);
                }}
                className="w-full py-8 bg-cyan-400 text-black text-2xl font-black tracking-[0.5em] uppercase rounded-3xl transition-all duration-500 hover:bg-[#00f2ff] hover:shadow-[0_0_60px_rgba(0,242,255,0.7)] hover:scale-[1.01] active:scale-[0.98]"
              >
                EXECUTE PAYMENT
              </button>
              {hasPin === false && (
                <div className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                    PIN Not Configured
                  </p>
                  <p className="mt-1 text-xs text-amber-100/85">
                    Set your transaction PIN before authorizing purchases.
                  </p>
                  <Link
                    href="/account"
                    className="mt-3 inline-block rounded-xl border border-amber-300/45 bg-black/30 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-amber-200"
                  >
                    Set PIN in Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPinPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/25 bg-black/85 p-6">
            <h2 className="text-lg font-black uppercase tracking-[0.25em] text-cyan-300">Authorize Payment</h2>
            <p className="mt-2 text-xs text-white/70">
              Enter the 6-digit transaction PIN to continue.
            </p>
            <form onSubmit={executePayment} className="mt-4 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Account email"
                className="w-full rounded-xl border border-cyan-500/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
              <input
                type="password"
                value={transactionPin}
                onChange={(event) => setTransactionPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit PIN"
                maxLength={6}
                className="w-full rounded-xl border border-cyan-500/25 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan-400"
              />
              {pinError && <p className="text-xs text-red-300">{pinError}</p>}
              <Link
                href="/account"
                className="inline-block text-xs uppercase tracking-[0.14em] text-cyan-300 hover:text-cyan-200"
              >
                Forgot PIN? Reset from Account Settings
              </Link>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinPrompt(false);
                    setTransactionPin('');
                    setPinError(null);
                  }}
                  className="flex-1 rounded-xl border border-white/15 px-3 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="flex-1 rounded-xl bg-cyan-400 px-3 py-3 text-xs font-black uppercase tracking-[0.2em] text-black disabled:opacity-60"
                >
                  {processingPayment ? 'Validating...' : 'Confirm & Pay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
