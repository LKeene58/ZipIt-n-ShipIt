'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../../context/CartContext';

export default function SuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="relative min-h-screen bg-[#010101] text-white flex items-center justify-center overflow-hidden font-sans">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[-10%] w-[120%] h-[500px] bg-emerald-500/20 rounded-full blur-[140px] animate-aurora-thick" />
        <div className="absolute bottom-[-10%] left-[5%] w-[100%] h-[400px] bg-cyan-500/20 rounded-full blur-[140px] animate-aurora-thick" />
      </div>

      <div className="relative z-10 text-center px-6">
        <div className="inline-block mb-8 p-4 rounded-full bg-cyan-400/10 border border-cyan-400/20 shadow-[0_0_50px_rgba(0,242,255,0.2)]">
          <svg className="w-16 h-16 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic mb-4">
          PAYMENT <span className="text-cyan-400">VERIFIED</span>
        </h1>
        
        <p className="text-white/40 font-bold tracking-[0.3em] uppercase mb-12">
          Your gear is being prepared for transport.
        </p>

        <Link 
          href="/Preview" 
          className="px-12 py-5 bg-transparent border border-cyan-400/60 text-cyan-300 font-black tracking-[.5em] uppercase rounded-full hover:bg-cyan-500/10 hover:border-cyan-300 transition-all duration-500 inline-block shadow-[0_0_20px_rgba(0,255,255,0.35)] hover:shadow-[0_0_35px_rgba(0,255,255,0.6)]"
        >
          RETURN TO HUB
        </Link>
      </div>
    </div>
  );
}
