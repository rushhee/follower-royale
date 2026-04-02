import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = process.env.ADMIN_PASSWORD || "changeme";

  if (password === correct) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
}
