# Counters

Covers `src/counter/` (`increment.ts`, `decrement.ts`, `get.ts`, `set.ts`, `reset.ts`).

## Responsibility

Atomic integer counters using Redis `INCRBY`/`DECRBY`. Unlike the other modules, counters use **no key prefix** — the caller fully controls the key (so you can namespace however you like, e.g. `pageviews:home`).

## API

```ts
async function incrementCounter(
  key: string,
  amount = 1,
  ttlSeconds?: number,
  client?: Redis,
): Promise<number>;
async function decrementCounter(
  key: string,
  amount = 1,
  client?: Redis,
): Promise<number>;
async function getCounter(key: string, client?: Redis): Promise<number>;
async function setCounter(
  key: string,
  value: number,
  ttlSeconds?: number,
  client?: Redis,
): Promise<void>;
async function resetCounter(key: string, client?: Redis): Promise<void>;
```

## Behavior

- **`incrementCounter`** — without `ttlSeconds`, a plain `INCRBY key amount` (atomic), returning the new value. With `ttlSeconds`, a small Lua script runs `INCRBY` and then `EXPIRE` **only when the key has no TTL yet** (`TTL < 0`), so the expiry is armed on the first increment and never refreshed by later ones — a counter under steady traffic still expires on schedule.
- **`decrementCounter`** — `DECRBY key amount`, returns the new value. No TTL handling; **allows negative values** (Redis happily goes below zero).
- **`getCounter`** — `GET key`; returns `parseInt(value, 10)` or **`0`** if the key is missing.
- **`setCounter`** — `SETEX` when `ttlSeconds` is truthy, else `SET`; stores `value.toString()`.
- **`resetCounter`** — `DEL key` (so a subsequent `getCounter` returns `0`).

## Examples

```ts
// Daily page views that expire after 24h (TTL set on first increment)
const views = await incrementCounter(`pageviews:${pageId}:${today}`, 1, 86400);

// Inventory decrement (can go negative — guard in app logic if needed)
await decrementCounter(`stock:${itemId}`, 1);

const total = await getCounter(`pageviews:${pageId}:${today}`); // 0 if unset
await setCounter("feature:flag:count", 0, 3600);
await resetCounter("pageviews:home");
```

## Gotchas

- **No prefix** — collisions are the caller's responsibility; choose namespaced keys.
- **TTL is never refreshed by increments** — `ttlSeconds` only takes effect when the key has no expiry (first increment, or a counter that lost its TTL). For a rolling window, re-arm explicitly with `EXPIRE`/`setCounter`.
- **Negative values are allowed** by `decrementCounter`; enforce a floor in application code if you need one (Redis has no atomic "decrement but not below zero" here).
- **`getCounter` conflates "missing" and "zero"** — both return `0`. Use `EXISTS`/`getCounter` semantics accordingly if the distinction matters.

## Safe extension

Add operations as one-export-per-file modules under `src/counter/` and export from `index.ts`. Prefer atomic Redis commands (`INCRBY`, `INCRBYFLOAT`, etc.) over read-modify-write to preserve atomicity. If you introduce a prefix later, do it via a shared constant and update all five files together.
