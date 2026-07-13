[Damat Guide](../GUIDE.md) › Introduction

# 1. Introduction

Damat is a **composable backend framework** for TypeScript, built on Bun, Hono,
Effect-TS, Better Auth, and PostgreSQL. Instead of one monolithic framework with
fixed opinions, you assemble exactly what your app needs from independent,
plug-and-play **modules**.

The core idea: every domain concern — users, billing, teams, webhooks — is a
**self-contained module** with its own models, migrations, service, config, and
workflows. You register modules in a single `damat.config.ts`; Damat wires them
to the database and HTTP server at startup. Modules are portable: author one in
isolation, then install it into any Damat app with a single command (or let an
AI assistant do it for you).

On top of the module system, Damat gives you:

- a **fluent ORM** with a type-safe model DSL and a real migration system,
- **service base classes** with auto-generated CRUD, transactions, and pooling,
- a **saga/workflow engine** (Effect-TS) with compensation and distributed locks,
- **file-based HTTP routing** via Hono,
- **Redis utilities** for cache, queues, locks, sessions, and rate limiting,
- a **unified CLI** for dev, build, migrations, codegen, and module management.

New here? Read [Concepts](./02-concepts.md) next for the mental model, then jump
to [Getting started](./03-getting-started.md).

## The package map

Damat is a Bun + Turborepo monorepo. You rarely import most packages directly —
the app-facing ones are `@damatjs/framework`, `@damatjs/orm-model`, and (for
standalone modules) `@damatjs/module`.

| Layer             | Packages                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App framework** | [`@damatjs/framework`](../../packages/framework/README.md) · [`@damatjs/services`](../../packages/service/README.md) · [`@damatjs/module`](../../packages/module/README.md)                                                                                                                                                                                                                                                                              |
| **ORM**           | [`@damatjs/orm`](../../packages/orm/main/README.md) (umbrella) · [`orm-model`](../../packages/orm/model/README.md) · [`orm-pg`](../../packages/orm/pg/README.md) · [`orm-connector`](../../packages/orm/connector/README.md) · [`orm-migration`](../../packages/orm/migration/README.md) · [`orm-processor`](../../packages/orm/processor/README.md) · [`orm-core`](../../packages/orm/core/README.md) · [`orm-type`](../../packages/orm/type/README.md) |
| **Workflows**     | [`@damatjs/workflow-engine`](../../packages/workflow-engine/README.md)                                                                                                                                                                                                                                                                                                                                                                                   |
| **Core**          | [`@damatjs/logger`](../../packages/core/logger/README.md) · [`@damatjs/redis`](../../packages/core/redis/README.md) · [`@damatjs/codegen`](../../packages/core/codegen/README.md) [`@damatjs/load-env`](../../packages/core/env/README.md) · [`@damatjs/types`](../../packages/core/types/README.md) · [`@damatjs/cli`](../../packages/core/cli/README.md) · [`@damatjs/deps`](../../packages/deps/README.md)                                            |
| **CLIs**          | [`@damatjs/damat-cli`](../../packages/cli/damat/README.md) (`damat`) · [`@damatjs/orm-cli`](../../packages/orm/cli/README.md) (`damat-orm`)                                                                                                                                                                                                                                                                                                              |
| **AI**            | [`@damatjs/mcp`](../../packages/mcp/README.md) (module install over MCP)                                                                                                                                                                                                                                                                                                                                                                                 |
| **Reference app** | [`@damatjs/default`](../../backend/default/README.md)                                                                                                                                                                                                                                                                                                                                                                                                    |

Each package ships a `README.md` (overview) and a `docs/` folder (internals).
The [Package reference](./20-package-reference.md) chapter links them all.

---

[Guide home](../GUIDE.md) · Next: [Concepts →](./02-concepts.md)
