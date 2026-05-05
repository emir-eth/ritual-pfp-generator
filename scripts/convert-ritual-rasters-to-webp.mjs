/**
 * Convert PNG files under private-assets/ritual/ to WebP (sharp).
 *
 *   node scripts/convert-ritual-rasters-to-webp.mjs [--lossless] [--quality=85] [--delete-png]
 *
 * The app defaults to ritual-NNN.webp URLs; use NEXT_PUBLIC_RITUAL_IMAGE_EXT=png only for PNG-only trees.
 * Realm worlds: replace PNGs with WebP in each folder (or use --delete-png).
 *
 * Lossless WebP often beats bloated PNGs; lossy (default quality 85) shrinks more.
 */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sharp = (await import("sharp")).default;

const args = new Set(process.argv.slice(2));
const lossless = args.has("--lossless");
const deletePng = args.has("--delete-png");
let quality = 85;
for (const a of process.argv.slice(2)) {
  const m = /^--quality=(\d+)$/.exec(a);
  if (m) quality = Math.min(100, Math.max(1, Number(m[1])));
}

const root = path.join(process.cwd(), "private-assets", "ritual");

async function walkPngFiles(dir) {
  /** @type {string[]} */
  const out = [];
  let ents;
  try {
    ents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkPngFiles(p)));
    else if (e.isFile() && /\.png$/i.test(e.name)) out.push(p);
  }
  return out;
}

const pngs = await walkPngFiles(root);
if (pngs.length === 0) {
  console.error("No PNG files under private-assets/ritual (nothing to do).");
  process.exit(0);
}

console.error(
  `Converting ${pngs.length} PNG(s) → WebP (${lossless ? "lossless" : `quality ${quality}`})…`,
);

let ok = 0;
for (const src of pngs) {
  const dest = src.replace(/\.png$/i, ".webp");
  const img = sharp(src);
  if (lossless) {
    await img.webp({ lossless: true }).toFile(dest);
  } else {
    await img.webp({ quality }).toFile(dest);
  }
  ok++;
  if (deletePng) await fs.unlink(src);
}

console.error(`Done: ${ok} WebP file(s) written${deletePng ? "; PNG originals removed" : ""}.`);
console.error("Commit the new .webp files. Main pool URLs default to .webp (override with NEXT_PUBLIC_RITUAL_IMAGE_EXT=png if needed).");
