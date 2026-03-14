type StripeFeeCounterProps = {
  stripeFeesCents: number;
  transactionCount: number;
};

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function StripeFeeCounter({
  stripeFeesCents,
  transactionCount,
}: StripeFeeCounterProps) {
  return (
    <article className="rounded-2xl border border-emerald-400/35 bg-black/50 p-5 shadow-[0_0_28px_rgba(16,185,129,0.2)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Stripe Fee Counter</p>
      <p className="mt-4 text-4xl font-black text-emerald-200">{formatCurrencyFromCents(stripeFeesCents)}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-emerald-300/85">
        Tracked transactions: {transactionCount}
      </p>
    </article>
  );
}
