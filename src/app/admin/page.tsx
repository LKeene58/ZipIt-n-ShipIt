import Link from 'next/link';
import { Activity, DollarSign, Truck, Search } from 'lucide-react';
import { getOverseerStatus } from '../../../manager/overseer';
import AdminSecurityWrapper from '@/components/admin/AdminSecurityWrapper';
import SignOutButton from '@/components/SignOutButton';
import ReviewButtons from '@/components/admin/ReviewButtons'; // 🛠️ IMPORT ADDED HERE

export interface SourcedProduct {
  product_id: string;
  name: string;               // 👈 Your Admin Terminal needs 'name'
  sale_price: number;
  cost_price: number;
  stock: number;
  image_url: string;
  shipping_cost: number | string;
  status: string;
  net_profit_estimate: number; // 👈 Your Admin Terminal needs this
}

type RevenueLogRow = {
  fee_collected?: number | string | null;
  fee_amount?: number | string | null;
  profit_amount?: number | string | null;
};

type DraftProduct = {
  id: string;
  name: string;
  image_url: string;
  cost_price: number;
  sale_price: number;
  net_profit_estimate: number;
};

// 🔒 Using Service Role Key for Server-Side Override
async function getTotalFeesCollected(): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return 0;

  const query = new URLSearchParams({
    select: 'fee_collected,fee_amount,profit_amount',
    order: 'created_at.desc',
    limit: '500',
  });

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/revenue_log?${query.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return 0;

    const rows = (await response.json()) as RevenueLogRow[];
    return rows.reduce((sum, row) => {
      const feeCollected = Number(row.fee_collected);
      if (Number.isFinite(feeCollected)) return sum + feeCollected / 100;

      const fee = Number(row.fee_amount);
      if (Number.isFinite(fee)) return sum + fee;

      const profit = Number(row.profit_amount);
      if (Number.isFinite(profit)) return sum + profit;

      return sum;
    }, 0);
  } catch {
    return 0;
  }
}

