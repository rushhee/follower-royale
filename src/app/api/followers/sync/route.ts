import { NextRequest, NextResponse } from "next/server";
import { getDb, addFollowersBulk } from "@/lib/db";
import { parseInstagramExport } from "@/lib/instagram-parser";

export async function POST(request: NextRequest) {
  const db = getDb();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const content = await file.text();
  const format = file.name.endsWith(".csv") ? "csv" : "json";

  try {
    const usernames = parseInstagramExport(content, format);
    if (usernames.length === 0) {
      return NextResponse.json({ error: "No usernames found in file" }, { status: 400 });
    }

    const result = addFollowersBulk(db, usernames);
    return NextResponse.json({
      added: result.added,
      skipped: result.skipped,
      total: usernames.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
