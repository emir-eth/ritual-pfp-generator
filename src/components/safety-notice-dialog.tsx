"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  onDismiss: () => void;
};

/** Wallet güvenlik uyarısı — site accent / surface temasına uyumlu. */
export function SafetyNoticeDialog({ open, onDismiss }: Props) {
  const titleId = useId();
  const descId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Dismiss overlay"
        className="absolute inset-0 bg-background/88 backdrop-blur-[5px]"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-sm border border-border bg-surface/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_80px_-24px_rgba(0,0,0,0.65),0_0_48px_-12px_rgba(201,162,39,0.12)]"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/55 to-transparent"
          aria-hidden
        />
        <div className="relative px-5 py-6 sm:px-7 sm:py-8">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/90">Safety</p>
          <h2
            id={titleId}
            className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]"
          >
            Before you connect
          </h2>
          <div id={descId} className="mt-5 space-y-4 text-[14px] leading-relaxed text-muted sm:text-[15px]">
            <p>
              This app runs against the <strong className="font-medium text-foreground/95">Ritual testnet</strong>.
              Treat it as experimental software — bugs, rough edges, and changing behaviour are expected.
            </p>
            <p>
              <strong className="font-medium text-foreground">
                Create a brand-new wallet and use only that wallet here.
              </strong>{" "}
              Do <strong className="text-foreground">not</strong> connect the wallet you already use for savings,
              trading, or anything important. Fund your <strong className="text-foreground">new</strong> wallet with test
              tokens from the faucet only — this app is for that fresh test wallet, nothing else.
            </p>
            <div className="rounded-sm border border-accent/25 bg-accent/[0.07] px-4 py-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent/95">
                Recommended
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">
                Use <strong className="text-accent">MetaMask</strong> for the most reliable experience with this app and
                chain. Other wallets may fail to connect, show unclear errors, or lack full support — compatibility is
                not guaranteed.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={closeBtnRef}
              type="button"
              className="inline-flex w-full min-h-11 items-center justify-center rounded-sm border border-accent/50 bg-accent/12 px-4 py-2.5 text-sm font-medium tracking-wide text-accent transition hover:border-accent hover:bg-accent/22 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:min-w-[11rem]"
              onClick={onDismiss}
            >
              I understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
