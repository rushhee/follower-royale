import { NextRequest, NextResponse } from "next/server";
import { getDb, getBattleDetail } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const battle = getBattleDetail(db, parseInt(id, 10));

  if (!battle) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  return NextResponse.json({ battle });
}
