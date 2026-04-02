import { NextResponse } from "next/server";
import { getDb, getLeaderboard } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const leaderboard = getLeaderboard(db);
  return NextResponse.json({ leaderboard });
}
