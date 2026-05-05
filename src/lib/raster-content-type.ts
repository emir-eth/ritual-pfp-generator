import path from "node:path";

export function contentTypeForRasterFilename(basename: string): string {
  const ext = path.extname(basename).slice(1).toLowerCase();
  if (ext === "webp") return "image/webp";
  return "image/png";
}
