/**
 * Client-safe realm helpers (seed, naming, pick-from-pool).
 * Directory reads and per-world caching live in `realm-image-pool.ts` (server-only).
 */
import type { ForgeChoices } from "@/lib/ritual-select";
import {
  ARCHETYPES,
  AURAS,
  ELEMENTS,
  INTENSITIES,
  STYLES,
  TAG_ROTATION,
  type RitualImageMeta,
  type RarityBand,
} from "@data/images";
import type { RealmWorld } from "@data/realm-worlds";
import {
  isSafeRealmRasterFilename,
  sortRealmRasterFilenames,
} from "@/lib/realm-raster-filename";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Name / card seed: handle + world + run index (run bumps each realm forge / regenerate). */
export function deriveRealmSynthSeed(
  handleNorm: string,
  world: RealmWorld,
  randomRunIndex: number,
): number {
  let h = 2166136261 >>> 0;
  const mix = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)!;
      h = Math.imul(h, 16777619) >>> 0;
    }
  };
  mix(handleNorm);
  mix("\x00realm\x00");
  mix(world);
  mix(String(randomRunIndex >>> 0));
  return h >>> 0;
}

/** Deterministic pseudo-axes so generateRitualName uses the same name pipeline. */
export function forgeChoicesFromRealmSeed(seed: number): ForgeChoices {
  const rng = mulberry32((seed ^ 0x51c0de) >>> 0);
  const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)]!;
  const element = ELEMENTS[Math.floor(rng() * ELEMENTS.length)]!;
  const intensity = INTENSITIES[Math.floor(rng() * INTENSITIES.length)]!;
  const aura = AURAS[Math.floor(rng() * AURAS.length)]!;
  return { archetype, element, intensity, aura, style: null };
}

/**
 * Pick one filename from a pre-built pool (sorted rasters from the server).
 * Stable vs random behavior comes from `synthSeed` (client derives it from handle/world/mode/run).
 */
export function pickRealmImageFromPool(
  pool: readonly string[],
  seed: number,
  isFileCooling?: (file: string) => boolean,
): { file: string; matchScore: number } | null {
  const sorted = sortRealmRasterFilenames(pool.filter((f) => isSafeRealmRasterFilename(f)));
  if (sorted.length === 0) return null;
  const cool = isFileCooling;
  const eligible = cool ? sorted.filter((f) => !cool(f)) : sorted;
  const use = eligible.length > 0 ? eligible : sorted;
  const rng = mulberry32(seed >>> 0);
  const pick = use[Math.floor(rng() * use.length)]!;
  return { file: pick, matchScore: 12 };
}

/** Synthetic pool entry for canvas / typing; image bytes come from realm API path. */
export function buildRitualImageMetaRealm(
  world: RealmWorld,
  file: string,
  synthSeed: number,
): RitualImageMeta {
  const c = forgeChoicesFromRealmSeed(synthSeed);
  const rng = mulberry32((synthSeed + 0x9e3779b9) >>> 0);
  const style = c.style ?? STYLES[Math.floor(rng() * STYLES.length)]!;
  const t0 = TAG_ROTATION[synthSeed % TAG_ROTATION.length]!;
  const t1 = TAG_ROTATION[(synthSeed + 3) % TAG_ROTATION.length]!;
  return {
    id: `realm-${world}-${file.replace(/\.(png|webp)$/i, "")}`,
    file,
    archetype: c.archetype,
    element: c.element,
    intensity: c.intensity,
    tags: [t0, t1, world],
    aura: c.aura,
    style,
    rarityBand: (synthSeed % 5) as RarityBand,
  };
}
