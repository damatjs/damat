# Sessions

Covers `src/session/` (`constant.ts`, `set.ts`, `get.ts`, `extend.ts`, `delete.ts`, `manager.ts`).

## Responsibility

Token → JSON-data storage with TTL, plus a `SessionManager` class that adds **sliding expiration** (auto-extend on read). All keys use `SESSION_PREFIX = "session:"`.

## Function API

```ts
async function setSession<T>(token: string, data: T, ttlSeconds: number, client?: Redis): Promise<void>;
async function getSession<T>(token: string, client?: Redis): Promise<T | null>;
async function extendSession(token: string, ttlSeconds: number, client?: Redis): Promise<boolean>;
async function deleteSession(token: string, client?: Redis): Promise<void>;
```

- **`setSession`** — `SETEX session:<token> <ttlSeconds> JSON.stringify(data)`. TTL is **required** (unlike cache). Overwrites any existing session.
- **`getSession`** — `GET`; `null` on miss; `JSON.parse` in a `try/catch` returning `null` on malformed JSON.
- **`extendSession`** — `EXPIRE session:<token> <ttlSeconds>`; returns `true` iff the key existed (ioredis returns `1`). Does **not** touch the data.
- **`deleteSession`** — `DEL`; no-op for a missing key (use for logout).

## `SessionManager` — `src/session/manager.ts`

```ts
interface SessionManagerOptions {
  defaultTtlSeconds: number;   // default 3600
  extendOnAccess: boolean;     // default true
  extendThreshold?: number;    // default 0.5
}

class SessionManager<T = unknown> {
  constructor(options?: Partial<SessionManagerOptions>, client?: Redis);
  get(token: string): Promise<T | null>;
  set(token: string, data: T, ttlSeconds?: number): Promise<void>;
  delete(token: string): Promise<void>;
  touch(token: string, ttlSeconds?: number): Promise<boolean>;   // extend only
  refresh(token: string, data: T, ttlSeconds?: number): Promise<void>; // overwrite + reset TTL
}

function createSessionManager<T = unknown>(
  options?: Partial<SessionManagerOptions>,
  client?: Redis,
): SessionManager<T>;
```

Defaults (`DEFAULT_OPTIONS`): `{ defaultTtlSeconds: 3600, extendOnAccess: true, extendThreshold: 0.5 }`, merged with the caller's partial options.

Client resolution: a `SessionManager` captures an optional `client` at construction; `getRedis()` is only consulted (lazily, per call) when none was provided.

### Auto-extend on access

`get(token)` reads the session, then — if it exists and `extendOnAccess` is true — calls the private `maybeExtend(token)`:

```ts
const ttl = await redis.ttl(`session:${token}`);
const minTtl = Math.floor(defaultTtlSeconds * extendThreshold);  // e.g. 3600 * 0.5 = 1800
if (ttl > 0 && ttl < minTtl) {
  await extendSession(token, defaultTtlSeconds, redis);          // bump back to full TTL
}
```

So a session whose remaining TTL has dropped below half of `defaultTtlSeconds` is renewed to the full default on the next read; sessions read while still "fresh" are left alone. This implements sliding sessions for active users while letting idle ones expire.

- `set` / `refresh` write data with `ttlSeconds ?? defaultTtlSeconds`. They are functionally identical (`refresh` exists for intent/readability — "I'm replacing this session's data").
- `touch` extends TTL only (`extendSession`), returning `false` for a non-existent session.

## Example

```ts
import { createSessionManager } from "@damatjs/redis";

interface Session { userId: string; role: string; }
const sessions = createSessionManager<Session>({ defaultTtlSeconds: 3600 });

await sessions.set(token, { userId: "123", role: "admin" });
const s = await sessions.get(token);   // also slides TTL back to 3600 if it had decayed below 1800
await sessions.touch(token, 7200);     // manual extension
await sessions.delete(token);          // logout
```

## Gotchas

- **`maybeExtend` hard-codes the key prefix** as `` `session:${token}` `` for the `TTL` read; keep that consistent with `SESSION_PREFIX` if you change the prefix.
- **The stale test bug**: `tests/sessionManager.test.ts` imports from `../src/sessionManager` (no such file — it's `src/session/manager.ts`) and passes `autoExtendThreshold` (the real option is `extendThreshold`). The unknown option is silently ignored and falls back to the `0.5` default. Treat the test as outdated, not the source.
- **Same-as-cache JSON caveats** — non-JSON-safe types don't round-trip; malformed JSON reads as `null`.

## Safe extension

Add new session operations under `src/session/` and export from `index.ts`. If you add manager behavior, route Redis access through the private `getRedis()` method so the captured/explicit client is honored, and read TTLs via `SESSION_PREFIX` rather than a literal.
