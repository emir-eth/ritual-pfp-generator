"use client";

import { RitualAnimatedLogo } from "@/components/shell/RitualAnimatedLogo";
import { useCallback, useEffect, useRef, useState, type TransitionEvent } from "react";

const STORAGE_KEY = "ritual_pfp_preloader_done_v1";
const HARD_MAX_MS = 4500;

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function readSkip(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * On `/`, drop the skip flag so the splash can run again on reload/back; plain `navigate`
 * (first open, in-app history) does not clear so a completed splash can survive React Strict
 * Mode’s dev remount without replaying the full sequence twice.
 */
function clearSkipOnHomeReload(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path !== "/" && path !== "") return;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const shouldReset = !nav || nav.type === "reload" || nav.type === "back_forward";
    if (!shouldReset) return;
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type RitualPreloaderProps = {
  /** Fires once the splash has fully finished (after exit animation or skip). */
  onExitComplete?: () => void;
};

export function RitualPreloader({ onExitComplete }: RitualPreloaderProps) {
  const [mode, setMode] = useState<"boot" | "exit" | "off">("boot");
  const exitFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExitCompleteRef = useRef(onExitComplete);
  onExitCompleteRef.current = onExitComplete;

  /** Increments each main effect run so stale timeouts / Strict remounts cannot double-finish. */
  const runGenerationRef = useRef(0);
  /** Prevents double `finishExit` from exit transition + fallback timeout (same mount). */
  const finishCommittedRef = useRef(false);

  const finishExit = useCallback(() => {
    if (finishCommittedRef.current) return;
    finishCommittedRef.current = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode / blocked */
    }
    setMode("off");
    requestAnimationFrame(() => {
      onExitCompleteRef.current?.();
    });
  }, []);

  useEffect(() => {
    const myGen = ++runGenerationRef.current;
    let cancelled = false;
    let finishLocked = false;

    const finishExitOnce = () => {
      if (cancelled || finishLocked || runGenerationRef.current !== myGen) return;
      finishLocked = true;
      finishExit();
    };

    const hardCap = window.setTimeout(() => {
      finishExitOnce();
    }, HARD_MAX_MS);

    const run = async () => {
      clearSkipOnHomeReload();

      if (readSkip()) {
        window.clearTimeout(hardCap);
        if (!cancelled && runGenerationRef.current === myGen) finishExitOnce();
        return;
      }

      const reduce =
        typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const visibleMs = reduce ? 800 : 2200;

      await waitForPaint();
      if (cancelled || runGenerationRef.current !== myGen || readSkip()) return;
      await new Promise((r) => window.setTimeout(r, visibleMs));
      if (cancelled || runGenerationRef.current !== myGen || readSkip()) return;

      window.clearTimeout(hardCap);
      if (!cancelled && runGenerationRef.current === myGen) setMode("exit");
    };

    void run();

    return () => {
      cancelled = true;
      window.clearTimeout(hardCap);
      if (exitFallbackRef.current) clearTimeout(exitFallbackRef.current);
    };
  }, [finishExit]);

  useEffect(() => {
    if (mode === "off") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "exit") return;
    exitFallbackRef.current = setTimeout(() => finishExit(), 550);
    return () => {
      if (exitFallbackRef.current) clearTimeout(exitFallbackRef.current);
    };
  }, [mode, finishExit]);

  const onOverlayTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (mode !== "exit" || e.propertyName !== "opacity") return;
    if (exitFallbackRef.current) {
      clearTimeout(exitFallbackRef.current);
      exitFallbackRef.current = null;
    }
    finishExit();
  };

  if (mode === "off") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#05050a] transition-[opacity,visibility] duration-[480ms] ease-out motion-reduce:duration-150 ${
        mode === "exit" ? "pointer-events-none invisible opacity-0" : "visible opacity-100"
      }`}
      onTransitionEnd={onOverlayTransitionEnd}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-15%,rgba(124,58,237,0.2),transparent_55%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 landing-vignette opacity-80" aria-hidden />

      <div
        className={`relative flex flex-col items-center px-6 transition-[transform,opacity] duration-[480ms] ease-out motion-reduce:duration-150 ${
          mode === "exit" ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <RitualAnimatedLogo context="preloader" />
        <p className="mt-6 text-center font-display text-lg font-medium tracking-wide text-slate-300 sm:text-xl">
          Ritual Identity Generator
        </p>
        <div
          className="mt-8 h-[2px] w-[min(14rem,70vw)] overflow-hidden rounded-full bg-white/[0.06]"
          aria-hidden
        >
          <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-violet-400/90 to-transparent motion-reduce:animate-none animate-preloader-bar" />
        </div>
      </div>
    </div>
  );
}
