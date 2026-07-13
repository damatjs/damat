[Damat Guide](../GUIDE.md) › Logging

# 11. Logging

[`@damatjs/logger`](../../packages/core/logger/README.md) is a structured logger
used by the framework and available to your app code.

## Getting a logger

```ts
import { getLogger, createLogger } from "@damatjs/logger";

const log = getLogger(); // the shared global logger
// or configure your own (also becomes the global one):
const log2 = createLogger({ level: "debug", format: "pretty" });
```

Inside a framework app you rarely call `createLogger` yourself — set
`projectConfig.loggerConfig` in `damat.config.ts` (see
[Configuration](./04-configuration.md)) and the framework configures the global
logger at startup.

## Levels, formats, and config

```ts
interface LoggerConfig {
  level?:
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
  format?: "json" | "pretty" | "simple";
  colors?: boolean;
  timestamp?: boolean;
  prefix?: string;
  file?: {
    // optional file transport
    enabled?: boolean;
    dir?: string; // where log files go
    errorFile?: string; // errors-only file
    allFile?: string; // everything file
    maxSizeBytes?: number;
    bufferFlushMs?: number;
  };
}
```

Use `json` in production (machine-readable lines), `pretty` in dev (colored,
human-first), `simple` for plain text.

## Logging with context

Every method takes an optional context object that is emitted as structured
fields:

```ts
log.info("user created", { userId: user.id });
log.error("payment failed", err, { orderId }); // error methods take the error too

// scoped loggers carry their context on every line:
const reqLog = log.child({ requestId });
reqLog.info("handling request"); // includes requestId

// or just a prefix:
const dbLog = log.withPrefix("db");
```

Besides the usual `debug/info/warn/error/fatal`, there are CLI-friendly levels
the framework's own tooling uses: `success`, `progress`, `waiting`, `cached`,
and `skip`.

---

Prev: [← Redis](./10-redis.md) · [Guide home](../GUIDE.md) · Next: [The default backend →](./12-default-backend.md)
