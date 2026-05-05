import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { getRitualRpcUrl, ritualChain } from "@/lib/ritual-chain";

export const wagmiConfig = createConfig({
  chains: [ritualChain],
  connectors: [injected()],
  transports: {
    [ritualChain.id]: http(getRitualRpcUrl()),
  },
  ssr: true,
});
