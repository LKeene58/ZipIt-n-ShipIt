'use client';
/**
 * PROJECT: UGI STUDIOS - ZIP-IT 'N SHIP-IT
 * STATUS: GOLD STANDARD - NESTED PATH RESOLUTION & RESTORED ARROWS
 */

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../../context/CartContext';

interface Product {
  id: number;
  name: string;
  sale_price: number;
  image_url: string;
  description?: string;
}

export default function ProductPreview() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showCartPrompt, setShowCartPrompt] = useState(false);

  // UGI STUDIOS LOGIC: Resolves "shield/1.png,2.png" into ["/shield/1.png", "/shield/2.png"]
  const imageList = useMemo(() => {
    if (!product?.image_url) return ['/file.svg'];
    
    // Check if the string uses the folder/file,file format
    if (product.image_url.includes('/')) {
      const [folder, filesPart] = product.image_url.split('/');
      return filesPart.split(',').map(file => {
        const fileName = file.trim();
        return fileName.startsWith('/') ? fileName : `/${folder}/${fileName}`;
      });
    }
    
    // Fallback for flat comma-separated lists
    return product.image_url.split(',').map((img: string) => {
      const trimmed = img.trim();
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    });
  }, [product]);

  const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % imageList.length);
  const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);

  const notifyBuyNow = async (item: Product) => {
    try {
      const sessionStorageKey = 'ugi_session_id';
      const existingSessionId = typeof window !== 'undefined' ? window.localStorage.getItem(sessionStorageKey) : null;
      const sessionId = existingSessionId || crypto.randomUUID();
      if (!existingSessionId && typeof window !== 'undefined') {
        window.localStorage.setItem(sessionStorageKey, sessionId);
      }
      await fetch('/api/buy-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'product_buy_now_click',
          session_id: sessionId,
          items: [{ ...item, quantity: 1 }],
        }),
      });
    } catch (err) { console.error('Buy Now intent failed:', err); }
  };

  useEffect(() => {
    if (!params.id) return;
    const getProduct = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?id=eq.${params.id}&select=*`, { 
          cache: 'no-store',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
        });
        const data = await response.json();
        if (data?.length > 0) setProduct(data[0]);
      } catch (err) { console.error('Supabase Error:', err); }
      finally { setLoading(false); }
    };
    getProduct();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center text-cyan-400 font-mono animate-pulse">
      INITIALIZING EQUIPMENT DATA...
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-white gap-6">
      <h1 className="text-4xl font-bold font-mono text-cyan-400 text-center px-4">404 - GEAR NOT FOUND</h1>
      <Link href="/Preview" className="py-3 px-8 border border-cyan-500/50 text-cyan-400 font-bold uppercase rounded-xl hover:bg-cyan-500/20">Return to Base</Link>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#020202] text-white overflow-hidden pb-20">
      {/* BACKGROUND AURORAS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center items-center">
        <div className="absolute top-[-5%] left-[-5%] w-[65%] h-[65%] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-[10%] right-[-10%] w-[55%] h-[55%] bg-red-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-5%] left-[15%] w-[75%] h-[75%] bg-blue-600/15 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-cyan-900/50 pb-6">
          <Link href="/Preview" className="text-cyan-500/70 hover:text-cyan-400 font-mono tracking-widest uppercase text-xs sm:text-sm">← Back to Storefront</Link>
          <div className="relative w-48 h-16 md:w-56 md:h-20 drop-shadow-[0_0_15px_rgba(0,242,255,0.3)]">
            <Image src="/logo-final-removebg-preview.png" alt="Logo" fill className="object-contain" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          
          {/* GALLERY SECTION */}
          <div className="flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-cyan-950/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-6 shadow-[inset_0_0_30px_rgba(0,255,255,0.05)] flex items-center justify-center group overflow-hidden">
              <Image 
                src={imageList[activeImageIndex]} 
                alt={product.name} 
                fill 
                className="object-contain p-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                priority
              />

              {/* NAVIGATION ARROWS - ALWAYS VISIBLE FOR UX */}
              {imageList.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-4 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.6)] transition-all">
                    ‹
                  </button>
                  <button onClick={nextImage} className="absolute right-4 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-black/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.6)] transition-all">
                    ›
                  </button>
                </>
              )}
            </div>

            {/* THUMBNAILS - RESTORED SCROLL */}
            {imageList.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar">
                {imageList.map((img, idx) => (
                  <button type="button" aria-label={`View image ${idx + 1}`} key={idx} onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border transition-all duration-300 ${activeImageIndex === idx ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)] scale-105' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                  >
                    <Image src={img} alt="Thumb" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS SECTION */}
          <div className="flex flex-col h-full">
            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{product.name}</h1>
            <p className="text-4xl md:text-5xl font-black text-cyan-400 mb-8 drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]">${product.sale_price}</p>

            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl mb-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <h3 className="text-cyan-500 font-mono uppercase tracking-widest text-xs mb-3">System Details</h3>
              <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">{product.description || "Premium UGI gear built for creators."}</p>
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <button onClick={() => { addToCart(product); setShowCartPrompt(true); }} className="w-full py-5 bg-cyan-400 hover:bg-[#00f2ff] text-black font-black text-lg uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)]">Add to Cart</button>
              <button onClick={async () => { await notifyBuyNow(product); addToCart(product); router.push('/checkout'); }} className="w-full py-4 bg-transparent border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20 font-bold uppercase rounded-xl transition-all">Buy it Now</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showCartPrompt && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#050505] border border-cyan-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,255,255,0.15)] max-w-md w-full text-center flex flex-col gap-4">
            <h3 className="text-3xl font-black text-white uppercase tracking-widest mb-2">Item Secured!</h3>
            <p className="text-cyan-400 font-bold text-lg mb-6">{product.name}</p>
            <Link href="/checkout" className="w-full py-4 bg-cyan-400 hover:bg-[#00f2ff] text-black font-black uppercase rounded-xl block mb-2">Checkout</Link>
            <button onClick={() => setShowCartPrompt(false)} className="w-full py-4 bg-transparent border border-white/10 text-white/50 font-bold uppercase rounded-xl">Continue Browsing</button>
          </div>
        </div>
      )}
    </div>
  );
}