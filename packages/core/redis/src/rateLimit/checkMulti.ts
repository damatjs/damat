import type { Redis, MultiRateLimitResult } from "../types";
import { getRedis } from "../singleton";
import { checkRateLimit } from "./check";

export async function checkMultiRateLimit(
  identifier: string,
  windows: Array<{ windowMs: number; maxRequests: number }>,
  client?: Redis,
): Promise<MultiRateLimitResult> {
  const redis = client || getRedis();
  for (const window of windows) {
    const windowName =
      window.windowMs >= 86400000
        ? "day"
        : window.windowMs >= 3600000
          ? "hour"
          : "minute";

    const result = await checkRateLimit(
      `${identifier}:${windowName}`,
      window.windowMs,
      window.maxRequests,
      redis,
    );

    if (!result.allowed) {
      return { ...result, limitedBy: windowName };
    }
  }

  return { allowed: true, remaining: -1, resetAt: Date.now() };
}
