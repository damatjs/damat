# Damat

**A composable backend framework for TypeScript, built on Bun.**

Damat gives you a modular, production-ready backend assembled from independent,
plug-and-play building blocks. Instead of fighting a monolithic framework's
opinions, you compose exactly what your app needs — database layer, auth,
billing, queues, workflows — each as a self-contained **module** you can author
in isolation and install into any Damat app with one command.

> Built with [Bun](https://bun.sh), [Hono](https://hono.dev),
> [Effect-TS](https://effect.website), [Better Auth](https://better-auth.com),
> and PostgreSQL.

---

## Documentation

| If you want to… | Read |
|-----------------|------|
| **Use Damat** — build an app, step by step | **[The Damat Guide](./docs/GUIDE.md)** |
| Understand the module contract & registry | [MODULES.md](./MODULES.md) |
| Work in this repo with an AI assistant | [AGENTS.md](./AGENTS.md) |
| Dive into one package (overview) | each package's `README.md` (table below) |
| Change a package's code (internals) | each package's `docs/` folder |
| Upgrade, or see what changed in a version | [releases/](./releases/README.md) |

Every package ships **two** docs: a `README.md` (overview, for users) and a
`docs/` folder (detailed internals, for maintainers). Both describe the **current
version only** — the per-version change history and upgrade steps live in
[`releases/`](./releases/README.md). See the
[Documentation & releases standard](./docs/DOCUMENTATION-STANDARD.md).

---

## Quick start

```bash
# scaffold a new app
bunx create-damat-app@latest my-app
cd my-app && bun install
cp .env.example .env          # set DATABASE_URL, etc.
bun run db:migrate
bun run dev
```

Or run the reference backend in this repo:

```bash
bun install && bun run build
cd backend/default
cp .env.example .env
docker-compose up -d db redis
bun run db:migrate && bun run dev   # http://localhost:6543
```

Full walkthrough: **[docs/GUIDE.md](./docs/GUIDE.md)**.

---

## Core ideas

- **Modules** — a self-contained slice (models + migrations + service + config +
  workflows), registered in one `damat.config.ts`. Author standalone, install
  anywhere. See [MODULES.md](./MODULES.md).
- **ORM DSL** — a fluent, type-safe model definition with a real, module-aware
  migration system.
- **Services** — base classes with auto-generated CRUD, transactions, and pooling.
- **Workflows** — a saga engine (Effect-TS) with compensation and distributed locks.
- **File-based routing** — `route.ts` files become URL paths (Hono).
- **AI-native** — discover and install modules via an [MCP server](./packages/mcp/README.md).

---

## Monorepo structure

A Bun + [Turborepo](https://turborepo.dev) monorepo. Packages are versioned
together (currently `0.0.10`).

### Framework & app

| Package | Description |
|---------|-------------|
| [`@damatjs/framework`](./packages/framework/README.md) | App framework: config, file-based router, server, bootstrap, middleware, shutdown |
| [`@damatjs/services`](./packages/service/README.md) | `ModuleService` (auto CRUD), `PoolManager`, `defineModule` |
| [`@damatjs/module`](./packages/module/README.md) | The module system: authoring surface, `module.json` contract, dev/test harness, registry |
| [`@damatjs/link`](./packages/link/README.md) | Cross-module links: junction tables, `create`/`dismiss`/`fetch`/`graph` across modules |
| [`@damatjs/workflow-engine`](./packages/workflow-engine/README.md) | Saga workflow engine on Effect-TS |

### ORM

| Package | Description |
|---------|-------------|
| [`@damatjs/orm`](./packages/orm/main/README.md) | Umbrella re-export of the ORM packages |
| [`@damatjs/orm-model`](./packages/orm/model/README.md) | Fluent model / columns DSL |
| [`@damatjs/orm-pg`](./packages/orm/pg/README.md) | PostgreSQL execution: EntityManager, Repository, query builder, transactions |
| [`@damatjs/orm-connector`](./packages/orm/connector/README.md) | Connection / pool manager |
| [`@damatjs/orm-migration`](./packages/orm/migration/README.md) | Module-aware migration system |
| [`@damatjs/orm-processor`](./packages/orm/processor/README.md) | Schema snapshot, diff, and SQL generation |
| [`@damatjs/codegen`](./packages/core/codegen/README.md) | TypeScript types from models |
| [`@damatjs/orm-core`](./packages/orm/core/README.md) | Model registry + query logging |
| [`@damatjs/orm-type`](./packages/orm/type/README.md) | Shared ORM types |

### Core

| Package | Description |
|---------|-------------|
| [`@damatjs/logger`](./packages/core/logger/README.md) | Structured logging (levels, formats, file transport) |
| [`@damatjs/redis`](./packages/core/redis/README.md) | Cache, queue, locks, sessions, rate limiting |
| [`@damatjs/load-env`](./packages/core/env/README.md) | `.env` cascade loader |
| [`@damatjs/types`](./packages/core/types/README.md) | Error classes & shared types |
| [`@damatjs/cli`](./packages/core/cli/README.md) | General CLI framework (powers the CLIs below) |
| [`@damatjs/deps`](./packages/deps/README.md) | Pinned external dependency re-exports |
| [`@damatjs/typescript-config`](./packages/typescript-config/README.md) | Shared tsconfig presets |

### CLIs & AI

| Package | Binary | Description |
|---------|--------|-------------|
| [`@damatjs/damat-cli`](./packages/cli/damat/README.md) | `damat` | Dev/build + the `module` command group |
| [`@damatjs/orm-cli`](./packages/orm/cli/README.md) | `damat-orm` | Migrations & codegen |
| [`@damatjs/create-damat-app`](./packages/cli/create-damat-app/README.md) | `create-damat-app` | Project / module scaffolding |
| [`@damatjs/mcp`](./packages/mcp/README.md) | `damat-mcp` | MCP server: discover & install modules with AI |

### Reference app

| Package | Description |
|---------|-------------|
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
bun test             # tests
```

See [AGENTS.md](./AGENTS.md) for the repo map, conventions, and how to make
common changes.

---

## Tech stack

| Category | Technology |
|----------|------------|
| Runtime | Bun 1.3+ |
| Language | TypeScript 5.x (ESM) |
| HTTP | Hono 4.x |
| ORM | damat-orm (in-repo) |
| Database | PostgreSQL + pgvector |
| Cache/queues | Redis 7 (ioredis) |
| Auth | Better Auth 1.x |
| Workflows | Effect-TS 3.x |
| Validation | Zod 4.x |
| Monorepo | Turborepo |

---

## License

MIT — see [LICENSE](./LICENSE).

## Author

Built by [Abel Lamesgen](https://github.com/damatjs).
