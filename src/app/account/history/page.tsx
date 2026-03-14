import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSupabaseClient } from '../../../../manager/admin-auth';

type OrderHistoryRow = {
  id: string;
  created_at: string | null;
  product_details: Array<{ name?: string; quantity?: number }> | null;
  total_amount: number | null;
  shipping_status: string | null;
};

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default async function AccountHistoryPage() {
  const supabase = await getServerSupabaseClient();
  if (!supabase) redirect('/login');

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('orders')
    .select('id,created_at,product_details,total_amount,shipping_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const orders = (data ?? []) as OrderHistoryRow[];

  return (
    <main className="relative z-10 min-h-screen bg-[#020202] px-4 py-8 text-white md:px-8">
      <section className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between border-b border-cyan-400/25 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">Account</p>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-[0.15em] text-white">Order History</h1>
          </div>
          <Link
            href="/account"
            className="rounded-xl border border-cyan-400/30 bg-black/40 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-cyan-200"
          >
            Back to Account
          </Link>
        </header>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-cyan-400/25 bg-black/40 p-6 text-sm text-white/75">
            No orders found for your account yet.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = Array.isArray(order.product_details) ? order.product_details : [];
              const itemSummary =
                items.length === 0
                  ? 'No item details recorded'
                  : items
                      .slice(0, 3)
                      .map((item) => `${item.name ?? 'Item'} x${item.quantity ?? 1}`)
                      .join(', ');

              return (
                <article key={order.id} className="rounded-2xl border border-cyan-400/25 bg-black/40 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-cyan-300/75">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'Unknown date'}
                      </p>
                      <p className="mt-2 text-sm text-white/90">{itemSummary}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-black text-cyan-200">
                        {formatCurrencyFromCents(Number(order.total_amount ?? 0))}
                      </p>
                      <button
                        type="button"
                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-200"
                      >
                        Track Order
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.15em] text-white/60">
                    Shipping Status: {order.shipping_status ?? 'pending'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
