type ProfitRatiosProps = {
  grossSalesCents: number;
  netProfitCents: number;
  supplierCostCents: number;
  platformFeeCents: number;
};

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function ProfitRatios({
  grossSalesCents,
  netProfitCents,
  supplierCostCents,
  platformFeeCents,
}: ProfitRatiosProps) {
  const gross = grossSalesCents > 0 ? grossSalesCents : 1;
  const netMargin = (netProfitCents / gross) * 100;
  const supplierRatio = (supplierCostCents / gross) * 100;
  const platformRatio = (platformFeeCents / gross) * 100;

  return (
    <article className="rounded-2xl border border-cyan-400/30 bg-black/50 p-5 shadow-[0_0_28px_rgba(56,189,248,0.18)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Profit Ratios</p>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
          <span className="text-white/80">Net margin</span>
          <span className="font-black text-cyan-200">{formatPercent(netMargin)}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
          <span className="text-white/80">Supplier cost ratio</span>
          <span className="font-black text-cyan-200">{formatPercent(supplierRatio)}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
          <span className="text-white/80">Platform fee ratio</span>
          <span className="font-black text-cyan-200">{formatPercent(platformRatio)}</span>
        </div>
      </div>
    </article>
  );
}
