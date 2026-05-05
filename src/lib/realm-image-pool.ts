/**
 * Server-only: cached directory listing for realm worlds.
 * Do not import from client components.
 */
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { isRealmWorld } from "@data/realm-worlds";
import { isSafeRealmRasterFilename } from "@/lib/realm-raster-filename";

const STORE_KEY = Symbol.for("ritual.realmRitualPngDirCache");

type CacheEntry = { files: string[]; mtimeMs: number };
type G = typeof globalThis & { [STORE_KEY]?: Map<string, CacheEntry> };

function getCache(): Map<string, CacheEntry> {
  const g = globalThis as G;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map();
  return g[STORE_KEY];
}

/** Safe `.png` / `.webp` basenames under private-assets/ritual/{world}/ — cached per world by directory mtime. */
export async function getRealmRitualPngListCached(world: string): Promise<string[]> {
  if (!isRealmWorld(world)) return [];
  const dir = path.join(process.cwd(), "private-assets", "ritual", world);
  let st: Awaited<ReturnType<typeof fs.stat>>;
  try {
    st = await fs.stat(dir);
  } catch {
    return [];
  }
  if (!st.isDirectory()) return [];

  const cache = getCache();
  const prev = cache.get(world);
  if (prev && prev.mtimeMs === st.mtimeMs) return prev.files;

  let dirents: Dirent[];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  /** Preserve readdir order — image choice uses crypto.randomInt, not list order. */
  const files = dirents
    .filter((d) => d.isFile() && isSafeRealmRasterFilename(d.name))
    .map((d) => d.name);
  cache.set(world, { files, mtimeMs: st.mtimeMs });
  return files;
}
