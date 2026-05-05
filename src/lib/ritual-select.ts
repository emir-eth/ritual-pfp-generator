import {
  type Archetype,
  type Aura,
  type Element,
  type Intensity,
  type Style,
  RITUAL_IMAGES,
  type RitualImageMeta,
  TAG_ROTATION,
} from "@data/images";

export interface ForgeChoices {
  archetype: Archetype;
  element: Element;
  intensity: Intensity;
  aura: Aura;
  /** Omit or null → matcher ignores style axis (still stable via seed). */
  style: Style | null;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft fallbacks when no exact aura match — keeps scoring smooth, not binary. */
const AURA_AFFINITY: Record<Aura, Partial<Record<Aura, number>>> = {
  aggressive: { corrupted: 0.62, mysterious: 0.28, volatile: 0.55, radiant: 0.22 },
  mysterious: { silent: 0.72, divine: 0.45, corrupted: 0.32, cryptic: 0.65 },
  divine: { mysterious: 0.55, silent: 0.42, serene: 0.58, radiant: 0.5 },
  corrupted: { aggressive: 0.62, mysterious: 0.34, volatile: 0.48 },
  silent: { mysterious: 0.68, divine: 0.38, serene: 0.55, cryptic: 0.42 },
  serene: { silent: 0.74, divine: 0.52, mysterious: 0.36, radiant: 0.4 },
  volatile: { aggressive: 0.7, corrupted: 0.52, radiant: 0.3, mysterious: 0.25 },
  cryptic: { mysterious: 0.78, silent: 0.48, divine: 0.34, corrupted: 0.28 },
  radiant: { divine: 0.72, serene: 0.46, volatile: 0.28, aggressive: 0.2 },
};

const STYLE_AFFINITY: Record<Style, Partial<Record<Style, number>>> = {
  clean: { minimal: 0.78, etched: 0.52 },
  minimal: { clean: 0.78, noir: 0.48, etched: 0.58 },
  glitch: { heavy: 0.58, neon: 0.62 },
  heavy: { glitch: 0.58, minimal: 0.22, neon: 0.38 },
  noir: { minimal: 0.66, heavy: 0.48, etched: 0.54, clean: 0.32 },
  neon: { glitch: 0.76, heavy: 0.46, clean: 0.26 },
  etched: { clean: 0.68, minimal: 0.6, noir: 0.5 },
};

function scoreAuraMatch(want: Aura, img: Aura): number {
  if (want === img) return 5;
  const near = AURA_AFFINITY[want]?.[img];
  if (near !== undefined) return 2.1 + near * 1.4;
  return 0.45;
}

function scoreStyleMatch(want: Style, img: Style): number {
  if (want === img) return 4;
  const near = STYLE_AFFINITY[want]?.[img];
  if (near !== undefined) return 1.6 + near * 1.8;
  return 0.35;
}

/** Normalize X handle: strip @, trim, lowercase, collapse spaces. */
export function normalizeXHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

/** Display @handle or empty when anonymous. */
export function formatHandleForDisplay(normalized: string): string | null {
  if (!normalized) return null;
  return `@${normalized}`;
}

/** Normalize Discord username: trim, collapse whitespace (Discord allows spaces in display name but username is single token). */
export function normalizeDiscordHandle(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

/** Plain display for Discord line on card (no @ prefix). */
export function formatDiscordForDisplay(normalized: string): string | null {
  if (!normalized) return null;
  return normalized;
}

/**
 * Deterministic seed from handle, trait axes, and variation index.
 * Same inputs always yield the same ritual selection and naming roll.
 */
export function deriveRitualSeed(
  handleNorm: string,
  choices: ForgeChoices,
  variation: number,
): number {
  let h = 2166136261 >>> 0;
  const mix = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)!;
      h = Math.imul(h, 16777619) >>> 0;
    }
  };
  mix(handleNorm);
  mix("\x00");
  mix(choices.archetype);
  mix(choices.element);
  mix(choices.intensity);
  mix(choices.aura);
  mix(choices.style ?? "\x00");
  mix(String(variation));
  return h >>> 0;
}

/** Seeded auxiliary aesthetic tokens (aura/style scored separately). */
function desiredAuxTags(c: ForgeChoices, seed: number): Set<string> {
  const i =
    (seed ^
      (c.archetype.length * 131 +
        c.element.length * 17 +
        c.intensity.length * 97 +
        c.aura.length * 41 +
        (c.style?.length ?? 0) * 53)) >>>
    0;
  const a = TAG_ROTATION[i % TAG_ROTATION.length]!;
  const b = TAG_ROTATION[(i + 4) % TAG_ROTATION.length]!;
  return new Set<string>([a, b]);
}

