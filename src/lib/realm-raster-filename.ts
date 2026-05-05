/** Max basename length for realm folder rasters (no path segments). */
const REALM_RASTER_BASENAME_MAX = 120;

/**
 * Validates a single path segment basename for realm images (.png or .webp).
 * Used by discovery, GET realm route, and assignment cooldown.
 */
export function isSafeRealmRasterFilename(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name.length === 0 || name.length > REALM_RASTER_BASENAME_MAX) return false;
  if (name.startsWith(".")) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  if (name.includes("..")) return false;
  if (name.includes("\0")) return false;
  if (!/\.(png|webp)$/i.test(name)) return false;
  return true;
}

/** Deterministic order for seeded index selection. */
export function sortRealmRasterFilenames(files: readonly string[]): string[] {
  return [...files].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}
