import { NextRequest, NextResponse } from "next/server";
import { getDb, getBattles, saveBattleResults } from "@/lib/db";
import type { BattleSavePayload } from "@/types";

export async function GET() {
  const db = getDb();
  const battles = getBattles(db);
  return NextResponse.json({ battles });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const payload: BattleSavePayload = await request.json();

  if (!payload.results || !Array.isArray(payload.results) || payload.results.length === 0) {
    return NextResponse.json({ error: "Results are required" }, { status: 400 });
  }

  try {
    const battleId = saveBattleResults(db, payload);
    return NextResponse.json({ battleId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save battle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
