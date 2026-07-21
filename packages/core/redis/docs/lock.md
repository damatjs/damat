# Distributed locks

Covers `src/lock/` (`constants.ts`, `acquire.ts`, `release.ts`, `extend.ts`, `check.ts`, `with.ts`).

## Responsibility

A single-holder distributed mutex. Acquisition is atomic (`SET NX PX`); release and extension are guarded by a Lua script that checks ownership, so a process can only release/extend a lock it still holds. Keys use `LOCK_PREFIX = "lock:"` (exported).

## API

```ts
async function acquireLock(
  key: string,
  ttlMs = 10000,
  client?: Redis,
): Promise<string | null>;
async function releaseLock(
  key: string,
  lockValue: string,
  client?: Redis,
): Promise<boolean>;
async function extendLock(
  key: string,
  lockValue: string,
  ttlMs: number,
  client?: Redis,
): Promise<boolean>;
async function isLocked(key: string, client?: Redis): Promise<boolean>;
async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 10000,
  client?: Redis,
): Promise<T>;
```

## `acquireLock` — `acquire.ts`

```ts
const lockValue = randomUUID(); // node:crypto, unguessable owner token
const result = await redis.set(LOCK_PREFIX + key, lockValue, "PX", ttlMs, "NX");
return result === "OK" ? lockValue : null;
```

`SET ... NX` only writes if the key is absent → atomic acquire. `PX ttlMs` sets a millisecond TTL so a crashed holder's lock auto-releases. Returns the **owner token** on success (you need it to release/extend) or `null` if held by someone else.

## `releaseLock` — `release.ts`

Lua, evaluated atomically:

```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

`redis.eval(script, 1, LOCK_PREFIX + key, lockValue)` → returns `true` iff the stored value equals `lockValue` (i.e. you still own it). A wrong/expired token returns `false` and deletes nothing. This is the core safety property: you cannot release a lock that has since expired and been re-acquired by another process.

## `extendLock` — `extend.ts`

Same ownership-checked pattern but with `PEXPIRE`:

```lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end
```

Returns `true` if the TTL was extended, `false` if you no longer own the lock. Use it for long-running work to keep the lock alive (a manual lease-renewal; there is no automatic watchdog).

## `isLocked` — `check.ts`

`GET lock:<key>` → `value !== null`. Advisory only — the answer can change the instant after it returns; never gate critical work on it, use `acquireLock`.

## `withLock` — `with.ts`

```ts
const lockValue = await acquireLock(key, ttlMs, redis);
if (!lockValue) throw new Error(`Could not acquire lock: ${key}`);
try {
  return await fn();
} finally {
  await releaseLock(key, lockValue, redis);
}
```

The ergonomic path: acquire → run → guaranteed release (even on throw). Throws synchronously-in-promise if the lock can't be acquired. It resolves the client once and threads the same `redis` through acquire/release.

## Examples

```ts
// Manual
const token = await acquireLock("process-order:123", 30000);
if (!token) throw new Error("busy");
try {
  await processOrder(123);
} finally {
  await releaseLock("process-order:123", token);
}

// Helper (preferred)
await withLock("process-order:123", () => processOrder(123), 30000);
```

## Gotchas & limitations

- **Single-instance only.** This is not Redlock. On a single logical Redis it is correct; across independent Redis nodes/failover it offers no guarantee.
- **TTL vs. work duration.** If `fn` runs longer than `ttlMs`, the lock expires mid-work and another process can acquire it. Size `ttlMs` generously or call `extendLock` periodically. `withLock` does **not** auto-extend.
- **`releaseLock` after expiry is a no-op** by design (the token no longer matches), so a slow holder won't clobber the new owner's lock — but it _will_ have run `fn` without exclusivity. Prefer extension over a too-short TTL.
- **Keep the token secret.** It is a random UUID precisely so another process can't forge a release; don't log or share it.

## Safe extension

New lock operations go under `src/lock/` and export from `index.ts`. Any mutation that depends on current ownership **must** be a Lua compare-and-act (like release/extend) rather than a read-then-write from the app — otherwise you reintroduce the race the Lua guards against.
