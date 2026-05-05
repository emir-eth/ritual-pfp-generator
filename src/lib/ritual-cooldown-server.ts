/**
 * Global (server) cooldown: a filename stays reserved for all users for 3 minutes.
 * Uses in-memory state on this Node process — enough for a single VPS / `next start`.
 * On multi-instance serverless (e.g. Vercel), swap this store for Redis / Upstash so
 * every edge/node shares the same map.
 */
import { isSafeRealmRasterFilename } from "@/lib/realm-raster-filename";
import { isRealmWorld } from "@data/realm-worlds";
import { RITUAL_IMAGE_COOLDOWN_MS } from "@/lib/ritual-select";

const STORE_KEY = Symbol.for("ritual.imageCooldownUntil");

type G = typeof globalThis & { [STORE_KEY]?: Map<string, number> };

function getStore(): Map<string, number> {
  const g = globalThis as G;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map();
  return g[STORE_KEY];
}

const RITUAL_FILE = /^ritual-(\d{3})\.(png|webp)$/i;

export function isValidRitualAssignmentFile(filename: unknown): filename is string {
  if (typeof filename !== "string" || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  const m = filename.match(RITUAL_FILE);
  if (!m) return false;
  const n = Number.parseInt(m[1]!, 10);
  return n >= 1 && n <= 147;
}

export function isValidRealmAssignmentFile(world: unknown, filename: unknown): boolean {
  if (typeof world !== "string" || typeof filename !== "string") return false;
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return false;
  }
  if (!isRealmWorld(world)) return false;
  return isSafeRealmRasterFilename(filename);
}

function prune(now: number) {
  const store = getStore();
  for (const [f, until] of [...store.entries()]) {
    if (until <= now) store.delete(f);
  }
}

/** Filenames still inside the global cooldown window (all users). */
export function getGloballyBlockedRitualFiles(now = Date.now()): string[] {
  prune(now);
  const store = getStore();
  const out: string[] = [];
  for (const [f, until] of store) {
    if (until > now) out.push(f);
  }
  return out;
}

/**
 * Reserves a ritual image on the global cooldown map.
 * Binding: `file` only (ritual-NNN.png|webp). Realm: pass `world` so the key is `world|file`.
 */
export function recordGlobalRitualAssignment(
  file: string,
  world?: string | null,
  now = Date.now(),
): boolean {
  prune(now);
  if (world != null && String(world).length > 0) {
    const w = String(world);
    if (!isValidRealmAssignmentFile(w, file)) return false;
    getStore().set(`${w}|${file}`, now + RITUAL_IMAGE_COOLDOWN_MS);
    return true;
  }
  if (!isValidRitualAssignmentFile(file)) return false;
  getStore().set(file, now + RITUAL_IMAGE_COOLDOWN_MS);
  return true;
}
