# Damat

**A composable backend framework for TypeScript, built on Bun.**

Damat gives you a modular backend assembled from independent, portable domain
blades. Applications combine modules with file-based HTTP routes, in-process
workflows, PostgreSQL-backed jobs and events, and durable, inspectable pipelines.
PostgreSQL remains authoritative; Redis is an optional acceleration and
application-infrastructure layer.

> Built with [Bun](https://bun.sh), [Hono](https://hono.dev),
> [Effect-TS](https://effect.website), and PostgreSQL.

---

## Documentation

| If you want to…                            | Read                                     |
| ------------------------------------------ | ---------------------------------------- |
| **Use Damat** — build an app, step by step | **[The Damat Guide](./docs/GUIDE.md)**   |
| Understand the module contract & registry  | [MODULES.md](./MODULES.md)               |
| Work in this repo with an AI assistant     | [AGENTS.md](./AGENTS.md)                 |
| Dive into one package (overview)           | each package's `README.md` (table below) |
| Change a package's code (internals)        | each package's `docs/` folder            |
| Upgrade, or see what changed in a version  | [releases/](./releases/README.md)        |

Every package ships **two** docs: a `README.md` (overview, for users) and a
`docs/` folder (detailed internals, for maintainers). Both describe the **current
version only** — the per-version change history and upgrade steps live in
[`releases/`](./releases/README.md). See the
[Documentation & releases standard](./docs/DOCUMENTATION-STANDARD.md).

---

## Quick start

```bash
# asks for PostgreSQL credentials, scaffolds, installs, creates DB, and migrates
bunx @damatjs/damat-cli@latest create my-app
cd my-app
bun run dev
```

Or run the reference backend in this repo:

```bash
bun install && bun run build
cd backend/default
cp .env.example .env
docker compose up -d db redis
bun run db:setup && bun run dev   # http://localhost:6543
```

Full walkthrough: **[docs/GUIDE.md](./docs/GUIDE.md)**.

---

## Core ideas

- **Modules** — a self-contained slice that may provide models, migrations,
  config, routes, workflows, jobs, events, and pipelines. Author standalone;
  let the backend owner compose it. See [MODULES.md](./MODULES.md).
- **ORM DSL** — a fluent, type-safe model definition with a real, module-aware
  migration system.
- **Services** — base classes with auto-generated CRUD, transactions, and pooling.
- **Workflows** — an in-process saga engine with compensation and distributed locks.
- **Durable jobs and events** — PostgreSQL-backed attempts, leases, retries,
  progress, logs, controls, and inspection.
- **Pipelines** — durable, inspectable graphs that compose jobs, events,
  workflows, waits, branches, and child processes.
- **File-based routing** — `route.ts` files become URL paths (Hono).
- **AI-native** — discover and install modules via an [MCP server](./packages/mcp/README.md).

---

## Monorepo structure

A Bun + [Turborepo](https://turborepo.dev) monorepo. Packages share a release
cadence (managed with [Changesets](https://github.com/changesets/changesets))
and are published together; see [releases/](./releases/README.md) for the
version history.

### Framework & app

| Package                                                              | Description                                                                             |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [`@damatjs/framework`](./packages/framework/README.md)               | App framework: config, file-based router, server, bootstrap, middleware, shutdown       |
| [`@damatjs/services`](./packages/service/README.md)                  | `ModuleService` (auto CRUD), `PoolManager`, `defineModule`                              |
| [`@damatjs/module`](./packages/module/README.md)                     | The module system: authoring surface, `damat.json` contract, dev/test harness, registry |
| [`@damatjs/module-generator`](./packages/module-generator/README.md) | Model discovery, generated registries, CRUD scaffolds, and workflow barrels             |
| [`@damatjs/link`](./packages/link/README.md)                         | Cross-module links: junction tables, `create`/`dismiss`/`fetch`/`graph` across modules  |
| [`@damatjs/workflow-engine`](./packages/workflow-engine/README.md)   | Saga workflow engine on Effect-TS                                                       |

### ORM

| Package                                                               | Description                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`@damatjs/orm`](./packages/orm/main/README.md)                       | Umbrella re-export of the ORM packages                                       |
| [`@damatjs/orm-model`](./packages/orm/model/README.md)                | Fluent model / columns DSL                                                   |
| [`@damatjs/orm-pg`](./packages/orm/pg/README.md)                      | PostgreSQL execution: EntityManager, Repository, query builder, transactions |
| [`@damatjs/orm-connector`](./packages/orm/connector/README.md)        | Connection / pool manager                                                    |
| [`@damatjs/orm-migration`](./packages/orm/migration/README.md)        | Module-aware migration system                                                |
| [`@damatjs/orm-processor`](./packages/orm/processor/README.md)        | Schema snapshot, diff, and SQL generation                                    |
| [`@damatjs/schema-codegen`](./packages/core/schema-codegen/README.md) | Pure TypeScript and Zod source generation from module schemas                |
| [`@damatjs/orm-core`](./packages/orm/core/README.md)                  | Model registry + query logging                                               |
| [`@damatjs/orm-type`](./packages/orm/type/README.md)                  | Shared ORM types                                                             |

### Core

| Package                                                                | Description                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`@damatjs/durability`](./packages/core/durability/README.md)          | Shared PostgreSQL durability, inspection, and acceleration contracts |
| [`@damatjs/pipelines`](./packages/core/pipelines/README.md)            | Durable orchestration across jobs, events, workflows, and waits      |
| [`@damatjs/logger`](./packages/core/logger/README.md)                  | Structured logging (levels, formats, file transport)                 |
| [`@damatjs/redis`](./packages/core/redis/README.md)                    | Cache, queue, locks, sessions, rate limiting                         |
| [`@damatjs/events`](./packages/core/events/README.md)                  | Typed event bus plus PostgreSQL-canonical durable event delivery     |
| [`@damatjs/jobs`](./packages/core/jobs/README.md)                      | Background jobs: workers, retries/backoff, dead-lettering            |
| [`@damatjs/load-env`](./packages/core/env/README.md)                   | `.env` cascade loader                                                |
| [`@damatjs/types`](./packages/core/types/README.md)                    | Error classes & shared types                                         |
| [`@damatjs/cli`](./packages/core/cli/README.md)                        | General CLI framework (powers the CLIs below)                        |
| [`@damatjs/deps`](./packages/deps/README.md)                           | Pinned external dependency re-exports                                |
| [`@damatjs/typescript-config`](./packages/typescript-config/README.md) | Shared tsconfig presets                                              |

### Providers

| Package                                                      | Description                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| [`@damatjs/provider`](./packages/provider/README.md)         | `ModuleService` provider-role authoring base and binding contracts |
| [`@damatjs/auth`](./provider/auth/README.md)                 | Auth and API-key service contract plus strict authoring base       |
| [`@damatjs/payment`](./provider/payment/README.md)           | Strict payment service contract                                    |
| [`@damatjs/subscription`](./provider/subscription/README.md) | Strict recurring subscription service contract                     |

### CLIs & AI

| Package                                                    | Binary      | Description                                    |
| ---------------------------------------------------------- | ----------- | ---------------------------------------------- |
| [`@damatjs/damat-cli`](./packages/cli/damat/README.md)     | `damat`     | Dev/build + the `module` command group         |
| [`@damatjs/cli-codegen`](./packages/cli/codegen/README.md) | capability  | `damat codegen` and `damat barrel` adapters    |
| [`@damatjs/orm-cli`](./packages/orm/cli/README.md)         | `damat-orm` | Migrations                                     |
| [`@damatjs/mcp`](./packages/mcp/README.md)                 | `damat-mcp` | MCP server: discover & install modules with AI |

### Reference app

| Package                                           | Description                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| [`@damatjs/default`](./backend/default/README.md) | A complete worked example wiring everything together |

---

## Development

```bash
bun install          # install workspace deps
bun run build        # build all packages (turbo)
bun run dev          # dev (persistent)
bun run lint         # lint
bun run check-types  # typecheck
bun run format       # prettier
bun run test         # isolated tests + managed PostgreSQL/Redis + coverage audit
bun run test:sites   # production browser routes, interactions, and accessibility
```

The root test runner migrates a dedicated recovery database, executes real
SIGKILL recovery with both healthy and unavailable Redis, and rejects any
instrumentable production source file absent from its package's LCOV report.
`bun run check:release` adds clean-checkout, dependency vulnerability, secret,
and deployment-security gates. The production-readiness workflow also performs
a split-role container deployment, least-privilege checks, smoke/load probes,
backup restoration, and runtime rollback.

See [AGENTS.md](./AGENTS.md) for the repo map, conventions, and how to make
common changes.

---

## Tech stack

| Category     | Technology                                             |
| ------------ | ------------------------------------------------------ |
| Runtime      | Bun 1.3+                                               |
| Language     | TypeScript 5.x (ESM)                                   |
| HTTP         | Hono 4.x                                               |
| ORM          | damat-orm (in-repo)                                    |
| Database     | PostgreSQL + pgvector                                  |
| Acceleration | Redis 7 (ioredis)                                      |
| Auth         | Provider contract (engine supplied by the application) |
| Workflows    | Effect-TS 3.x                                          |
| Validation   | Zod 4.x                                                |
| Monorepo     | Turborepo                                              |

---

## License

MIT — see [LICENSE](./LICENSE).

## Author

Built by [Abel Lamesgen](https://github.com/damatjs).