// 🔒 Fetching Drafts securely from the backend
async function getDraftedProducts(): Promise<DraftProduct[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return [];

  const query = new URLSearchParams({
    select: 'id,name,image_url,cost_price,sale_price,net_profit_estimate',
    status: 'eq.draft',
    order: 'created_at.desc',
    limit: '5', 
  });

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/products?${query.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store', 
    });

    if (!response.ok) return [];
    return (await response.json()) as DraftProduct[];
  } catch {
    return [];
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default async function AdminPage() {
  // ⚡ Parallel Fetching for blazing fast load times
  const [totalFeesCollected, overseer, draftedProducts] = await Promise.all([
    getTotalFeesCollected(),
    getOverseerStatus(),
    getDraftedProducts(),
  ]);

  const awaitingShipment = [
    { label: 'Queued Labels', value: 14 },
    { label: 'Ready to Pack', value: 9 },
    { label: 'Courier Pickups', value: 3 },
  ];

  const totalAwaiting = awaitingShipment.reduce((sum, stat) => sum + stat.value, 0);

  return (
    <AdminSecurityWrapper redirectTo="/account">
      <main className="relative z-10 min-h-screen overflow-hidden bg-[#020202] px-6 py-10 text-white md:px-10">
        
        {/* --- UGI STUDIOS CUSTOM BACKGROUND --- */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes lake-drift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes roam-splash-zone {
            0% { transform: translate(0vw, 0vh); }
            33% { transform: translate(15vw, -10vh); }
            66% { transform: translate(-10vw, 15vh); }
            100% { transform: translate(0vw, 0vh); }
          }
          @keyframes ripple-expand {
            0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; border-width: 6px; }
            83.33% { transform: translate(-50%, -50%) scale(4); opacity: 0; border-width: 1px; }
            100% { transform: translate(-50%, -50%) scale(4); opacity: 0; border-width: 0px; }
          }
          @keyframes color-chaos {
            0% { border-color: rgba(236, 72, 153, 0.9); }
            12.5% { border-color: rgba(168, 85, 247, 0.9); }
            25% { border-color: rgba(59, 130, 246, 0.9); }
            37.5% { border-color: rgba(6, 182, 212, 0.9); }
            50% { border-color: rgba(16, 185, 129, 0.9); }
            62.5% { border-color: rgba(234, 179, 8, 0.9); }
            75% { border-color: rgba(249, 115, 22, 0.9); }
            87.5% { border-color: rgba(239, 68, 68, 0.9); }
            100% { border-color: rgba(236, 72, 153, 0.9); }
          }
        `}} />
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden mix-blend-screen">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] blur-[120px] animate-[lake-drift_30s_ease-in-out_infinite]"
            style={{
              background: 'linear-gradient(90deg, rgba(2,2,2,1) 0%, rgba(236,72,153,0.2) 25%, rgba(59,130,246,0.2) 50%, rgba(16,185,129,0.2) 75%, rgba(2,2,2,1) 100%)',
              backgroundSize: '200% 200%'
            }}
          />
          <div className="absolute top-1/2 left-1/2 w-0 h-0 animate-[roam-splash-zone_40s_ease-in-out_infinite]">
            <div className="absolute top-0 left-0 w-[400px] h-[200px] rounded-[100%] border-solid" 
                 style={{ animation: 'ripple-expand 6s ease-out 0s infinite, color-chaos 11s linear 0s infinite' }} />
            <div className="absolute top-0 left-0 w-[400px] h-[200px] rounded-[100%] border-solid" 
                 style={{ animation: 'ripple-expand 6s ease-out 0.8s infinite, color-chaos 13s linear 0s infinite' }} />
            <div className="absolute top-0 left-0 w-[400px] h-[200px] rounded-[100%] border-solid" 
                 style={{ animation: 'ripple-expand 6s ease-out 1.6s infinite, color-chaos 17s linear 0s infinite' }} />
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-cyan-400/20 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80">Admin Portal</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-4xl">
                Agent Command Center
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/Preview"
                className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-400 transition hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                Return to Shop
              </Link>
              <Link
                href="/admin/finances"
                className="rounded-xl border border-cyan-400/35 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-300"
              >
                Finances
              </Link>
              <SignOutButton
                className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:opacity-60"
              />
              <Activity className="h-8 w-8 text-cyan-400 hidden sm:block" />
            </div>
          </header>

          <section className="grid gap-5 lg:grid-cols-3">
            <article className="flex flex-col rounded-2xl border border-cyan-400/25 bg-black/55 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <div className="mb-4 flex items-center gap-2 text-cyan-400">
                <DollarSign className="h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Sales Agent</h2>
              </div>
              <p className="mb-4 text-lg font-semibold text-white/95">Total 5% Fees Collected</p>
              
              <div className="mb-6 flex-grow rounded-2xl border border-cyan-400/35 bg-cyan-400/10 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/90">Revenue Log</p>
                <p className="mt-3 text-4xl font-black text-cyan-300">{formatCurrency(totalFeesCollected)}</p>
                <p className="mt-2 text-xs text-white/65">Pulled from `revenue_log` via Supabase REST.</p>
              </div>

              <Link
                href="/admin/finances"
                className="mt-auto block w-full rounded-xl border border-cyan-500/50 bg-cyan-500/10 py-3 text-center text-sm font-black uppercase tracking-widest text-cyan-400 transition-all hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.6)]"
              >
                View Full Finances
              </Link>
            </article>

            <article className="rounded-2xl border border-cyan-400/25 bg-black/55 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <div className="mb-4 flex items-center gap-2 text-cyan-400">
                <Truck className="h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Logistics Agent</h2>
              </div>
              <p className="mb-4 text-lg font-semibold text-white/95">Orders Awaiting Shipment</p>
              <div className="space-y-3">
                {awaitingShipment.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    <span className="text-sm text-white/85">{row.label}</span>
                    <span className="text-xl font-black text-cyan-400">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-cyan-400/35 bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-300">
                Total in shipment queue: {totalAwaiting}
              </div>
            </article>

            <article className="rounded-2xl border border-cyan-400/25 bg-black/55 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <div className="mb-4 flex items-center gap-2 text-cyan-400">
                <Search className="h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Sourcing Agent</h2>
              </div>
              <p className="mb-4 text-lg font-semibold text-white/95">Inventory Drafts</p>
              <div className="rounded-2xl border border-cyan-400/35 bg-cyan-400/10 p-5 flex flex-col justify-center h-full min-h-[140px]">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/90">Awaiting Your Review</p>
                <p className="mt-3 text-5xl font-black text-cyan-300">{draftedProducts.length}</p>
                <p className="mt-2 text-xs text-white/65">Products sitting in holding pattern.</p>
              </div>
            </article>
          </section>

          <section className="mt-8 rounded-2xl border border-cyan-400/25 bg-black/55 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Sourcing Review Queue</h2>
              <span className="text-xs font-semibold text-white/50">Top 5 Recent Finds</span>
            </div>
            
            {draftedProducts.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5">
                <p className="text-sm text-white/50">No new drafts awaiting review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {draftedProducts.map((product) => (
                  <div key={product.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-500/50 hover:bg-white/10">
                    
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black">
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="h-full w-full object-cover text-transparent"
                        />
                      </div>
                      
                      <div>
                        <h3 className="line-clamp-1 max-w-[300px] text-sm font-bold text-white md:max-w-[400px]">
                          {product.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
                          <span>Cost: <span className="text-white/90">{formatCurrency(product.cost_price)}</span></span>
                          <span>Retail: <span className="text-white/90">{formatCurrency(product.sale_price)}</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 md:justify-end border-t border-white/10 pt-4 md:border-none md:pt-0">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-widest text-emerald-400/80">Est. Profit</p>
                        <p className="text-lg font-black text-emerald-400">+{formatCurrency(product.net_profit_estimate)}</p>
                      </div>
                      
                      {/* 🛠️ FIXED: Only the imported component lives here now! */}
                      <ReviewButtons productId={product.id} />
                      
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 rounded-2xl border border-cyan-400/25 bg-black/55 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">Overseer Status</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/85">Current Operations Flow</p>
                <p className="mt-2 text-xl font-black text-white">{overseer.flow}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/85">Active Coordination Tasks</p>
                <p className="mt-2 text-xl font-black text-white">{overseer.activeTasks}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/85">Agent Efficiency Ratings</p>
                <div className="mt-2 space-y-2">
                  {overseer.ratings.length === 0 ? (
                    <p className="text-xs text-white/65">No agent logs found.</p>
                  ) : (
                    overseer.ratings.map((rating) => (
                      <p key={rating.agent} className="text-xs font-semibold text-white/85">
                        {rating.agent}: <span className="text-cyan-300">{rating.successScore}%</span>
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminSecurityWrapper>
  );
}