import Link from 'next/link';
import AdminSecurityWrapper from '@/components/admin/AdminSecurityWrapper';
import ProfitRatios from '@/components/admin/ProfitRatios';
import StripeFeeCounter from '@/components/admin/StripeFeeCounter';
import { getServerSupabaseClient } from '../../../../manager/admin-auth';
import SignOutButton from '@/components/SignOutButton';

type FinancialLedgerRow = {
  gross_sales: number | null;
  supplier_cost: number | null;
  platform_fee: number | null;
  stripe_fees: number | null;
  shipping_costs: number | null;
  net_profit: number | null;
};

type OrderMetricsRow = {
  total_amount: number | null;
  shipping_cost: number | null;
};

function toNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function AdminFinancesPage() {
  const supabase = await getServerSupabaseClient();
  const ledgerRows: FinancialLedgerRow[] = [];
  const orderRows: OrderMetricsRow[] = [];

  if (supabase) {
    const [{ data: ledgerData }, { data: ordersData }] = await Promise.all([
      supabase
      .from('financial_ledger')
      .select('gross_sales,supplier_cost,platform_fee,stripe_fees,shipping_costs,net_profit')
      .order('created_at', { ascending: false })
      .limit(500),
      supabase.from('orders').select('total_amount,shipping_cost').order('created_at', { ascending: false }).limit(1000),
    ]);

    if (Array.isArray(ledgerData)) {
      ledgerRows.push(...(ledgerData as FinancialLedgerRow[]));
    }
    if (Array.isArray(ordersData)) {
      orderRows.push(...(ordersData as OrderMetricsRow[]));
    }
  }

  const grossRevenueCents = orderRows.reduce((sum, row) => sum + toNumber(row.total_amount), 0);
  const transportCostsCents = orderRows.reduce((sum, row) => sum + toNumber(row.shipping_cost), 0);
  const computedStripeFeesCents = orderRows.reduce((sum, row) => {
    const total = toNumber(row.total_amount);
    return sum + Math.round(total * 0.029) + 30;
  }, 0);

  const supplierCostCents = ledgerRows.reduce((sum, row) => sum + toNumber(row.supplier_cost), 0);
  const platformFeeCents = ledgerRows.reduce((sum, row) => sum + toNumber(row.platform_fee), 0);
  const ledgerStripeFeesCents = ledgerRows.reduce((sum, row) => sum + toNumber(row.stripe_fees), 0);
  const ledgerShippingCents = ledgerRows.reduce((sum, row) => sum + toNumber(row.shipping_costs), 0);
  const netProfitCents = ledgerRows.reduce((sum, row) => sum + toNumber(row.net_profit), 0);

  const stripeFeesCents = computedStripeFeesCents > 0 ? computedStripeFeesCents : ledgerStripeFeesCents;
  const shippingCostsCents = transportCostsCents > 0 ? transportCostsCents : ledgerShippingCents;
  const grossSalesCents = grossRevenueCents > 0 ? grossRevenueCents : ledgerRows.reduce((sum, row) => sum + toNumber(row.gross_sales), 0);

  const chartTotal = Math.max(1, supplierCostCents + shippingCostsCents + stripeFeesCents + netProfitCents);
  const productPct = (supplierCostCents / chartTotal) * 100;
  const shippingPct = (shippingCostsCents / chartTotal) * 100;
  const stripePct = (stripeFeesCents / chartTotal) * 100;
  const netPct = (netProfitCents / chartTotal) * 100;

  return (
    <AdminSecurityWrapper redirectTo="/account">
      <main className="relative z-10 min-h-screen overflow-hidden bg-[#020202] px-4 py-8 text-white md:px-8">
        
        {/* --- UGI STUDIOS CUSTOM BACKGROUND: 150% LAKE & PRIME-RANDOMIZED RIPPLES --- */}
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
            /* 6s Total Cycle: 5s active expansion, 1s dead air so cycles overlap perfectly */
            0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; border-width: 6px; }
            83.33% { transform: translate(-50%, -50%) scale(4); opacity: 0; border-width: 1px; }
            100% { transform: translate(-50%, -50%) scale(4); opacity: 0; border-width: 0px; }
          }
          @keyframes color-chaos {
            /* 8-Color sequence running independently of the expansion */
            0% { border-color: rgba(236, 72, 153, 0.9); }    /* Pink */
            12.5% { border-color: rgba(168, 85, 247, 0.9); } /* Purple */
            25% { border-color: rgba(59, 130, 246, 0.9); }   /* Blue */
            37.5% { border-color: rgba(6, 182, 212, 0.9); }  /* Cyan */
            50% { border-color: rgba(16, 185, 129, 0.9); }   /* Emerald */
            62.5% { border-color: rgba(234, 179, 8, 0.9); }  /* Yellow */
            75% { border-color: rgba(249, 115, 22, 0.9); }   /* Orange */
            87.5% { border-color: rgba(239, 68, 68, 0.9); }  /* Red */
            100% { border-color: rgba(236, 72, 153, 0.9); }  /* Pink */
          }
        `}} />
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden mix-blend-screen">
          
          {/* THE AURA: Exactly 150vw/150vh lake surface drifting behind the UI */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] blur-[120px] animate-[lake-drift_30s_ease-in-out_infinite]"
            style={{
              background: 'linear-gradient(90deg, rgba(2,2,2,1) 0%, rgba(236,72,153,0.2) 25%, rgba(59,130,246,0.2) 50%, rgba(16,185,129,0.2) 75%, rgba(2,2,2,1) 100%)',
              backgroundSize: '200% 200%'
            }}
          />

          {/* THE SPLASH ZONE: Slowly roams the screen so drops happen in random places */}
          <div className="absolute top-1/2 left-1/2 w-0 h-0 animate-[roam-splash-zone_40s_ease-in-out_infinite]">
            
             {/* RIPPLE 1: Fires at 0.0s. Color desync: 11s */}
            <div className="absolute top-0 left-0 w-[400px] h-[200px] rounded-[100%] border-solid" 
                 style={{ animation: 'ripple-expand 6s ease-out 0s infinite, color-chaos 11s linear 0s infinite' }} />
                 
             {/* RIPPLE 2: Fires at 0.8s. Color desync: 13s */}
            <div className="absolute top-0 left-0 w-[400px] h-[200px] rounded-[100%] border-solid" 
                 style={{ animation: 'ripple-expand 6s ease-out 0.8s infinite, color-chaos 13s linear 0s infinite' }} />
                 
             {/* RIPPLE 3: Fires at 1.6s. Color desync: 17s */}
            <div className="absolute top-0 left-0 w-[400px] h-[200px] rounded-[100%] border-solid" 
                 style={{ animation: 'ripple-expand 6s ease-out 1.6s infinite, color-chaos 17s linear 0s infinite' }} />

          </div>
        </div>
        {/* --- END BACKGROUND --- */}

        <div className="relative z-10 mx-auto max-w-6xl">
          <header className="mb-8 flex items-center justify-between border-b border-cyan-400/30 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Financial Analytics</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                Admin Finances
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="rounded-xl border border-cyan-400/30 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-300"
              >
                Back to Admin
              </Link>
              <SignOutButton
                className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-200 transition hover:border-red-400 hover:text-red-100 disabled:opacity-60"
              />
            </div>
          </header>

          <section className="grid gap-5 md:grid-cols-2">
            <ProfitRatios
              grossSalesCents={grossSalesCents}
              netProfitCents={netProfitCents}
              supplierCostCents={supplierCostCents}
              platformFeeCents={platformFeeCents}
            />
            <StripeFeeCounter stripeFeesCents={stripeFeesCents} transactionCount={orderRows.length} />
          </section>

          <section className="mt-6 rounded-2xl border border-cyan-400/30 bg-black/50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Ledger Totals</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                <p className="text-white/70">Gross sales</p>
                <p className="mt-1 text-xl font-black text-cyan-200">{formatCurrencyFromCents(grossSalesCents)}</p>
              </div>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                <p className="text-white/70">Platform fees</p>
                <p className="mt-1 text-xl font-black text-cyan-200">{formatCurrencyFromCents(platformFeeCents)}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                <p className="text-white/70">Stripe fees</p>
                <p className="mt-1 text-xl font-black text-emerald-200">{formatCurrencyFromCents(stripeFeesCents)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/5 p-3">
                <p className="text-white/70">Net profit</p>
                <p className="mt-1 text-xl font-black text-white">{formatCurrencyFromCents(netProfitCents)}</p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-cyan-400/30 bg-black/50 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              Executive Profit Margin Chart
            </p>
            <div className="mt-4 h-6 w-full overflow-hidden rounded-full border border-cyan-400/25 bg-black/40">
              <div className="flex h-full w-full">
                <div
                  className="h-full bg-cyan-500/80"
                  style={{ width: `${productPct}%` }}
                  title={`Product cost: ${formatCurrencyFromCents(supplierCostCents)} (${formatPercent(productPct)})`}
                />
                <div
                  className="h-full bg-amber-400/85"
                  style={{ width: `${shippingPct}%` }}
                  title={`Shipping: ${formatCurrencyFromCents(shippingCostsCents)} (${formatPercent(shippingPct)})`}
                />
                <div
                  className="h-full bg-emerald-400/85"
                  style={{ width: `${stripePct}%` }}
                  title={`Stripe fees: ${formatCurrencyFromCents(stripeFeesCents)} (${formatPercent(stripePct)})`}
                />
                <div
                  className="h-full bg-white/80"
                  style={{ width: `${netPct}%` }}
                  title={`Net profit: ${formatCurrencyFromCents(netProfitCents)} (${formatPercent(netPct)})`}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-xs uppercase tracking-[0.14em] text-white/85 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                Product Cost: {formatCurrencyFromCents(supplierCostCents)} ({formatPercent(productPct)})
              </div>
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                Shipping: {formatCurrencyFromCents(shippingCostsCents)} ({formatPercent(shippingPct)})
              </div>
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
                Stripe Fees: {formatCurrencyFromCents(stripeFeesCents)} ({formatPercent(stripePct)})
              </div>
              <div className="rounded-xl border border-white/30 bg-white/10 p-3">
                Net Profit: {formatCurrencyFromCents(netProfitCents)} ({formatPercent(netPct)})
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminSecurityWrapper>
  );
}