"use client";

import {
  appendStoredMint,
  buildDataUriTokenUriFromCardCanvas,
  loadStoredMints,
  type StoredMintEntry,
} from "@/lib/ritual-pfp-metadata";
import { ritualPfpAbi } from "@/lib/ritual-pfp-abi";
import { getRitualExplorerTxUrl, ritualChain } from "@/lib/ritual-chain";
import { cardExportErrorMessageForUser, mintErrorMessageForUser } from "@/lib/user-facing-errors";
import { wagmiConfig } from "@/lib/wagmi-config";
import { MintGasEstimateCard } from "@/components/ritual/mint-gas-estimate-card";
import { MintSuccessConfetti } from "@/components/ritual/mint-success-confetti";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { decodeEventLog, formatGwei, isAddress, type Hash, type Log, type PublicClient } from "viem";
import { useAccount, useBalance, usePublicClient, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";

type MintPhase = "idle" | "preparing" | "confirming" | "success" | "error";

type MintGasUi =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; gas: bigint; feeWei: bigint }
  | { kind: "failed" };

function contractAddressOrNull(): `0x${string}` | null {
  const raw = process.env.NEXT_PUBLIC_RITUAL_PFP_ADDRESS?.trim();
  if (!raw || !isAddress(raw)) return null;
  return raw;
}

function parseMintedTokenId(logs: readonly Log[], contract: `0x${string}`): bigint | null {
  const c = contract.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== c) continue;
    try {
      const d = decodeEventLog({
        abi: ritualPfpAbi,
        data: log.data,
        topics: log.topics,
        strict: false,
      });
      if (d.eventName === "Minted" && d.args && typeof d.args === "object" && "tokenId" in d.args) {
        const tid = (d.args as { tokenId?: bigint }).tokenId;
        if (typeof tid === "bigint") return tid;
      }
    } catch {
      /* not this log */
    }
  }
  return null;
}

const GAS_PREFETCH_DEBOUNCE_MS = 450;

async function estimateMintGasFromTokenUri(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  account: `0x${string}`,
  tokenUri: string,
): Promise<{ gas: bigint; feeWei: bigint }> {
  const gas = await publicClient.estimateContractGas({
    address: contractAddress,
    abi: ritualPfpAbi,
    functionName: "mint",
    args: [tokenUri],
    account,
  });
  let maxFeePerGas: bigint;
  try {
    const fees = await publicClient.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas ?? fees.gasPrice ?? BigInt(0);
  } catch {
    maxFeePerGas = BigInt(0);
  }
  if (maxFeePerGas === BigInt(0)) {
    maxFeePerGas = await publicClient.getGasPrice();
  }
  return { gas, feeWei: gas * maxFeePerGas };
}

