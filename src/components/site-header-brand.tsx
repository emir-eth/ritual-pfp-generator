"use client";

import { RitualAnimatedLogo } from "@/components/shell/RitualAnimatedLogo";
import Link from "next/link";

export function SiteHeaderBrand() {
  return (
    <Link
      href="/"
      className="group flex shrink-0 items-center gap-3.5 transition-[filter] duration-200 md:gap-5"
    >
      <div className="shrink-0">
        <RitualAnimatedLogo context="header" />
      </div>
      <span className="ritual-mark-mono font-mono text-4xl font-semibold uppercase tracking-[0.26em] md:text-5xl lg:text-[3.1rem] lg:tracking-[0.28em]">
        RITUAL
      </span>
    </Link>
  );
}
