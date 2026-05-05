import { getGloballyBlockedRitualFiles } from "@/lib/ritual-cooldown-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const blocked = getGloballyBlockedRitualFiles();
  return NextResponse.json({ blocked }, { status: 200 });
}
