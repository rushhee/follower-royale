type ExportFormat = "json" | "csv";

interface InstagramFollowerEntry {
  title?: string;
  media_list_data?: unknown[];
  string_list_data?: { href?: string; value: string; timestamp?: number }[];
}

function cleanUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").trim().toLowerCase();
}

function parseJsonExport(content: string): string[] {
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error("Expected a JSON array");
  }

  if (data.length > 0 && typeof data[0] === "object" && data[0] !== null && "string_list_data" in data[0]) {
    const entries = data as InstagramFollowerEntry[];
    return entries
      .flatMap((entry) => entry.string_list_data?.map((s) => s.value) ?? [])
      .map(cleanUsername)
      .filter(Boolean);
  }

  if (data.length > 0 && typeof data[0] === "string") {
    return data.map(cleanUsername).filter(Boolean);
  }

  throw new Error("Unrecognized JSON format");
}

function parseCsvExport(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const firstLine = lines[0]?.trim().toLowerCase();
  const startIndex = firstLine === "username" || firstLine === "usernames" ? 1 : 0;

  return lines
    .slice(startIndex)
    .map(cleanUsername)
    .filter(Boolean);
}

export function parseInstagramExport(content: string, format: ExportFormat): string[] {
  const usernames = format === "json" ? parseJsonExport(content) : parseCsvExport(content);
  return [...new Set(usernames)];
}
