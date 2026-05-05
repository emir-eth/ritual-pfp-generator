/** Binding pool filenames: default `ritual-NNN.webp`; set `NEXT_PUBLIC_RITUAL_IMAGE_EXT=png` for PNG-only trees. */
export type RitualMainRasterExt = "png" | "webp";

export function getRitualMainFileExt(): RitualMainRasterExt {
  const v = process.env.NEXT_PUBLIC_RITUAL_IMAGE_EXT?.toLowerCase();
  if (v === "png") return "png";
  return "webp";
}
