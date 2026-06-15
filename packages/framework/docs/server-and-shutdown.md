# Server & Shutdown

Source: `src/server/index.ts`, `src/shutdown/index.ts`.

## Server — `startServer(app, config, logger)` (`server/index.ts`)

```ts
import { serve } from "@damatjs/deps/hono";   // re-exports @hono/node-server's serve

export function startServer(app: Hono, config: ServerConfig, logger: Logger | ILogger): void {
  serve({ fetch: app.fetch, port: config.port }, (info) => {
    logger.info("Server running", { url: `http://localhost:${info.port}` });
  });
}
```

- Runs the Hono app under `@hono/node-server` (the `serve` adapter), binding to `config.port`.
- Logs the listening URL once the server is up.
- `config` is the `ServerConfig` returned by `bootstrap` (`{ port, host?, nodeEnv? }`).

> `host` is part of `ServerConfig` but is not currently passed to `serve` — the adapter binds with its default host behaviour. If you need a specific bind address, that is a small extension point (pass `hostname: config.host` to `serve`).

## Shutdown (`shutdown/index.ts`)

A module-level registry plus signal handlers for graceful teardown.

```ts
const handlers: ShutdownHandler[] = [];

export function registerShutdown(handler: ShutdownHandler): void;          // append a handler
export function setupShutdownHandlers(logger: Logger | ILogger): void;     // install process listeners
```

```ts
interface ShutdownHandler { name: string; handler: () => Promise<void> | void; }
```

### `setupShutdownHandlers(logger)`

Installs process listeners:

- `SIGINT` and `SIGTERM` → run `shutdown(signal, logger)`.
- `uncaughtException` → log and `process.exit(1)`.
- `unhandledRejection` → log and `process.exit(1)`.

### `shutdown(signal, logger)` (internal)

1. Log `Received <signal>`.
2. `await Promise.all(handlers.map(h => h.handler()))` — every registered handler runs; individual failures are swallowed (`try/catch {}`) so one bad handler can't block the rest.
3. Log `Shutdown complete`.
4. If the logger has a `close()` method, call it.
5. `process.exit(0)`.

### Who registers handlers

`entry.start()` calls `setupShutdownHandlers(logger)` and then `registerShutdown(h)` for each handler returned by `initializeServices` (`services/index.ts`):

- **database** — `closeDatabase()` (disconnects the connection manager, `PoolManager.reset()`), if `databaseUrl` was set.
- **redis** — `disconnectRedis()`, if `redisUrl` was set.
- **logger** — `closeLogger()` (always registered, last).

## Lifecycle summary

```
start():
  setupShutdownHandlers(logger)          // SIGINT/SIGTERM/uncaught/unhandled
  for h of services.shutdownHandlers: registerShutdown(h)   // db, redis, logger
  startServer(app, config, logger)       // serve()

on SIGINT/SIGTERM:
  run all handlers (db -> redis -> logger order of registration), close logger, exit(0)
```

## Gotchas

- **Handler errors are swallowed.** A throwing shutdown handler is caught and ignored so shutdown always completes. If you need to know a handler failed, log inside the handler itself.
- **`uncaught`/`unhandled` exit immediately with code 1** and do **not** run the graceful shutdown handlers. They are last-resort guards, not a cleanup path.
- **The registry is module-global and append-only.** There is no `unregister`. In long-lived test processes that re-run `start()`, handlers accumulate; isolate boots per process or reset state.
- **Logger `close()` is feature-detected** (`'close' in logger`), so non-closeable logger shapes are fine.
