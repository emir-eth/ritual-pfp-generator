"use client";

import { useConnectWalletGate } from "@/components/connect-wallet-gate";
import { ritualChain } from "@/lib/ritual-chain";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";

function shortAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletHeaderControls() {
  const [mounted, setMounted] = useState(false);
  const gateConnectWallet = useConnectWalletGate();
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();

  const { data: nativeBal, isLoading: balLoading } = useBalance({
    address,
    chainId: ritualChain.id,
    query: { enabled: Boolean(isConnected && address) },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-[7.5rem] rounded-sm border border-white/[0.08] bg-white/[0.04]" aria-hidden />
      </div>
    );
  }

  const onConnect = () => {
    gateConnectWallet(() => {
      connect({ connector: injected() });
    });
  };

  const wrongNetwork = isConnected && chainId !== undefined && chainId !== ritualChain.id;

  const ritualBalanceLabel = (() => {
    if (!isConnected || !address) return null;
    if (wrongNetwork) return "—";
    if (balLoading) return "…";
    if (!nativeBal) return "—";
    const n = Number(formatEther(nativeBal.value));
    const shown = n >= 1 ? n.toFixed(4) : n.toFixed(6);
    return `${shown} ${nativeBal.symbol}`;
  })();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
      {isConnected && address ? (
        <>
          <span
            className="rounded-sm border border-accent/30 bg-accent/[0.08] px-2.5 py-1.5 font-mono text-[10px] tabular-nums tracking-wide text-accent sm:text-[11px]"
            title={wrongNetwork ? "Switch to Ritual to see RITUAL balance" : "RITUAL balance on Ritual (chain 1979)"}
          >
            {ritualBalanceLabel}
          </span>
          <span
            className="max-w-[120px] truncate font-mono text-[11px] text-foreground/90 sm:max-w-[180px]"
            title={address}
          >
            {shortAddress(address)}
          </span>
          <span
            className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
              wrongNetwork
                ? "border-amber-500/45 bg-amber-950/35 text-amber-200/95"
                : "border-emerald-500/35 bg-emerald-950/25 text-emerald-200/90"
            }`}
          >
            {wrongNetwork ? "Wrong network" : "Ritual"}
          </span>
          {wrongNetwork ? (
            <button
              type="button"
              disabled={switchPending}
              onClick={() => switchChain({ chainId: ritualChain.id })}
              className="min-h-9 rounded-sm border border-accent/45 bg-accent/10 px-3 font-mono text-[11px] text-accent transition hover:bg-accent/20 disabled:opacity-50"
            >
              {switchPending ? "Switching…" : "Switch to Ritual"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => disconnect()}
            className="min-h-9 rounded-sm border border-white/15 px-3 font-mono text-[11px] text-muted transition hover:border-white/30 hover:text-foreground"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={connectPending}
          onClick={onConnect}
          className="min-h-9 rounded-sm border border-accent/45 bg-accent/10 px-4 font-mono text-[11px] font-medium tracking-wide text-accent transition hover:bg-accent/20 disabled:opacity-50"
        >
          {connectPending ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
