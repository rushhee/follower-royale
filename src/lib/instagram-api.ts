const INSTAGRAM_APP_ID = "936619743392459";

interface InstagramProfileResponse {
  data: {
    user: {
      profile_pic_url_hd?: string;
      profile_pic_url?: string;
    } | null;
  };
}

/**
 * Fetch a user's profile picture URL from Instagram's web API.
 * Works from residential IPs. Cloud/datacenter IPs may be blocked.
 * Rate limit: ~200 requests/hour.
 */
export async function fetchInstagramProfilePic(username: string): Promise<string | null> {
  try {
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

    const response = await fetch(url, {
      headers: {
        "X-IG-App-ID": INSTAGRAM_APP_ID,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Rate limited by Instagram while fetching ${username}`);
      }
      return null;
    }

    const data: InstagramProfileResponse = await response.json();
    return data?.data?.user?.profile_pic_url_hd ?? data?.data?.user?.profile_pic_url ?? null;
  } catch (err) {
    console.error(`Failed to fetch profile pic for ${username}:`, err);
    return null;
  }
}

/**
 * Fetch profile pics for multiple users with rate limiting.
 * Adds a delay between requests to avoid hitting Instagram's rate limit.
 */
export async function fetchProfilePicsBatch(
  usernames: { id: number; username: string }[],
  onProgress?: (completed: number, total: number, username: string) => void
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  const DELAY_MS = 500; // 500ms between requests = ~120/min, safely under 200/hr limit

  for (let i = 0; i < usernames.length; i++) {
    const { id, username } = usernames[i];

    const picUrl = await fetchInstagramProfilePic(username);
    if (picUrl) {
      results.set(id, picUrl);
    }

    onProgress?.(i + 1, usernames.length, username);

    // Rate limit delay (skip on last item)
    if (i < usernames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}
