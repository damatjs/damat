import type { Redis, MultiRateLimitResult } from "../types";
import { getRedis } from "../singleton";
import { RATE_LIMIT_PREFIX } from "./constant";
import { MULTI_RATE_LIMIT_SCRIPT } from "./scriptMulti";

function windowName(windowMs: number): string {
  if (windowMs >= 86400000) return "day";
  if (windowMs >= 3600000) return "hour";
  return "minute";
}

export async function checkMultiRateLimit(
  identifier: string,
  windows: Array<{ windowMs: number; maxRequests: number }>,
  client?: Redis,
): Promise<MultiRateLimitResult> {
  const redis = client || getRedis();
  const now = Date.now();
  const member = `${now}:${Math.random()}`;

  const keys = windows.map(
    (w) => `${RATE_LIMIT_PREFIX}${identifier}:${windowName(w.windowMs)}`,
  );
  const args: Array<string | number> = [now, member];
  for (const w of windows) {
    args.push(now - w.windowMs, w.maxRequests, w.windowMs);
  }

  // All-or-nothing: the script records in every window only when they all pass.
  const [allowed, rejectIndex, , oldestScore] = (await redis.eval(
    MULTI_RATE_LIMIT_SCRIPT,
    keys.length,
    ...keys,
    ...args,
  )) as [number, number?, number?, string?];

  if (allowed !== 1) {
    const window = windows[(rejectIndex ?? 1) - 1]!;
    const oldestTimestamp = oldestScore ? parseInt(oldestScore, 10) : now;
    const retryAfter = Math.ceil(
      (oldestTimestamp + window.windowMs - now) / 1000,
    );
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + window.windowMs,
      retryAfter,
      limitedBy: windowName(window.windowMs),
    };
  }

  return { allowed: true, remaining: -1, resetAt: now };
}
