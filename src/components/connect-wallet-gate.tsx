"use client";

import { SafetyNoticeDialog } from "@/components/safety-notice-dialog";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type GateFn = (proceed: () => void) => void;

const ConnectWalletGateContext = createContext<GateFn | null>(null);

/**
 * Connect Wallet öncesi güvenlik popup’ı; kullanıcı "I understand" deyince `proceed` çalışır.
 */
export function ConnectWalletGateProvider({ children }: { children: ReactNode }) {
  const [safetyOpen, setSafetyOpen] = useState(false);
  const connectAfterSafetyRef = useRef<(() => void) | null>(null);

  const gateConnectWallet = useCallback((proceed: () => void) => {
    connectAfterSafetyRef.current = proceed;
    setSafetyOpen(true);
  }, []);

  const dismissSafetyNotice = useCallback(() => {
    setSafetyOpen(false);
    const run = connectAfterSafetyRef.current;
    connectAfterSafetyRef.current = null;
    if (run) {
      queueMicrotask(() => {
        run();
      });
    }
  }, []);

  return (
    <ConnectWalletGateContext.Provider value={gateConnectWallet}>
      <SafetyNoticeDialog open={safetyOpen} onDismiss={dismissSafetyNotice} />
      {children}
    </ConnectWalletGateContext.Provider>
  );
}

export function useConnectWalletGate(): GateFn {
  const ctx = useContext(ConnectWalletGateContext);
  return ctx ?? ((proceed: () => void) => proceed());
}
