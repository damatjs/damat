[Damat Guide](../GUIDE.md) › Configuration & environment

# 4. Configuration & environment

Everything starts in **`damat.config.ts`**. `defineConfig` gives you a typed
config; `projectConfig` configures the server/DB/logging, and `modules`
registers each module by id.

```ts
import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv: "development",
    loggerConfig: {
      level: "debug",
      format: "pretty", // "json" | "pretty" | "simple"
      timestamp: true,
      prefix: "server",
    },
    http: {
      port: Number(process.env.PORT) || 6543,
      host: process.env.HOST || "0.0.0.0",
      corsConfig: process.env.FRONTEND_CORS,
    },
  },
  services: {
    // The reference inspection clients reuse this same policy.
    durability: {
      inspectionVisibility: "metadata",
      redaction: { keys: ["password", "token", "secret"] },
      retentionMs: 90 * 24 * 60 * 60 * 1_000,
      acceleration: { enabled: true },
    },
    jobs: { queue: "reports", concurrency: 2 },
    events: { durable: { concurrency: 2 } },
    pipelines: { queue: "pipelines", concurrency: 2 },
  },
  runtime: {
    mode: "all", // "server" | "worker" | "all"
    workers: ["jobs", "events", "pipelines"],
    shutdownGraceMs: 30_000,
  },
  // `modules` is an OBJECT keyed by module id (not an array):
  modules: {
    user: {
      resolve: "./src/modules/user", // path to the module's folder
      id: "user",
    },
  },
  providers: {
    auth: { module: "user" },
  },
});
```

`modules` is keyed by module id; an explicit `id` override is optional.
`providers` binds a standardized role to one of those initialized module
services. `damat module add` installs both ordinary and provider modules, then
reports the app-owned configuration still required.

See [`@damatjs/framework` → config internals](../../packages/framework/docs/config.md)
for the full `ProjectConfig`/`HttpConfig` type reference.

## Environment variables

Env loading ([`@damatjs/load-env`](../../packages/core/env/README.md)) cascades,
so local overrides win:

```
.env.{environment}.local   ← highest priority
.env.{environment}
.env.local
.env                       ← lowest
```

Common variables (see the default backend's `.env.example` for the full set):

| Variable                | Required | Description                                                              |
| ----------------------- | -------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`          | ✅*      | PostgreSQL — required by modules, jobs, durable events, and migrations   |
| `REDIS_URL`             | —        | Cache/pub-sub/lock backend and optional durable-work wake-up accelerator |
| `NODE_ENV`              | —        | `development` \| `production` \| `test`                                  |
| `PORT` / `HOST`         | —        | HTTP bind                                                                |
| `DAMAT_RUNTIME_MODE`    | —        | Overrides `runtime.mode`: `server` \| `worker` \| `all`                  |
| `DAMAT_WORKER_TYPES`    | —        | Overrides `runtime.workers`: comma-separated `jobs,events,pipelines`     |
| `DAMAT_MODULE_REGISTRY` | —        | Module registry index (for `module add` / MCP)                           |
| `DAMAT_MODULE_VERIFY`   | —        | `off` \| `warn` \| `require` install policy                              |

Modules declare their environment requirements in `damat.json`. `damat module
add` reports those requirements; the backend owner updates `.env` and
`.env.example` after review (see [Authoring a module](./13-authoring-modules.md)).

Runtime environment overrides are independent. Values are trimmed, worker
names are deduplicated, and unknown modes or capabilities fail startup. In
`worker` and `all`, a selected capability must be enabled under `services`.
`server` never starts workers and ignores known worker selections.

Durable jobs, events, and pipelines do not require Redis. PostgreSQL polling,
leases, recovery, and persisted inspection remain active without it. Redis
stores rebuildable wake-up, liveness, and invalidation data; PostgreSQL stores
the canonical execution and visual history.

Every process creates one PostgreSQL pool and shares it across HTTP, modules,
jobs, events, pipelines, inspection, and maintenance. Do not configure separate
pools for those services or reduce the shared pool to one physical connection.

Generated backend development scripts run `database:setup` before startup.
Standalone module development performs its capability-aware migration pass
inside `damat module dev`, before durability or workers. Normal framework
bootstrap only checks migration readiness. Production should run one explicit
migration job before any server or worker process.

## The mental model

Damat has four layers you compose — models, services, modules, and
routes/workflows. If you haven't read it yet,
[Concepts](./02-concepts.md) explains how they fit together and how the
framework wires them at startup.

---

Prev: [← Getting started](./03-getting-started.md) · [Guide home](../GUIDE.md) · Next: [Defining models →](./05-models.md)
