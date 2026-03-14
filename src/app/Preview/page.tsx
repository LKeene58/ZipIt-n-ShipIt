'use client';
/**
 * PROJECT: UGI STUDIOS - ZIP-IT 'N SHIP-IT
 * FILE: src/app/Preview/page.tsx
 * STATUS: BULLETPROOF GRID LAYOUT (Logo Left, Search Center, Text Right)
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Search, ShoppingCart, Settings } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sale_price: number;
  image_url: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
}

export default function StorefrontPreview() {
  const router = useRouter();
  
  // 🔒 STRICT TYPES RESTORED - No errors here
  const { cart, addToCart } = useCart() as { 
    cart: (Product & { quantity?: number })[]; 
    addToCart: (item: Product) => void; 
  };
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getThumbnail = (url: string) => {
    if (!url) return '/file.svg';
    try {
      if (url.includes('/')) {
        const [folder, filesPart] = url.split('/');
        const firstFile = filesPart.split(',')[0].trim();
        return `/${folder}/${firstFile}`;
      }
      const first = url.split(',')[0].trim();
      return first.startsWith('/') ? first : `/${first}`;
    } catch (err) {
      return '/file.svg';
    }
  };

  const notifyIntent = async (item: Product, action: string) => {
    try {
      const sessionStorageKey = 'ugi_session_id';
      const existingSessionId = typeof window !== 'undefined' ? window.localStorage.getItem(sessionStorageKey) : null;
      const sessionId = existingSessionId || crypto.randomUUID();
      
      await fetch('/api/buy-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: `storefront_${action}`,
          session_id: sessionId,
          items: [{ ...item, quantity: 1 }],
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('AI Tracking Error:', err);
    }
  };

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=*&order=id.asc`, {
          cache: 'no-store',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
        });
        const data = await response.json();
        if (data && !data.error) setProducts(data);
      } catch (err) {
        console.error('Sync Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const filteredProducts = products.filter((product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartItemCount = cart?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center text-cyan-400 font-mono tracking-widest uppercase animate-pulse">
        Initializing Storefront Data...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#020202] text-white overflow-hidden pb-32">
      
      {/* BACKGROUND RGB AURORAS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center items-center">
        <div className="absolute top-[-5%] left-[-5%] w-[65%] h-[65%] bg-emerald-500/15 rounded-full blur-[140px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[10%] right-[-10%] w-[55%] h-[55%] bg-red-600/15 rounded-full blur-[140px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-5%] left-[15%] w-[75%] h-[75%] bg-blue-600/20 rounded-full blur-[140px] mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-12">
        
        {/* HEADER SECTION - STRICT 3-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center w-full mb-16 border-b border-cyan-900/50 pb-8 gap-6">
          
          {/* COLUMN 1: FAR LEFT MASSIVE LOGO */}
          {/* -ml-8 physically pulls the image to the left */}
          <div className="flex justify-center lg:justify-start -ml-8">
            <img 
              src="/removebg.png" 
              alt="UGI Logo" 
              className="h-40 md:h-56 w-auto object-contain drop-shadow-[0_0_30px_rgba(0,242,255,0.5)]"
            />
          </div>

          {/* COLUMN 2: CENTER STRETCHED SEARCH & BUTTONS */}
          <div className="flex w-full items-center justify-center">
            <div className="flex w-full max-w-lg items-center">
              {/* Search Bar (Stretches to fill middle space) */}
              <div className="relative flex-grow group">
                <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-l-full transition-all group-hover:bg-cyan-500/20" />
                <div className="relative flex items-center bg-black/50 border border-cyan-500/30 border-r-0 rounded-l-full px-5 py-3 backdrop-blur-md">
                  <Search className="text-cyan-400 h-5 w-5 mr-3 opacity-70" />
                  <input 
                    type="text" 
                    placeholder="Search inventory..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-white w-full placeholder-white/30 font-mono tracking-widest text-xs"
                  />
                </div>
              </div>

              {/* Fused Buttons (Settings + Cart) */}
              <div className="flex items-center flex-shrink-0">
                <Link 
                  href="/account" 
                  className="relative flex items-center justify-center h-[50px] w-12 bg-cyan-500/10 border-y border-l border-cyan-400/30 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
                  title="Account Settings"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                
                <Link 
                  href="/checkout" 
                  className="relative flex items-center justify-center h-[50px] w-14 bg-cyan-500/10 border border-cyan-400/30 rounded-r-full text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
                  title="Cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black h-5 w-5 flex items-center justify-center rounded-full border border-black">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>

          {/* COLUMN 3: FAR RIGHT STOREFRONT TEXT */}
          <div className="flex flex-col items-center lg:items-end text-right">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]">
              Storefront
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,1)] animate-pulse"></span>
              <p className="text-cyan-400 font-mono text-[10px] md:text-xs tracking-[0.2em] uppercase">Sync Active</p>
            </div>
          </div>

        </div>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <p className="text-cyan-400/50 font-mono tracking-widest uppercase mb-4">No matching inventory found</p>
            </div>
          ) : (
            filteredProducts.map((item) => (
              <div 
                key={item.id} 
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="group relative flex flex-col bg-cyan-950/10 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 transition-all duration-500 hover:border-cyan-500/40 hover:shadow-[0_0_40px_rgba(0,255,255,0.15)] hover:-translate-y-2"
              >
                <div className="absolute top-6 left-6 z-20 px-3 py-1 bg-black/60 border border-white/10 rounded-full">
                  <p className="text-[10px] font-mono text-gray-500 tracking-tighter">UGI-ID: {item.id.toString().padStart(4, '0')}</p>
                </div>

                <Link 
                  href={`/product/${item.id}`} 
                  onClick={() => notifyIntent(item, 'click')}
                  className="relative w-full aspect-square mb-8 rounded-2xl bg-black/20 overflow-hidden flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={getThumbnail(item.image_url)} 
                    alt={item.name} 
                    className="h-full w-full object-contain p-8 transition-all duration-700 group-hover:scale-110 group-hover:rotate-2 text-transparent"
                    onError={(e) => { 
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('/file.svg')) {
                        target.src = '/file.svg'; 
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Link>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors uppercase leading-none line-clamp-2">
                      {item.name}
                    </h3>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                    <p className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                      ${item.sale_price}
                    </p>
                    
                    <button 
                      onClick={() => {
                        addToCart(item);
                        notifyIntent(item, 'add_to_cart');
                      }}
                      className="relative px-6 py-3 bg-white/5 hover:bg-cyan-400 border border-white/10 hover:border-cyan-300 rounded-xl transition-all duration-300 group/btn overflow-hidden"
                    >
                      <span className="relative z-10 text-white group-hover/btn:text-black font-black uppercase text-xs tracking-widest">
                        Add to Cart
                      </span>
                      <div className="absolute inset-0 bg-cyan-400 scale-x-0 group-hover/btn:scale-x-100 origin-left transition-transform duration-500" />
                    </button>
                  </div>
                </div>

                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-500 ${hoveredId === item.id ? 'bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,1)] scale-[3]' : 'bg-white/10'}`} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] h-20 bg-black/40 backdrop-blur-2xl border-t border-cyan-500/20 flex items-center justify-center px-10">
        <div className="max-w-7xl w-full flex justify-between items-center">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
               <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">System Load</p>
               <p className="text-sm font-black text-white">STABLE</p>
             </div>
             <div className="w-[1px] h-8 bg-white/10"></div>
             <div className="flex flex-col">
               <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest">Active Fleet</p>
               <p className="text-sm font-black text-white">OVERSEER // SOURCING</p>
             </div>
          </div>
          
          <Link href="/admin" className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors uppercase tracking-[0.5em]">
            Command Center
          </Link>
        </div>
      </div>

    </div>
  );
}