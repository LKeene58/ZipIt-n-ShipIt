'use client';
/* cSpell:disable */
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BlueChromeWordmark from '../components/BlueChromeWordmark';

export default function ComingSoon() {
  const lockedPreviewCards = [
    {
      id: 'shield-preview',
      name: 'Vocal-Lock Isolation Shield',
      salePrice: 89,
      imageUrl: '/shield/1.png',
    },
    {
      id: 'prompter-preview',
      name: 'Pro-Artist T1 Teleprompter',
      salePrice: 85,
      imageUrl: '/prompter/1.png',
    },
    {
      id: 'neonsign-preview',
      name: 'Neon Guitar Note Sign',
      salePrice: 50,
      imageUrl: '/neonsign/1.png',
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#020202] flex flex-col items-center p-8 text-white overflow-hidden text-center">
      
      <style dangerouslySetInnerHTML={{ __html: `
        #nextjs-portal { display: none !important; }
      `}} />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-6%] left-[-4%] h-[62%] w-[62%] rounded-full bg-emerald-500/20 blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[8%] right-[-10%] h-[52%] w-[52%] rounded-full bg-red-600/20 blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-8%] left-[14%] h-[72%] w-[72%] rounded-full bg-blue-600/25 blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
      </div>

      {/* BRANDING SECTION - RE-BALANCED SCALE */}
      <div className="relative z-10 text-center flex flex-col items-center w-full mt-10">
        
        {/* LOGO: STRETCHED TO LINE WIDTH & DROPPED LOWER */}
        <div className="transform scale-x-[3.2] scale-y-[2.4] md:scale-x-[3.8] md:scale-y-[2.8] transition-all duration-500 mb-8">
          <BlueChromeWordmark className="relative z-30" />
        </div>

        {/* GLOWING LINE: Responsive width floor MATCHED TO PREVIEW */}
        <div className="relative z-30 h-[2px] w-80 md:w-[950px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-6 shadow-[0_0_40px_rgba(0,242,255,0.8)]" />

        {/* SUBTITLE */}
        <p className="relative z-30 text-cyan-400/80 font-mono tracking-[0.5em] uppercase text-[10px] md:text-xs italic mb-20">
          A UGI Studios product
        </p>

        <p className="mb-10 rounded-xl border border-cyan-400/20 bg-black/35 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/90 backdrop-blur-md">
          Zip-It &apos;n Ship-It: Professional Creator Gear, US-Warehouse Fast.
        </p>
        
        <h2 className="relative z-30 text-4xl md:text-6xl font-bold tracking-[0.4em] uppercase text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Coming Soon
        </h2>
        
        <p className="relative z-30 text-cyan-400 font-mono tracking-[0.2em] uppercase text-sm md:text-xl max-w-4xl mx-auto drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]">
          FOR ALL YOUR MUSIC AND STREAMING PRODUCTION NEEDS.
        </p>
      </div>

      <section className="relative z-10 mx-auto mt-8 w-full max-w-6xl pb-10">
        <header className="mb-6 rounded-2xl border border-cyan-500/20 bg-black/30 p-5 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/85">Coming Soon Preview</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-white">
            Locked Showcase
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {lockedPreviewCards.map((card) => (
            <article
              key={card.id}
              className="rounded-2xl border border-cyan-500/25 bg-black/15 p-5 shadow-[0_0_20px_rgba(0,255,255,0.08)] backdrop-blur-md transition-all duration-500 hover:shadow-[0_0_45px_rgba(0,255,255,0.35)]"
            >
              <div className="relative h-56 overflow-hidden rounded-xl border border-cyan-400/25 bg-black/80">
                <Image src={card.imageUrl} alt={card.name} fill className="object-contain p-4 contrast-125 saturate-110" />
              </div>
              <h3 className="mt-4 text-base font-bold uppercase tracking-[0.12em] text-white">{card.name}</h3>
              <p className="mt-2 text-2xl font-black text-cyan-300">${card.salePrice.toFixed(2)}</p>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/65"
              >
                Pre-Order Opening Soon
              </button>
            </article>
          ))}
        </div>
      </section>

      <footer className="relative z-10 mx-auto mt-2 w-full max-w-6xl pb-8">
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

      <div className="pointer-events-none fixed bottom-6 right-6 z-30 rounded-full border border-cyan-400/30 bg-black/45 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/90 backdrop-blur-md">
        2-5 Day Domestic Shipping
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 shadow-[0_-5px_20px_rgba(0,242,255,0.3)]" />
    </div>
  );
}
