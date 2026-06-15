# Rate limiting

Covers `src/rateLimit/` (`constant.ts`, `check.ts`, `checkMulti.ts`) and the rate-limit types in `src/types/rateLimit.ts`.

## Responsibility

Sliding-window rate limiting backed by a Redis sorted set per identifier, with a multi-window wrapper (e.g. "60/min and 1000/hour"). Keys are prefixed with `RATE_LIMIT_PREFIX = "ratelimit:"`.

## Types — `src/types/rateLimit.ts`

```ts
interface RateLimitResult {
  allowed: boolean;
  remaining: number;     // requests left in the window
  resetAt: number;       // epoch ms when the window resets (now + windowMs)
  retryAfter?: number;   // seconds to wait, only set when !allowed
}

interface RateLimitWindow { windowMs: number; maxRequests: number; }

interface MultiRateLimitResult extends RateLimitResult {
  limitedBy?: string;    // "minute" | "hour" | "day" — which window blocked
}
```

## `checkRateLimit` — `src/rateLimit/check.ts`

```ts
async function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number,
  client?: Redis,
): Promise<RateLimitResult>;
```

Algorithm (one pipeline = one round-trip), key = `ratelimit:<identifier>`:

1. `ZREMRANGEBYSCORE key 0 (now - windowMs)` — drop entries older than the window.
2. `ZCARD key` — count what remains (`currentCount`). This is the count **before** the current request.
3. `ZADD key now "<now>:<random>"` — record this request (unique member via `Math.random()` so concurrent same-ms requests don't collide).
4. `PEXPIRE key windowMs` — keep the key from leaking after inactivity.

Then:

- `allowed = currentCount < maxRequests`
- `remaining = max(0, maxRequests - currentCount - 1)`
- `resetAt = now + windowMs`
- If **not** allowed: it does an extra `ZRANGE key 0 0 WITHSCORES` to find the oldest entry and computes `retryAfter = ceil((oldestTs + windowMs - now) / 1000)`, returning `{ allowed:false, remaining:0, resetAt, retryAfter }`.

## `checkMultiRateLimit` — `src/rateLimit/checkMulti.ts`

```ts
async function checkMultiRateLimit(
  identifier: string,
  windows: Array<{ windowMs: number; maxRequests: number }>,
  client?: Redis,
): Promise<MultiRateLimitResult>;
```

- Iterates `windows` **in order**, deriving a name from `windowMs`: `>= 86_400_000` → `"day"`, `>= 3_600_000` → `"hour"`, else `"minute"`. The name is appended to the identifier, so each window uses a separate key: `ratelimit:<id>:<name>`.
- Calls `checkRateLimit(`${id}:${name}`, ...)` for each. The **first** window that blocks short-circuits and returns its result with `limitedBy` set.
- If all pass it returns `{ allowed: true, remaining: -1, resetAt: Date.now() }` — note `remaining` is **`-1`** here (a sentinel; per-window `remaining` is not aggregated).

## Example

```ts
const r = await checkRateLimit(`user:${userId}`, 60_000, 100);
if (!r.allowed) throw new Error(`Rate limited, retry in ${r.retryAfter}s`);

const m = await checkMultiRateLimit(`user:${userId}`, [
  { windowMs: 60_000,    maxRequests: 60 },    // → ratelimit:user:<id>:minute
  { windowMs: 3_600_000, maxRequests: 1000 },  // → ratelimit:user:<id>:hour
  { windowMs: 86_400_000, maxRequests: 10000 },// → ratelimit:user:<id>:day
]);
if (!m.allowed) logger.warn(`limited by ${m.limitedBy}`);
```

## Gotchas

- **The request is counted even when allowed** — step 3 always `ZADD`s. There is no "peek without consuming" variant; calling `checkRateLimit` *is* the request.
- **Window naming is bucketed, not exact.** Two windows that both fall in the same bucket (e.g. two sub-minute windows) would share the key `ratelimit:<id>:minute` and interfere. Use one window per bucket (minute/hour/day).
- **`remaining: -1`** from `checkMultiRateLimit` on success means "not computed", not "infinite".
- **Pipeline, not transaction.** `check.ts` uses `pipeline()` (no `MULTI`/`WATCH`); under heavy concurrency the count can be slightly approximate. That is an accepted trade-off for throughput.

## Safe extension

To add a fixed-window or token-bucket variant, add a new file under `src/rateLimit/` returning a `RateLimitResult`, and export it from `index.ts`. Reuse `RATE_LIMIT_PREFIX`. If you add window buckets to `checkMulti`, keep the name derivation total and collision-free.
