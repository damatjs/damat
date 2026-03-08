/**
 * Extract database name from connection URL.
 */
export function extractDbName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.slice(1).split("?")[0] || "postgres";
  } catch {
    return url.split("/").pop()?.split("?")[0] ?? "postgres";
  }
}
