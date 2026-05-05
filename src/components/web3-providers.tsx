"use client";

import { ConnectWalletGateProvider } from "@/components/connect-wallet-gate";
import { wagmiConfig } from "@/lib/wagmi-config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";

export function Web3Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectWalletGateProvider>{children}</ConnectWalletGateProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
