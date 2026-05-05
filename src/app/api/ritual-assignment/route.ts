import { recordGlobalRitualAssignment } from "@/lib/ritual-cooldown-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const file =
    body && typeof body === "object" && body !== null && "file" in body
      ? (body as { file: unknown }).file
      : undefined;
  const world =
    body && typeof body === "object" && body !== null && "world" in body
      ? (body as { world: unknown }).world
      : undefined;
  if (typeof file !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_file" }, { status: 400 });
  }
  const worldStr =
    world === undefined || world === null
      ? null
      : typeof world === "string"
        ? world
        : null;
  const ok = recordGlobalRitualAssignment(file, worldStr);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid_file" }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
