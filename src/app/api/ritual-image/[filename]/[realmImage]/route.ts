import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { contentTypeForRasterFilename } from "@/lib/raster-content-type";
import { isSafeRealmRasterFilename } from "@/lib/realm-raster-filename";
import { isRealmWorld } from "@data/realm-worlds";

/** First segment is realm world slug; second is raster basename (param name `filename` matches sibling route). */
function isAllowedRealmFilename(world: string, imageBasename: string): boolean {
  if (!isRealmWorld(world)) return false;
  return isSafeRealmRasterFilename(imageBasename);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string; realmImage: string }> },
) {
  const { filename: world, realmImage } = await context.params;

  if (
    world.includes("..") ||
    realmImage.includes("..") ||
    world.includes("/") ||
    world.includes("\\") ||
    realmImage.includes("/") ||
    realmImage.includes("\\")
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!isAllowedRealmFilename(world, realmImage)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const base = path.join(process.cwd(), "private-assets", "ritual", world);
  const resolved = path.resolve(base, realmImage);
  const relative = path.relative(base, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative) || relative.includes("..")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const buf = await fs.readFile(resolved);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForRasterFilename(realmImage),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
