"use client";

import { formatEther } from "viem";
import { ritualChain } from "@/lib/ritual-chain";

/** Matches `ritual-app` `GasEstimateCard` + row layout (emerald / slate, zap icon, dry-run copy). */
function formatGasUnits(gas: bigint): string {
  const n = Number(gas);
  if (!Number.isFinite(n)) return gas.toString();
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

function trimFeeDisplay(ethDecimalString: string): string {
  const x = Number(ethDecimalString);
  if (!Number.isFinite(x) || x < 0) return ethDecimalString;
  if (x === 0) return "0";
  if (x < 1e-8) return "<0.00000001";
  if (x < 0.0001) return x.toFixed(8).replace(/\.?0+$/, "") || "0";
  return x.toPrecision(4).replace(/\.?0+$/, "") || "0";
}

function GasZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

export type MintGasEstimateCardProps = {
  /** When true, show skeleton rows like ritual-app. */
  pending: boolean;
  /** When estimate RPC/simulation failed. */
  estimateFailed: boolean;
  /** Populated when `pending` is false and estimate succeeded. */
  feeWei?: bigint;
  gasLimit?: bigint;
  /** Optional extra line under the inner row (mint-specific). */
  footnote?: string;
};

export function MintGasEstimateCard({ pending, estimateFailed, feeWei, gasLimit, footnote }: MintGasEstimateCardProps) {
  const sym = ritualChain.nativeCurrency.symbol;

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#070a0d] to-violet-950/25 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_40px_-12px_rgba(52,211,153,0.22)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_-4px_rgba(52,211,153,0.35)]">
          <GasZapIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/95">Gas estimate</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            Dry-run via RPC on Ritual (chain {ritualChain.id}) — gas and fee come from node simulation, not random
            placeholders. Your wallet sets the final max fee.
          </p>

          <div className="mt-3">
            <div className="rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 sm:px-4 sm:py-3">
              {pending ? (
                <div className="space-y-2">
                  <div className="h-6 w-36 max-w-full animate-pulse rounded-md bg-emerald-500/10" />
                  <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                </div>
              ) : estimateFailed || feeWei === undefined || gasLimit === undefined ? (
                <p className="text-[12px] leading-snug text-amber-200/95">
                  Couldn&apos;t run a simulation (RPC or network). You can still submit; the wallet shows the real
                  limit.
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-2xl font-semibold tabular-nums tracking-tight text-emerald-100">
                      ~{trimFeeDisplay(formatEther(feeWei))}
                    </span>
                    <span className="pb-0.5 font-mono text-[12px] font-medium text-emerald-400/90">{sym}</span>
                  </div>
                  <span className="pb-1 font-mono text-[11px] text-slate-500">≈ {formatGasUnits(gasLimit)} gas</span>
                </div>
              )}
            </div>
          </div>

          {footnote ? <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{footnote}</p> : null}
          <p className="mt-2 border-t border-white/[0.06] pt-2 text-[10px] leading-relaxed text-slate-600">
            Bigger on-chain images mean more data in the transaction, so gas tends to run higher than a short text mint.
          </p>
        </div>
      </div>
    </div>
  );
}
