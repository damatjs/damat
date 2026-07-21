# Global logger singleton & helpers

The process-global logger and the convenience functions that wrap it. Source:
[`global.ts`](../src/global.ts). All of these are re-exported from `index.ts`.

## Responsibility

Provide one shared `Logger` per process so application code (and library code that does
not receive a logger) can log without threading an instance everywhere — plus lifecycle
controls and thin top-level convenience functions.

## State

A single module-level variable holds the singleton:

```ts
let globalLogger: Logger | null = null;
```

It starts `null` and is created lazily or set explicitly.

## Lifecycle functions

| Function                  | Behavior                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `createLogger(config?)`   | Constructs `new Logger(config)`, stores it as the global, and returns it.               |
| `setGlobalLogger(logger)` | Stores an already-constructed `Logger` as the global.                                   |
| `getLogger()`             | Returns the global logger, **lazily creating a default `new Logger()`** if none is set. |
| `clearGlobalLogger()`     | Sets the reference back to `null`. Does **not** close any file transport.               |
| `closeLogger()`           | If a global exists, calls `.close()` (flushes/closes file transport) and nulls the ref. |
| `isLoggerConfigured()`    | Returns `globalLogger !== null` (i.e. whether one has been explicitly set/created).     |

Notes:

- `getLogger()` is forgiving: calling a convenience function before configuring anything
  silently spins up a default `Logger` (level `info`, `pretty`, colors auto). That logger
  then becomes the singleton.
- `clearGlobalLogger()` vs `closeLogger()`: prefer `closeLogger()` on shutdown so the file
  transport's buffer is flushed and its interval cleared. `clearGlobalLogger()` only drops
  the reference and can leak an open transport/timer.

## `createContextLogger(context)`

[`global.ts:37`](../src/global.ts):

```ts
export function createContextLogger(context: LogContext): ILogger {
  if (globalLogger) return globalLogger.child(context);
  return NOOP_LOGGER.child(context);
}
```

Returns a child of the configured global logger, or — if none is configured — a child of
`NOOP_LOGGER` (silent). This lets request/middleware code obtain a context-scoped logger
without first asserting that the global has been set, and without accidentally creating a
default logger (unlike `getLogger()`).

## Convenience functions

Thin wrappers that call the matching method on `getLogger()`:

| Function                         | Calls                       |
| -------------------------------- | --------------------------- |
| `debug(message, context?)`       | `getLogger().debug(...)`    |
| `info(message, context?)`        | `getLogger().info(...)`     |
| `progress(message, context?)`    | `getLogger().progress(...)` |
| `cached(message, context?)`      | `getLogger().cached(...)`   |
| `waiting(message, context?)`     | `getLogger().waiting(...)`  |
| `warn(message, context?)`        | `getLogger().warn(...)`     |
| `error(message, err?, context?)` | `getLogger().error(...)`    |
| `fatal(message, err?, context?)` | `getLogger().fatal(...)`    |

> Coverage gap: there are **no** top-level convenience wrappers for `success`, `skip`, or
> `request`. Call those on a `Logger` / `getLogger()` instance directly. Each convenience
> call invokes `getLogger()`, so the first one used will instantiate the default singleton
> if none was configured.

## Typical wiring

```ts
import {
  createLogger,
  closeLogger,
  createContextLogger,
  info,
} from "@damatjs/logger";

// at startup
createLogger({
  level: (process.env.LOG_LEVEL as any) ?? "info",
  format: "json",
});

// anywhere
info("ready");
const reqLog = createContextLogger({ requestId: "req_42" });
reqLog.warn("slow");

// at shutdown
closeLogger();
```

## Gotchas

- **Lazy default surprise:** if you never call `createLogger`/`setGlobalLogger`, the first
  convenience call (or `getLogger()`) creates a default logger and `isLoggerConfigured()`
  becomes `true` afterward. Configure early if you want non-default settings.
- **`createContextLogger` does not auto-create** a global; it falls back to `NOOP_LOGGER`,
  so context loggers obtained before configuration are silent.
- **One global per process.** `createLogger`/`setGlobalLogger` overwrite the previous
  global _without_ closing it — close the old one first if it had a file transport.

## Safe extension

- When adding a new level, add a matching convenience wrapper here if it should be
  callable globally (and consider filling the existing `success`/`skip` gap while you're
  there).
- Keep `getLogger()`'s lazy-create behavior unless you intentionally want callers to fail
  loudly when unconfigured — several convenience helpers rely on it.
