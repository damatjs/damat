# @damatjs/logger

> Structured, zero-dependency logger for Damat — colorized console output plus optional file transport.

`@damatjs/logger` is the logging layer used across the Damat stack. It offers ten log
levels, three output formats (`json` / `pretty` / `simple`), child & prefixed loggers
for request-scoped context, an opt-in dual-format file transport (`.log` + `.md` with
rotation), a no-op logger for tests/libraries, and a process-global singleton with
convenience helpers. It has no runtime dependencies and is consumed by nearly every
other Damat package (framework, ORM, services, CLIs, workflow engine).

Part of the [Damat](../../../README.md) monorepo · [Full guide](../../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/logger
```

Inside the monorepo it is consumed as a workspace package — depend on it with `"*"`:

```json
{
  "dependencies": {
    "@damatjs/logger": "*"
  }
}
```

## When to use

Use it when you want:

- A consistent structured logger across all Damat packages, with `context` objects and
  error capture (name/message/stack).
- Pretty colorized output in development and machine-readable `json` in production
  (switch with one config field).
- Per-request or per-module loggers via `child(context)` / `withPrefix(name)` that
  inherit and merge context automatically.
- Optional persistent logs (rotated `.log` and human-friendly `.md`) toggled by an env
  var, with zero cost when off.

Skip it when:

- You need a logging backend integration (Datadog/OTel/etc.) — this writes to the
  console and local files only.
- You are inside a library that should stay silent by default — use the exported
  `NOOP_LOGGER` / `NoopLogger` instead.

## Quick start

```ts
import { Logger, createLogger, getLogger, info } from "@damatjs/logger";

// 1. Create a logger
const logger = new Logger({ level: "debug", format: "pretty" });

logger.info("Server starting", { port: 3000 });
logger.success("Connected to database");
logger.error("Query failed", new Error("timeout"), { query: "SELECT 1" });

// 2. Scoped children — context is merged into every line
const reqLog = logger.child({ requestId: "req_123" }).withPrefix("http");
reqLog.warn("Slow response", { ms: 812 }); // includes requestId + [http] prefix

// 3. Process-global singleton + convenience helpers
createLogger({ level: "info", format: "json" }); // sets the global logger
info("Using the global logger"); // top-level helper → getLogger().info(...)
getLogger().request({
  requestId: "req_9",
  method: "GET",
  path: "/health",
  status: 200,
  duration: 4,
});
```

## API

All exports come from the single entry point `@damatjs/logger`
(`src/index.ts` re-exports `types`, `logger`, `child`, `noop`, `file-transport`,
`global`, `utils`). `colorizer`, `colors`, and `formatter` are internal and not
exported.

### Classes & instances

| Export          | Kind  | Summary                                                                                               |
| --------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `Logger`        | class | Main logger. Methods per level + `child`, `withPrefix`, `request`, `close`. Static `Logger.create()`. |
| `ChildLogger`   | class | Context/prefix-inheriting logger delegating to a parent `Logger`.                                     |
| `NoopLogger`    | class | `ILogger` that discards everything; tracks context/prefix for chaining.                               |
| `NOOP_LOGGER`   | const | A ready-made shared `NoopLogger` instance.                                                            |
| `FileTransport` | class | Buffered dual-format (`.log` + `.md`) file writer with size rotation.                                 |

### Global helpers (`global.ts`)

| Export                                                              | Kind | Summary                                                                   |
| ------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| `createLogger`                                                      | fn   | Create a `Logger` and set it as the global one.                           |
| `setGlobalLogger`                                                   | fn   | Set an existing `Logger` as the global one.                               |
| `getLogger`                                                         | fn   | Get the global `Logger`, lazily creating a default if unset.              |
| `clearGlobalLogger`                                                 | fn   | Drop the global reference (does not close transports).                    |
| `closeLogger`                                                       | fn   | Close the global logger's file transport and clear it.                    |
| `isLoggerConfigured`                                                | fn   | `true` if a global logger has been set.                                   |
| `createContextLogger`                                               | fn   | Child of the global logger (or of `NOOP_LOGGER` if none set).             |
| `debug` `info` `progress` `cached` `waiting` `warn` `error` `fatal` | fn   | Convenience wrappers that call the corresponding method on `getLogger()`. |

### Banner utilities (`utils.ts`)

| Export          | Kind | Summary                                       |
| --------------- | ---- | --------------------------------------------- |
| `separator`     | fn   | Print a `─` rule (default length 50).         |
| `successBanner` | fn   | Print a green `✓` message between separators. |
| `errorBanner`   | fn   | Print a red `✗` message between separators.   |

### `Logger` / `ILogger` methods

| Method                     | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| `debug(msg, ctx?)`         | Debug level (lowest threshold).                                 |
| `info(msg, ctx?)`          | Info level.                                                     |
| `progress(msg, ctx?)`      | Progress level.                                                 |
| `waiting(msg, ctx?)`       | Waiting level.                                                  |
| `cached(msg, ctx?)`        | Cache-hit level.                                                |
| `success(msg, ctx?)`       | Success level (green).                                          |
| `warn(msg, ctx?)`          | Warning level (→ `console.warn`).                               |
| `error(msg, error?, ctx?)` | Error level (→ `console.error`), captures error name/msg/stack. |
| `fatal(msg, error?, ctx?)` | Fatal level (→ `console.error`).                                |
| `skip(msg, ctx?)`          | Skip level (dimmed).                                            |
| `child(ctx)`               | Child logger that merges `ctx` into every entry.                |
| `withPrefix(prefix)`       | Child logger with a `[prefix]` tag (nested as `a:b`).           |
| `request(data)`            | Log an HTTP request; level derived from `status`.               |
| `close()` _(Logger only)_  | Flush & close the file transport.                               |

### Key types (`types.ts`)

```ts
type LogLevel =
  | "debug"
  | "info"
  | "progress"
  | "waiting"
  | "cached"
  | "success"
  | "warn"
  | "error"
  | "fatal"
  | "skip";

type LogFormat = "json" | "pretty" | "simple";

interface LoggerConfig {
  level?: LogLevel; // default "info"
  format?: LogFormat; // default "pretty"
  colors?: boolean; // default true (auto-disabled when not a TTY)
  timestamp?: boolean; // default true
  prefix?: string;
  file?: FileTransportConfig;
}

interface FileTransportConfig {
  enabled?: boolean; // also honors LOG_FILE / LOGGING_FILE_ON env vars
  dir?: string; // default "logs"
  maxSizeBytes?: number; // default 10 MiB
  bufferFlushMs?: number; // default 1000; 0 = flush only on close
  errorFile?: string;
  allFile?: string;
}
```

Also exported: `LogContext`, `LogEntry`, `RequestLogData`, `ILogger`.

## How it fits

**Dependencies:** none (uses only Node's `fs`/`path` built-ins).

**In-repo dependents** (depend on `@damatjs/logger` via `"*"`):

- `@damatjs/framework` · `@damatjs/services` · `@damatjs/workflow-engine`
- `@damatjs/orm-core` · `@damatjs/orm-pg` · `@damatjs/orm-connector` · `@damatjs/orm-migration` · `@damatjs/codegen` · `@damatjs/orm-cli`
- `@damatjs/module` (`packages/module`) · `@damatjs/redis` (`packages/core/redis`)
- CLIs: `damat` (`packages/cli/damat`), `@damatjs/core-cli` (`packages/core/cli`)
- `@damatjs/default` (`backend/default`)

## Documentation

- [Internals & maintainer docs](./docs/README.md) — architecture, data flow, and split
  guides for [formatting](./docs/formatting.md), the [file transport](./docs/transports.md),
  [child loggers](./docs/child-loggers.md), and the [global singleton](./docs/global.md).
- [Full Damat guide](../../../docs/GUIDE.md)

## License

MIT
