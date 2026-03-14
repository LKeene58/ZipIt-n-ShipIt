'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import BlueChromeWordmark from '../../components/BlueChromeWordmark';

type PurchaseOrderItem = {
  name?: string;
  quantity?: number;
  unit_amount?: number;
  line_total?: number;
  image_url?: string;
};

type PurchaseOrderPayload = {
  purchase_order_id?: string;
  stripe_session_id?: string;
  created_at?: string;
  items?: PurchaseOrderItem[];
  totals?: {
    gross_sales_cents?: number;
  };
};

type PurchaseOrderRow = {
  id?: number | string;
  stripe_id?: string;
  status?: string;
  created_at?: string;
  purchase_order_json?: PurchaseOrderPayload | string | null;
};

type RenderOrder = {
  id: string;
  createdAt: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  imageUrl: string;
  itemName: string;
};

const STATUS_META: Record<string, { label: string; progress: number; message: string }> = {
  paid: {
    label: 'Processing',
    progress: 20,
    message: 'Agent 2 is currently verifying stock with our supplier...',
  },
  purchase_order_sent: {
    label: 'Processing',
    progress: 35,
    message: 'Agent 2 has transmitted this order to fulfillment partners.',
  },
  processing: {
    label: 'Processing',
    progress: 45,
    message: 'Agent 2 is currently verifying stock with our supplier...',
  },
  in_transit: {
    label: 'In Transit',
    progress: 75,
    message: 'Agent 2 has confirmed carrier handoff and live tracking sync.',
  },
  delivered: {
    label: 'Delivered',
    progress: 100,
    message: 'Agent 2 confirms successful delivery at destination.',
  },
};

function parsePurchasePayload(value: PurchaseOrderRow['purchase_order_json']): PurchaseOrderPayload {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value) as PurchaseOrderPayload;
  } catch {
    return {};
  }
}

function currencyFromCents(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function normalizeStatus(raw: string | undefined) {
  return (raw ?? '').trim().toLowerCase().replaceAll(' ', '_');
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<RenderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        setError('Missing Supabase public env vars.');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          select: 'id,stripe_id,status,created_at,purchase_order_json',
          order: 'created_at.desc',
          limit: '30',
        });

        const response = await fetch(`${supabaseUrl}/rest/v1/purchase_orders?${params.toString()}`, {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed loading orders (${response.status})`);
        }

        const rows = (await response.json()) as PurchaseOrderRow[];
        const mapped = rows.map((row): RenderOrder => {
          const payload = parsePurchasePayload(row.purchase_order_json);
          const firstItem = payload.items?.[0] ?? {};
          const orderId =
            payload.purchase_order_id ??
            payload.stripe_session_id ??
            row.stripe_id ??
            (row.id ? String(row.id) : 'Unknown');

          const fallbackLineTotal =
            Number(firstItem.line_total ?? 0) > 0
              ? Number(firstItem.line_total)
              : Number(firstItem.unit_amount ?? 0) * Number(firstItem.quantity ?? 1);

          const totalCents =
            Number(payload.totals?.gross_sales_cents ?? 0) > 0
              ? Number(payload.totals?.gross_sales_cents)
              : fallbackLineTotal;

          const imageCandidate =
            typeof firstItem.image_url === 'string' && firstItem.image_url.trim().length > 0
              ? firstItem.image_url.trim()
              : '/file.svg';

          const imageUrl = imageCandidate.startsWith('/') ? imageCandidate : `/${imageCandidate}`;

          return {
            id: row.id ? String(row.id) : orderId,
            createdAt: row.created_at ?? payload.created_at ?? new Date().toISOString(),
            orderNumber: orderId,
            status: normalizeStatus(row.status),
            totalCents: Number.isFinite(totalCents) ? totalCents : 0,
            imageUrl,
            itemName: firstItem.name?.trim() || 'Order Item',
          };
        });

        setOrders(mapped);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-cyan-500/20 bg-black/25 p-8 text-center backdrop-blur-md">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400/80">Loading Orders...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-black/25 p-8 text-center backdrop-blur-md">
          <p className="text-sm uppercase tracking-[0.2em] text-red-300">{error}</p>
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div className="rounded-2xl border border-cyan-500/20 bg-black/25 p-8 text-center backdrop-blur-md">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/85">No orders found yet.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        {orders.map((order) => {
          const meta = STATUS_META[order.status] ?? {
            label: 'Processing',
            progress: 25,
            message: 'Agent 2 is currently reviewing this order for next-step routing.',
          };

          return (
            <article
              key={order.id}
              className="rounded-2xl border border-cyan-500/20 bg-black/25 p-4 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,255,0.07)] md:p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-cyan-500/20 bg-black/40">
                  <Image src={order.imageUrl} alt={order.itemName} fill className="object-cover" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white md:text-base">
                      Order #{order.orderNumber}
                    </h2>
                    <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                      {meta.label}
                    </span>
                  </div>

                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/70">{order.itemName}</p>
                  <p className="mt-1 text-xl font-black text-cyan-300">{currencyFromCents(order.totalCents)}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/45">
                    Placed {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-cyan-950/40">
                  <div
                    className="h-full rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(0,255,255,0.8)] transition-all duration-700"
                    style={{ width: `${meta.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200/95">
                  Logistics Status: {meta.message}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    );
  }, [error, loading, orders]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020202] px-4 py-8 text-white md:px-8">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex justify-center items-center">
        <div className="absolute top-[-5%] left-[-5%] w-[65%] h-[65%] bg-emerald-500/30 rounded-full blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
        <div
          className="absolute top-[10%] right-[-10%] w-[55%] h-[55%] bg-red-600/30 rounded-full blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-[-5%] left-[15%] w-[75%] h-[75%] bg-blue-600/35 rounded-full blur-[140px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-5xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="transform scale-x-[2.5] scale-y-[1.9] md:scale-x-[3.1] md:scale-y-[2.3]">
            <BlueChromeWordmark className="relative z-20" />
          </div>
          <div className="mt-3 h-[2px] w-64 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_30px_rgba(0,242,255,0.65)] md:w-[620px]" />
          <h1 className="mt-6 text-2xl font-black uppercase tracking-[0.24em] md:text-3xl">Your Orders</h1>
        </header>

        {content}
      </section>
    </main>
  );
}