export function MintPfpSection({
  canvasRef,
  canvasError,
  cardRenderEpoch,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasError: string | null;
  cardRenderEpoch: number;
}) {
  const contractAddress = useMemo(() => contractAddressOrNull(), []);
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: ritualChain.id });
  const { writeContractAsync } = useWriteContract();

  const onRitual = Boolean(isConnected && address && chainId === ritualChain.id);

  const {
    data: balance,
    isFetched: balanceFetched,
    isError: balanceError,
  } = useBalance({
    address,
    chainId: ritualChain.id,
    query: { enabled: onRitual },
  });

  const definitelyNoGas =
    onRitual && balanceFetched && !balanceError && balance !== undefined && balance.value === BigInt(0);

  const [phase, setPhase] = useState<MintPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [recentMints, setRecentMints] = useState<StoredMintEntry[]>([]);
  const [gasUi, setGasUi] = useState<MintGasUi>({ kind: "none" });

  const refreshRecentMints = useCallback(() => {
    setRecentMints(loadStoredMints().slice(-8).reverse());
  }, []);

  useEffect(() => {
    refreshRecentMints();
  }, [refreshRecentMints]);

  useEffect(() => {
    if (canvasError) setGasUi({ kind: "none" });
  }, [canvasError]);

  useEffect(() => {
    if (!onRitual) setGasUi({ kind: "none" });
  }, [onRitual]);

  const busy = phase === "preparing" || phase === "confirming";

  const canMint = Boolean(contractAddress) && !canvasError && onRitual && !definitelyNoGas && !busy;

  const gasFootnote =
    gasUi.kind === "ready" && gasUi.gas > BigInt(0)
      ? `Typical max ~${formatGwei(gasUi.feeWei / gasUi.gas)} per gas (fee ÷ gas, rough cap).`
      : undefined;

  useEffect(() => {
    if (phase === "success") return;
    if (cardRenderEpoch < 1) return;
    if (!contractAddress || !onRitual || !address || !publicClient || canvasError || busy) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setGasUi({ kind: "loading" });
        try {
          const tokenUri = await buildDataUriTokenUriFromCardCanvas(canvas);
          if (cancelled) return;
          const { gas, feeWei } = await estimateMintGasFromTokenUri(
            publicClient,
            contractAddress,
            address,
            tokenUri,
          );
          if (cancelled) return;
          setGasUi({ kind: "ready", gas, feeWei });
        } catch {
          if (!cancelled) setGasUi({ kind: "failed" });
        }
      })();
    }, GAS_PREFETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    address,
    busy,
    canvasError,
    canvasRef,
    cardRenderEpoch,
    contractAddress,
    onRitual,
    phase,
    publicClient,
  ]);

  const onMint = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !contractAddress || !address) return;

    setPhase("preparing");
    setStatusMessage("Encoding card and metadata…");
    setTxHash(null);
    setMintedTokenId(null);

    let tokenUri: string;
    try {
      tokenUri = await buildDataUriTokenUriFromCardCanvas(canvas);
    } catch (e) {
      setPhase("error");
      setStatusMessage(cardExportErrorMessageForUser(e));
      return;
    }

    setPhase("confirming");
    setStatusMessage("Estimating network fee…");

    if (publicClient) {
      setGasUi({ kind: "loading" });
      try {
        const { gas, feeWei } = await estimateMintGasFromTokenUri(publicClient, contractAddress, address, tokenUri);
        setGasUi({ kind: "ready", gas, feeWei });
        setStatusMessage("Confirm in your wallet — mint is Free; you only pay gas.");
      } catch {
        setGasUi({ kind: "failed" });
        setStatusMessage("Could not estimate gas; confirm in your wallet and rely on its simulation.");
      }
    } else {
      setStatusMessage("Confirm in your wallet — mint is Free; you only pay gas.");
    }

    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ritualPfpAbi,
        functionName: "mint",
        args: [tokenUri],
        chainId: ritualChain.id,
      });

      setTxHash(hash);
      setStatusMessage("Waiting for confirmation…");

      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: ritualChain.id,
      });

      if (receipt.status !== "success") {
        setPhase("error");
        setStatusMessage("The transaction did not succeed on-chain. Your balance should be unchanged.");
        return;
      }

      const tokenId = parseMintedTokenId(receipt.logs, contractAddress);
      if (tokenId === null) {
        setPhase("error");
        setStatusMessage(
          "The mint may have gone through, but this page could not read your token number. Check the transaction on the explorer.",
        );
        return;
      }

      const idStr = tokenId.toString();
      setMintedTokenId(idStr);
      appendStoredMint({ tokenId: idStr, txHash: hash, at: Date.now() });
      refreshRecentMints();
      setGasUi({ kind: "none" });
      setPhase("success");
      setStatusMessage(null);
    } catch (e) {
      setPhase("error");
      setStatusMessage(mintErrorMessageForUser(e));
    }
  }, [address, canvasRef, contractAddress, publicClient, refreshRecentMints, writeContractAsync]);

  if (!contractAddress) {
    return (
      <div className="space-y-3 rounded-sm border border-white/[0.08] bg-black/30 p-4 text-left text-sm text-muted">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/90">
          On-chain mint is not configured
        </p>
        <p className="text-[13px] leading-relaxed text-foreground/88">
          Add the deployed contract line to <code className="font-mono text-[11px] text-foreground/95">.env.local</code>{" "}
          at the project root:{" "}
          <code className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[11px] text-foreground/95">
            NEXT_PUBLIC_RITUAL_PFP_ADDRESS=0x…
          </code>{" "}
          (from <code className="rounded bg-white/[0.07] px-1 font-mono text-[11px]">npm run deploy:pfp</code> output),
          then save and restart so the new variable loads.
        </p>
        <p className="text-[12px] leading-relaxed text-muted">
          Deploy uses <code className="font-mono text-[11px] text-foreground/80">PRIVATE_KEY</code> in{" "}
          <code className="font-mono text-[11px]">.env.local</code> with RITUAL for gas on Ritual.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-sm border border-border bg-surface/60 p-5 md:p-6">
      <MintSuccessConfetti active={phase === "success"} />

      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/88">On-chain mint</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Mint this forged card as an ERC-721 on Ritual. <strong className="text-foreground/90">Mint is Free</strong> —
        you only pay network gas in RITUAL. Metadata is embedded as a data URI in the token (no IPFS).
      </p>

      {!isConnected ? (
        <p className="mt-3 font-mono text-[11px] text-amber-200/88">Connect your wallet in the header to mint.</p>
      ) : null}
      {isConnected && chainId !== ritualChain.id ? (
        <p className="mt-3 font-mono text-[11px] text-amber-200/88">
          Switch your wallet to <strong className="text-foreground/90">Ritual (chain 1979)</strong> to mint.
        </p>
      ) : null}
      {onRitual && balanceFetched && balanceError ? (
        <p className="mt-3 font-mono text-[11px] text-amber-200/88">
          Could not load balance (RPC). You can still try to mint — ensure you have RITUAL for gas.
        </p>
      ) : null}
      {definitelyNoGas ? (
        <p className="mt-3 font-mono text-[11px] text-amber-200/88">
          No RITUAL detected for gas — top up from the faucet, then mint.
        </p>
      ) : null}
      {canvasError ? (
        <p className="mt-3 font-mono text-[11px] text-red-200/88">Fix the card render error before minting.</p>
      ) : null}

      {gasUi.kind !== "none" ? (
        <MintGasEstimateCard
          pending={gasUi.kind === "loading"}
          estimateFailed={gasUi.kind === "failed"}
          feeWei={gasUi.kind === "ready" ? gasUi.feeWei : undefined}
          gasLimit={gasUi.kind === "ready" ? gasUi.gas : undefined}
          footnote={gasFootnote}
        />
      ) : null}

      {statusMessage ? (
        <p
          className={`mt-4 font-mono text-[11px] leading-relaxed ${phase === "error" ? "text-red-200/92" : "text-muted"}`}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      {txHash && phase !== "success" ? (
        <p className="mt-2 break-all font-mono text-[10px] text-muted">
          Tx:{" "}
          <a
            href={getRitualExplorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            {txHash}
          </a>
        </p>
      ) : null}

      {phase === "success" && mintedTokenId ? (
        <div className="mt-4 space-y-2 rounded-sm border border-emerald-500/35 bg-emerald-950/25 p-3 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)]">
          <p className="font-mono text-[12px] font-medium text-emerald-200/95">Minted successfully · token #{mintedTokenId}</p>
          {txHash ? (
            <a
              href={getRitualExplorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-mono text-[11px] text-accent underline-offset-2 hover:underline"
            >
              View on Explorer
            </a>
          ) : null}
          <p className="text-[11px] leading-relaxed text-muted">
            The preview above matches the artwork stored in your token URI (on-chain data).
          </p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canMint}
        onClick={() => void onMint()}
        className="mt-5 min-h-11 w-full rounded-sm border border-accent/50 bg-accent/10 px-6 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {busy ? "Minting…" : "Mint PFP"}
      </button>

      {recentMints.length > 0 ? (
        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Saved mints (this browser)
          </p>
          <ul className="mt-2 space-y-1.5 font-mono text-[10px] text-muted">
            {recentMints.map((m) => (
              <li key={`${m.txHash}-${m.tokenId}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-foreground/85">#{m.tokenId}</span>
                <a
                  href={getRitualExplorerTxUrl(m.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  view tx
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
