import { NextResponse } from "next/server";
import { getDb, getFollowersWithoutAvatars, updateFollowerAvatar } from "@/lib/db";
import { fetchInstagramProfilePic } from "@/lib/instagram-api";

export async function POST() {
  const db = getDb();
  const followers = getFollowersWithoutAvatars(db);

  if (followers.length === 0) {
    return NextResponse.json({ fetched: 0, total: 0, message: "All followers already have avatars" });
  }

  let fetched = 0;
  let failed = 0;
  const DELAY_MS = 500;

  for (let i = 0; i < followers.length; i++) {
    const follower = followers[i];

    try {
      const picUrl = await fetchInstagramProfilePic(follower.username);
      if (picUrl) {
        updateFollowerAvatar(db, follower.id, picUrl);
        fetched++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Rate limit delay
    if (i < followers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return NextResponse.json({
    fetched,
    failed,
    total: followers.length,
    message: `Fetched ${fetched} profile pics, ${failed} failed`,
  });
}
