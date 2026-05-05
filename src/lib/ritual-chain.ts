import { defineChain } from "viem";

const defaultRpc = "https://rpc.ritualfoundation.org";

/** Public RPC for transports (overridable via NEXT_PUBLIC_RITUAL_RPC_URL at build time). */
export function getRitualRpcUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_RITUAL_RPC_URL
      ? process.env.NEXT_PUBLIC_RITUAL_RPC_URL.trim()
      : "";
  return fromEnv || defaultRpc;
}

export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: { decimals: 18, name: "RITUAL", symbol: "RITUAL" },
  rpcUrls: {
    default: { http: [getRitualRpcUrl()] },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
});

export function getRitualExplorerTxUrl(txHash: string): string {
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_RITUAL_EXPLORER_URL?.replace(/\/$/, "")) ||
    ritualChain.blockExplorers?.default.url ||
    "https://explorer.ritualfoundation.org";
  return `${base}/tx/${txHash}`;
}
