import { getRitualMainFileExt } from "@/lib/ritual-main-ext";

export type Archetype =
  | "oracle"
  | "warden"
  | "phantom"
  | "sovereign"
  | "martyr"
  | "harbinger"
  | "revenant"
  | "herald"
  | "architect"
  | "scion";

export type Element =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "void"
  | "storm"
  | "ice"
  | "shadow";

export type Intensity = "dormant" | "low" | "medium" | "high" | "primordial";

export type Aura =
  | "aggressive"
  | "mysterious"
  | "divine"
  | "corrupted"
  | "silent"
  | "serene"
  | "volatile"
  | "cryptic"
  | "radiant";

export type Style = "clean" | "glitch" | "heavy" | "minimal" | "noir" | "neon" | "etched";

/** 0 = highest affinity tier … 4 = widest distribution */
export type RarityBand = 0 | 1 | 2 | 3 | 4;

export interface RitualImageMeta {
  id: string;
  /** Filename only — served via `/api/ritual-image/[filename]` (`.png` or `.webp` via `NEXT_PUBLIC_RITUAL_IMAGE_EXT`). */
  file: string;
  archetype: Archetype;
  element: Element;
  intensity: Intensity;
  /** Extra axes for weighted matching beyond the three core picks */
  tags: readonly string[];
  /** Mood axis — folded into matcher with soft affinity fallbacks */
  aura: Aura;
  /** Presentation axis — optional on the forge; always set on pool entries */
  style: Style;
  rarityBand: RarityBand;
}

export const ARCHETYPES: readonly Archetype[] = [
  "oracle",
  "warden",
  "phantom",
  "sovereign",
  "martyr",
  "harbinger",
  "revenant",
  "herald",
  "architect",
  "scion",
];

export const ELEMENTS: readonly Element[] = [
  "fire",
  "water",
  "earth",
  "air",
  "void",
  "storm",
  "ice",
  "shadow",
];

export const INTENSITIES: readonly Intensity[] = [
  "dormant",
  "low",
  "medium",
  "high",
  "primordial",
];

export const AURAS: readonly Aura[] = [
  "aggressive",
  "mysterious",
  "divine",
  "corrupted",
  "silent",
  "serene",
  "volatile",
  "cryptic",
  "radiant",
];

export const STYLES: readonly Style[] = [
  "clean",
  "glitch",
  "heavy",
  "minimal",
  "noir",
  "neon",
  "etched",
];

/** Auxiliary tokens for matcher (not the core archetype/element/intensity axes). */
export const TAG_ROTATION = [
  "ember",
  "tide",
  "stone",
  "gale",
  "null",
  "veil",
  "shard",
  "flux",
  "omen",
  "glyph",
] as const;

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function buildRitualMeta(index: number): RitualImageMeta {
  const n = index + 1;
  const archetype = ARCHETYPES[n % ARCHETYPES.length]!;
  const element = ELEMENTS[Math.floor(n / 3) % ELEMENTS.length]!;
  const intensity = INTENSITIES[Math.floor(n / 11) % INTENSITIES.length]!;
  const t0 = TAG_ROTATION[n % TAG_ROTATION.length]!;
  const t1 = TAG_ROTATION[(n + 3) % TAG_ROTATION.length]!;
  const t2 = TAG_ROTATION[(n + 7) % TAG_ROTATION.length]!;
  const rarityBand = (n % 5) as RarityBand;
  const aura = AURAS[(n * 5 + (archetype.length + element.length)) % AURAS.length]!;
  const style = STYLES[(n * 7 + intensity.length + (n >> 3)) % STYLES.length]!;
  const tags = [t0, t1, t2, aura, style] as const;

  const ext = getRitualMainFileExt();
  return {
    id: `r${pad3(n)}`,
    file: `ritual-${pad3(n)}.${ext}`,
    archetype,
    element,
    intensity,
    tags,
    aura,
    style,
    rarityBand,
  };
}

/** 147 ritual identities — metadata only; binaries live under `private-assets/ritual/`. */
export const RITUAL_IMAGES: readonly RitualImageMeta[] = Array.from({ length: 147 }, (_, i) =>
  buildRitualMeta(i),
);
