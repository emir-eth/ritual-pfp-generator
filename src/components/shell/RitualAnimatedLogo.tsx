export type RitualAnimatedLogoContext = "sidebar" | "preloader" | "header";

type RitualAnimatedLogoProps = {
  context?: RitualAnimatedLogoContext;
  className?: string;
};

const SIZE_PX: Record<RitualAnimatedLogoContext, number> = {
  sidebar: 140,
  preloader: 224,
  header: 78,
};

export function RitualAnimatedLogo({ context = "sidebar", className = "" }: RitualAnimatedLogoProps) {
  const size = SIZE_PX[context];
  const sceneClass =
    context === "preloader"
      ? "ritual-logo-scene ritual-logo-scene--preloader"
      : context === "header"
        ? "ritual-logo-scene ritual-logo-scene--header"
        : "ritual-logo-scene";
  const spinClass =
    context === "preloader"
      ? "ritual-logo-spin ritual-logo-spin--preloader"
      : context === "header"
        ? "ritual-logo-spin ritual-logo-spin--header"
        : "ritual-logo-spin";
  const stackClass =
    context === "header" || context === "preloader"
      ? "ritual-logo-stack ritual-logo-stack--header"
      : "ritual-logo-stack";

  return (
    <div className={`${sceneClass} ${className}`.trim()} aria-hidden="true">
      <div className={spinClass} style={{ width: size, height: size }}>
        <div className={stackClass}>
          <img src="/ritual-logo.svg" alt="" width={size} height={size} decoding="async" />
          <img src="/ritual-logo.svg" alt="" width={size} height={size} decoding="async" />
          <img src="/ritual-logo.svg" alt="" width={size} height={size} decoding="async" />
        </div>
      </div>
    </div>
  );
}
