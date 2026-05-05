import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { contentTypeForRasterFilename } from "@/lib/raster-content-type";

const RITUAL_FILE = /^ritual-(\d{3})\.(png|webp)$/i;

function isAllowedRitualFilename(filename: string): boolean {
  const m = filename.match(RITUAL_FILE);
  if (!m) return false;
  const n = Number.parseInt(m[1]!, 10);
  return n >= 1 && n <= 147;
}

function alternateRitualMainName(filename: string): string | null {
  const m = filename.match(RITUAL_FILE);
  if (!m) return null;
  const num = m[1]!;
  const ext = m[2]!.toLowerCase();
  return ext === "png" ? `ritual-${num}.webp` : `ritual-${num}.png`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!isAllowedRitualFilename(filename)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const root = path.join(process.cwd(), "private-assets", "ritual");

  async function tryRead(name: string): Promise<Buffer | null> {
    const resolved = path.resolve(root, name);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return null;
    }
    try {
      return await fs.readFile(resolved);
    } catch {
      return null;
    }
  }

  let buf = await tryRead(filename);
  let servedName = filename;
  if (!buf) {
    const alt = alternateRitualMainName(filename);
    if (alt) {
      buf = await tryRead(alt);
      if (buf) servedName = alt;
    }
  }

  if (!buf) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentTypeForRasterFilename(servedName),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
