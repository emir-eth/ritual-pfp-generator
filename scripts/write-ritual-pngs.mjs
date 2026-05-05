import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "private-assets", "ritual");

/** Minimal valid 1×1 PNG — replace with real artwork; keep filenames stable. */
const basePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

fs.mkdirSync(outDir, { recursive: true });
for (let i = 1; i <= 147; i++) {
  const name = `ritual-${String(i).padStart(3, "0")}.png`;
  fs.writeFileSync(path.join(outDir, name), basePng);
}
console.log("Wrote 147 placeholder PNGs to private-assets/ritual/");
