import { randomInt } from "node:crypto";
import { getRealmRitualPngListCached } from "@/lib/realm-image-pool";
import { isRealmWorld } from "@data/realm-worlds";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Returns a single picked filename for a realm forge (never the full directory listing).
 * Image is always chosen with uniform crypto randomness among eligible rasters (.png / .webp).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const world = o.world;
  const synthSeed = o.synthSeed;
  const blockedRaw = o.blocked;

  if (typeof world !== "string" || !isRealmWorld(world)) {
    return NextResponse.json({ ok: false, error: "invalid_world" }, { status: 400 });
  }
  if (typeof synthSeed !== "number" || !Number.isFinite(synthSeed)) {
    return NextResponse.json({ ok: false, error: "invalid_seed" }, { status: 400 });
  }
  const blocked = new Set<string>();
  if (Array.isArray(blockedRaw)) {
    for (const x of blockedRaw) {
      if (typeof x === "string") blocked.add(x);
    }
  }

  const pool = await getRealmRitualPngListCached(world);
  if (pool.length === 0) {
    return NextResponse.json({ ok: true, fallback: true as const }, { status: 200 });
  }

  const cool = (file: string) => blocked.has(`${world}|${file}`);
  const eligible = pool.filter((f) => !cool(f));
  const use = eligible.length > 0 ? eligible : pool;
  const idx = randomInt(0, use.length);
  const file = use[idx]!;

  return NextResponse.json(
    {
      ok: true as const,
      fallback: false as const,
      file,
      matchScore: 12,
    },
    { status: 200 },
  );
}
