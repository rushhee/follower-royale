export function getAvatarUrl(username: string): string {
  return `https://unavatar.io/instagram/${encodeURIComponent(username)}?fallback=false`;
}

export function getAvatarUrlWithFallback(username: string): string {
  return `https://unavatar.io/instagram/${encodeURIComponent(username)}`;
}