function scoreMatch(img: RitualImageMeta, c: ForgeChoices, seed: number): number {
  let s = 0;
  if (img.archetype === c.archetype) s += 4;
  if (img.element === c.element) s += 3;
  if (img.intensity === c.intensity) s += 2;

  s += scoreAuraMatch(c.aura, img.aura);
  if (c.style) s += scoreStyleMatch(c.style, img.style);

  const wantAux = desiredAuxTags(c, seed);
  const aesthetic = img.tags.slice(0, 3);
  let tagBonus = 0;
  for (const t of aesthetic) {
    if (wantAux.has(t)) tagBonus += 1.5;
  }
  s += Math.min(tagBonus, 3.5);

  const targetBand = seed % 5;
  if (img.rarityBand === targetBand) s += 1;
  else if (Math.abs(img.rarityBand - targetBand) === 1) s += 0.5;

  return s;
}

/** Same ritual file should not be chosen again within this window (client policy). */
export const RITUAL_IMAGE_COOLDOWN_MS = 3 * 60 * 1000;

export interface SelectRitualImageOptions {
  /** Exclude files still inside cooldown; pool widens if everything would be excluded. */
  isImageCooling?: (file: string) => boolean;
}

export function selectRitualImage(
  choices: ForgeChoices,
  seed: number,
  options?: SelectRitualImageOptions,
): { image: RitualImageMeta; matchScore: number } {
  const rng = mulberry32(seed >>> 0);
  const scored = RITUAL_IMAGES.map((img) => ({
    img,
    score: scoreMatch(img, choices, seed >>> 0),
  }));
  const isCooling = options?.isImageCooling;
  const eligible = isCooling ? scored.filter((x) => !isCooling(x.img.file)) : scored;
  const pool = eligible.length > 0 ? eligible : scored;
  const max = Math.max(...pool.map((x) => x.score));
  const tier = pool.filter((x) => x.score === max);
  const pick = tier[Math.floor(rng() * tier.length)]!;
  return { image: pick.img, matchScore: Math.round(pick.score * 10) / 10 };
}

export type Rarity = "Mythic" | "Legendary" | "Rare" | "Uncommon" | "Common";

export function rarityFromScore(score: number, seed: number): Rarity {
  const roll = mulberry32((seed ^ 0x9e3779b9) >>> 0)();
  if (score >= 17.5 && roll > 0.92) return "Mythic";
  if (score >= 15) return "Legendary";
  if (score >= 12) return "Rare";
  if (score >= 9) return "Uncommon";
  return "Common";
}

const NAME_PARTS = {
  oracle: ["Veil", "Omen", "Cipher", "Augur", "Rune"],
  warden: ["Bulwark", "Ash", "Iron", "Gate", "Sigil"],
  phantom: ["Wisp", "Hollow", "Shade", "Noct", "Echo"],
  sovereign: ["Crown", "Sable", "Throne", "Regent", "Axiom"],
  martyr: ["Ash", "Brand", "Pyre", "Vow", "Ember"],
  harbinger: ["Dusk", "Fell", "Ruin", "Marrow", "Hex"],
  revenant: ["Dirge", "Crypt", "Pale", "Grave", "Shroud"],
  herald: ["Clarion", "Banner", "Dawn", "Horn", "Pageant"],
  architect: ["Lattice", "Column", "Apex", "Grid", "Spire"],
  scion: ["Heir", "Crest", "Bloom", "Lineage", "Bloodline"],
} as const satisfies Record<Archetype, readonly string[]>;

const ELEMENT_SUFFIX: Record<Element, readonly string[]> = {
  fire: ["flare", "cinder", "blaze", "spark"],
  water: ["tide", "deep", "brine", "surge"],
  earth: ["root", "stone", "granite", "fault"],
  air: ["gale", "stratus", "zephyr", "vault"],
  void: ["null", "eclipse", "abyss", "silence"],
  storm: ["volta", "squall", "bolt", "tempest"],
  ice: ["rime", "shard", "glacier", "hoar"],
  shadow: ["umbra", "penumbra", "dusk", "murk"],
};

export function generateRitualName(choices: ForgeChoices, seed: number): string {
  const rng = mulberry32((seed ^ 0xdeadbeef) >>> 0);
  const a = NAME_PARTS[choices.archetype];
  const e = ELEMENT_SUFFIX[choices.element];
  const p1 = a[Math.floor(rng() * a.length)]!;
  const p2 = e[Math.floor(rng() * e.length)]!;
  return `${p1} ${p2}`.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatSeed(seed: number): string {
  return `0x${(seed >>> 0).toString(16).padStart(8, "0")}`;
}
