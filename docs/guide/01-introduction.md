[Damat Guide](../GUIDE.md) › Introduction

# 1. Introduction

Damat is a **composable backend framework** for TypeScript, built on Bun, Hono,
Effect-TS, and PostgreSQL. Instead of one monolithic framework with
fixed opinions, you assemble exactly what your app needs from independent,
plug-and-play **modules**.

The core idea: every domain concern — users, billing, teams, webhooks — is a
**self-contained module** with its own models, migrations, service, config, and
optional route/workflow/durable providers. The backend owner registers and
composes those blades in `damat.config.ts`.

On top of the module system, Damat gives you:

- a **fluent ORM** with a type-safe model DSL and a real migration system,
- **service base classes** with auto-generated CRUD, transactions, and pooling,
- a **saga/workflow engine** (Effect-TS) with compensation and distributed locks,
- **PostgreSQL-backed jobs and durable events** with retries, leases, history,
  inspection, and controls,
- **durable pipelines** for persisted waits, branches, and multi-stage processes,
- **file-based HTTP routing** via Hono,
- **Redis utilities and optional acceleration** for cache, pub/sub, locks,
  sessions, rate limiting, wake-ups, and invalidations,
- a **unified CLI** for dev, build, migrations, codegen, and module management.

New here? Read [Concepts](./02-concepts.md) next for the mental model, then jump
to [Getting started](./03-getting-started.md).

## The package map

Damat is a Bun + Turborepo monorepo. Import APIs from the package that owns the
capability; `@damatjs/framework` also re-exports the app-facing runtime surface.

| Layer             | Packages                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App framework** | [`@damatjs/framework`](../../packages/framework/README.md) · [`@damatjs/services`](../../packages/service/README.md) · [`@damatjs/module`](../../packages/module/README.md) · [`@damatjs/module-generator`](../../packages/module-generator/README.md)                                                                                                                                                                                                   |
| **ORM**           | [`@damatjs/orm`](../../packages/orm/main/README.md) (umbrella) · [`orm-model`](../../packages/orm/model/README.md) · [`orm-pg`](../../packages/orm/pg/README.md) · [`orm-connector`](../../packages/orm/connector/README.md) · [`orm-migration`](../../packages/orm/migration/README.md) · [`orm-processor`](../../packages/orm/processor/README.md) · [`orm-core`](../../packages/orm/core/README.md) · [`orm-type`](../../packages/orm/type/README.md) |
| **Orchestration** | [`@damatjs/workflow-engine`](../../packages/workflow-engine/README.md) · [`@damatjs/durability`](../../packages/core/durability/README.md) · [`@damatjs/jobs`](../../packages/core/jobs/README.md) · [`@damatjs/events`](../../packages/core/events/README.md) · [`@damatjs/pipelines`](../../packages/core/pipelines/README.md)                                                                                                                         |
| **Core**          | [`@damatjs/logger`](../../packages/core/logger/README.md) · [`@damatjs/redis`](../../packages/core/redis/README.md) · [`@damatjs/schema-codegen`](../../packages/core/schema-codegen/README.md) · [`@damatjs/load-env`](../../packages/core/env/README.md) · [`@damatjs/types`](../../packages/core/types/README.md) · [`@damatjs/cli`](../../packages/core/cli/README.md) · [`@damatjs/deps`](../../packages/deps/README.md)                            |
| **Providers**     | [`@damatjs/provider`](../../packages/provider/README.md) · [`@damatjs/auth`](../../provider/auth/README.md) · [`@damatjs/payment`](../../provider/payment/README.md) · [`@damatjs/subscription`](../../provider/subscription/README.md)                                                                                                                                                                                                                  |
| **CLIs**          | [`@damatjs/damat-cli`](../../packages/cli/damat/README.md) (`damat`) · [`@damatjs/cli-codegen`](../../packages/cli/codegen/README.md) · [`@damatjs/orm-cli`](../../packages/orm/cli/README.md) (`damat-orm`)                                                                                                                                                                                                                                             |
| **AI**            | [`@damatjs/mcp`](../../packages/mcp/README.md) (module install over MCP)                                                                                                                                                                                                                                                                                                                                                                                 |
| **Reference app** | [`@damatjs/default`](../../backend/default/README.md)                                                                                                                                                                                                                                                                                                                                                                                                    |

Each package ships a `README.md` (overview) and a `docs/` folder (internals).
The [Package reference](./20-package-reference.md) chapter links them all.

---

[Guide home](../GUIDE.md) · Next: [Concepts →](./02-concepts.md)
