export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getSafeHostFromHeaders(
  forwardedHost?: string | string[],
  host?: string | string[],
  fallback = "apexspeedrun.com",
): string {
  const rawHeader = forwardedHost || host || fallback;
  const first = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const cleaned = String(first || fallback)
    .split(",")[0]
    .trim();
  return /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(cleaned) ? cleaned : fallback;
}

export function isValidSheetGid(gid: unknown): gid is string {
  return typeof gid === "string" && /^\d+$/.test(gid);
}
