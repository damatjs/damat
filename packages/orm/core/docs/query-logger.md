# QueryLogger (`src/logger.ts`)

A structured logger that drivers call to record query activity in a uniform way.
It wraps an `@damatjs/logger` `ILogger` and adds query-specific categories, each
independently switchable. A process-wide singleton lets every driver share one
configuration.

## `QueryLoggerOptions`

```ts
export interface QueryLoggerOptions {
  enabled?: boolean; // master switch        (default: true)
  logQueries?: boolean; // log every query      (default: true)
  logErrors?: boolean; // log query errors     (default: true)
  logSlowQueries?: boolean; // log slow queries     (default: true)
  slowQueryThreshold?: number; // ms threshold         (default: 1000)
  logTransaction?: boolean; // log txn boundaries   (default: true)
}
```

The constructor normalises these into a `Required<QueryLoggerOptions>` using `??`
defaults, so every flag is always defined after construction.

## Construction

```ts
constructor(options: QueryLoggerOptions = {}, logger?: ILogger)
```

If no `ILogger` is supplied it creates `new Logger({ prefix: "ORM", timestamp: true })`
from `@damatjs/logger`. Pass your own logger to integrate with the app's logging
(e.g. a child logger with request context).

## Logging methods

Every method short-circuits when disabled — the guard is always
`if (!this.options.enabled || !this.options.<category>) return;`.

```ts
logQuery(sql: string, params?: unknown[]): void
```

Debug-logs `"Query executed"` with `{ sql }` (and `params` when non-empty).

```ts
logQueryError(error: Error, sql: string, params?: unknown[]): void
```

Error-logs `"Query error"` with the `Error` and `{ sql, params? }`.

```ts
logSlowQuery(sql: string, duration: number, params?: unknown[]): void
```

Warns `"Slow query (<duration>ms)"` **only if** `duration > slowQueryThreshold`.
Context includes `sql`, `duration`, `threshold`, and `params` when present. Safe
to call on every query — it self-filters by threshold.

```ts
logTransaction(action: "begin" | "commit" | "rollback"): void
```

Debug-logs `"Transaction: <action>"`.

## Runtime controls

```ts
setOptions(options: Partial<QueryLoggerOptions>): void  // merge into current options
enable(): void                                          // options.enabled = true
disable(): void                                         // options.enabled = false
```

`enable()` / `disable()` flip only the master switch; per-category flags are
untouched.

## Global singleton helpers

```ts
let globalLogger: QueryLogger | null = null;

getQueryLogger(): QueryLogger                                   // lazily creates with defaults
setQueryLogger(logger: QueryLogger): void                       // install a specific instance
configureQueryLogger(options, logger?): QueryLogger             // build from options + install
```

- `getQueryLogger()` is what drivers call on the hot path. First call constructs
  a default `QueryLogger`; subsequent calls return the same instance.
- `configureQueryLogger(opts, logger?)` is the startup entry point: it builds a
  fresh logger and stores it as the global, returning it for convenience.
- `setQueryLogger(instance)` swaps in an already-built logger.

Usage in a driver:

```ts
import { getQueryLogger } from "@damatjs/orm-core";

const log = getQueryLogger();
const t0 = Date.now();
try {
  const res = await client.query(sql, params);
  log.logQuery(sql, params);
  log.logSlowQuery(sql, Date.now() - t0, params);
  return res;
} catch (err) {
  log.logQueryError(err as Error, sql, params);
  throw err;
}
```

(This mirrors how `@damatjs/orm-pg`'s `executor/raw.ts` and
`executor/transaction.ts` resolve a logger: `logger ?? getQueryLogger()`.)

## Edge cases & gotchas

- `params` is only attached to log context when `params?.length` is truthy —
  empty/undefined params are omitted to keep logs clean.
- The singleton is module-level state. In tests that assert on logging, reset it
  with `setQueryLogger(new QueryLogger(...))` to avoid leakage between cases.
- `slowQueryThreshold` is compared with strict `>` — a query exactly at the
  threshold is _not_ logged as slow.

## Extending

- New category: add an optional flag to `QueryLoggerOptions`, give it a default in
  the constructor's `Required<>` fill-in, and gate the new method with the
  standard `enabled && category` guard.
- Keep methods side-effect-light and synchronous — they are called inline in the
  driver's execute path.
