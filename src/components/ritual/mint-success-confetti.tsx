"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const COUNT = 42;

function pieceStyle(i: number): CSSProperties {
  const left = ((i * 17 + 11) % 94) + 3;
  const delay = ((i % 10) * 0.065).toFixed(3);
  const dx = ((i * 13) % 70) - 35;
  const rot = 360 + (i % 6) * 140;
  const colors = [
    "rgba(201, 162, 39, 0.92)",
    "rgba(167, 139, 250, 0.88)",
    "rgba(236, 234, 228, 0.9)",
    "rgba(201, 162, 39, 0.55)",
  ];
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    backgroundColor: colors[i % colors.length],
    ["--mint-dx" as string]: `${dx}px`,
    ["--mint-rot" as string]: `${rot}deg`,
  };
}

export function MintSuccessConfetti({ active }: { active: boolean }) {
  const [domReady, setDomReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setDomReady(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 3800);
    return () => window.clearTimeout(t);
  }, [active]);

  if (!domReady || typeof document === "undefined" || !visible) return null;

  return createPortal(
    <div className="mint-confetti-layer" aria-hidden>
      {Array.from({ length: COUNT }, (_, i) => (
        <span key={i} className="mint-confetti-piece" style={pieceStyle(i)} />
      ))}
    </div>,
    document.body,
  );
}
