import { NextRequest, NextResponse } from "next/server";
import { getDb, getFollowers, addFollower, deleteFollower, getFollowerCount } from "@/lib/db";

export async function GET(request: NextRequest) {
  const db = getDb();
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const followers = getFollowers(db, search);
  const total = getFollowerCount(db);
  return NextResponse.json({ followers, total });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const { username } = await request.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const clean = username.trim().replace(/^@/, "").toLowerCase();
  if (!clean) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const follower = addFollower(db, clean);
    return NextResponse.json({ follower }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();

  if (!id || typeof id !== "number") {
    return NextResponse.json({ error: "Follower ID is required" }, { status: 400 });
  }

  const deleted = deleteFollower(db, id);
  if (!deleted) {
    return NextResponse.json({ error: "Follower not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
