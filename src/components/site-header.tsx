import { SiteHeaderBrand } from "@/components/site-header-brand";
import { WalletHeaderControls } from "@/components/wallet-header-controls";

export function SiteHeader() {
  return (
    <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-10">
      <SiteHeaderBrand />
      <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
        <WalletHeaderControls />
        <span className="shrink-0 font-mono text-sm text-muted/80 md:text-base">v1 · generator</span>
      </div>
    </header>
  );
}
