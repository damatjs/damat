# The Damat Guide

A step-by-step walkthrough of Damat — from zero to a running, modular backend,
then deeper into every building block. This is the **usage** guide: start at the
top, and jump to the section you need from the table of contents. For the
internals of any package (if you're changing its code), follow the
*Internals* links into each package's `docs/`.

> **New to Damat?** Read [What is Damat?](#1-what-is-damat) and
> [Getting started](#3-getting-started), then come back for the rest.

---

## Table of contents

1. [What is Damat?](#1-what-is-damat)
2. [Prerequisites](#2-prerequisites)
3. [Getting started](#3-getting-started)
4. [Project structure](#4-project-structure)
5. [Configuration (`damat.config.ts`)](#5-configuration-damatconfigts)
6. [The mental model](#6-the-mental-model)
7. [Defining models (the ORM DSL)](#7-defining-models-the-orm-dsl)
8. [Migrations](#8-migrations)
9. [Modules & services](#9-modules--services)
10. [Building HTTP APIs](#10-building-http-apis)
11. [Workflows (the saga engine)](#11-workflows-the-saga-engine)
12. [Redis: cache, queue, locks, rate limiting](#12-redis-cache-queue-locks-rate-limiting)
13. [Logging](#13-logging)
14. [Environment variables](#14-environment-variables)
15. [The default backend, end to end](#15-the-default-backend-end-to-end)
16. [Authoring a module](#16-authoring-a-module)
17. [Installing existing modules](#17-installing-existing-modules)
18. [Installing modules with AI (MCP)](#18-installing-modules-with-ai-mcp)
19. [CLI reference](#19-cli-reference)
20. [Deployment](#20-deployment)
21. [Package reference](#21-package-reference)
22. [Troubleshooting](#22-troubleshooting)

---

## 1. What is Damat?

Damat is a **composable backend framework** for TypeScript, built on Bun, Hono,
Effect-TS, Better Auth, and PostgreSQL. Instead of one monolithic framework with
fixed opinions, you assemble exactly what your app needs from independent,
plug-and-play **modules**.

The core idea: every domain concern — users, billing, teams, webhooks — is a
**self-contained module** with its own models, migrations, service, config, and
workflows. You register modules in one config file; Damat wires them to the
database and HTTP server at startup. Modules are portable: author one in
isolation, then install it into any Damat app with a single command (or let an
AI assistant do it for you).

On top of the module system, Damat gives you:

- a **fluent ORM** with a type-safe model DSL and a real migration system,
- **service base classes** with auto-generated CRUD, transactions, and pooling,
- a **saga/workflow engine** (Effect-TS) with compensation and distributed locks,
- **file-based HTTP routing** via Hono,
- **Redis utilities** for cache, queues, locks, sessions, and rate limiting,
- a **unified CLI** for dev, build, migrations, codegen, and module management.

### The package map

Damat is a Bun + Turborepo monorepo. You rarely import most packages directly —
the app-facing ones are `@damatjs/framework`, `@damatjs/orm-model`, and (for
standalone modules) `@damatjs/module`.

| Layer | Packages |
|-------|----------|
| **App framework** | [`@damatjs/framework`](../packages/framework/README.md) · [`@damatjs/services`](../packages/service/README.md) · [`@damatjs/module`](../packages/module/README.md) |
| **ORM** | [`@damatjs/orm`](../packages/orm/main/README.md) (umbrella) · [`orm-model`](../packages/orm/model/README.md) · [`orm-pg`](../packages/orm/pg/README.md) · [`orm-connector`](../packages/orm/connector/README.md) · [`orm-migration`](../packages/orm/migration/README.md) · [`orm-processor`](../packages/orm/processor/README.md) · [`orm-codegen`](../packages/orm/codegen/README.md) · [`orm-core`](../packages/orm/core/README.md) · [`orm-type`](../packages/orm/type/README.md) |
| **Workflows** | [`@damatjs/workflow-engine`](../packages/workflow-engine/README.md) |
| **Core** | [`@damatjs/logger`](../packages/core/logger/README.md) · [`@damatjs/redis`](../packages/core/redis/README.md) · [`@damatjs/load-env`](../packages/core/env/README.md) · [`@damatjs/types`](../packages/core/types/README.md) · [`@damatjs/cli`](../packages/core/cli/README.md) · [`@damatjs/deps`](../packages/deps/README.md) |
| **CLIs** | [`@damatjs/damat-cli`](../packages/cli/damat/README.md) (`damat`) · [`@damatjs/orm-cli`](../packages/orm/cli/README.md) (`damat-orm`) · [`@damatjs/create-damat-app`](../packages/cli/create-damat-app/README.md) |
| **AI** | [`@damatjs/mcp`](../packages/mcp/README.md) (module install over MCP) |
| **Reference app** | [`@damatjs/default`](../backend/default/README.md) |

---

## 2. Prerequisites

- **[Bun](https://bun.sh) ≥ 1.1** — the runtime and package manager (Bun runs
  TypeScript directly; there is no separate compile step in dev).
- **PostgreSQL 15+** — with the [`pgvector`](https://github.com/pgvector/pgvector)
  extension if you want vector columns.
- **Redis 7+** *(optional)* — only needed for cache, queues, distributed locks,
  sessions, and rate limiting.

The fastest way to get Postgres + Redis locally is the `docker-compose.yml` that
ships with the default backend (see [Deployment](#20-deployment)).

---

## 3. Getting started

### Option A — scaffold a new app

```bash
bunx create-damat-app@latest my-app
cd my-app
bun install
cp .env.example .env        # then edit DATABASE_URL etc.
bun run db:migrate          # apply migrations
bun run dev                 # start the dev server (hot reload)
```

`create-damat-app` clones a starter, prepares the project, and can optionally
create a Postgres database for you. See
[its docs](../packages/cli/create-damat-app/README.md) for flags
(`--module`, `--use-bun`, `--directory-path`, …).

### Option B — run this monorepo's reference backend

```bash
git clone https://github.com/damatjs/damat.git
cd damat
bun install
bun run build                       # build all packages

cd backend/default
cp .env.example .env
docker-compose up -d db redis       # start Postgres + Redis
bun run db:migrate                  # apply migrations
bun run dev                         # start at http://localhost:6543
```

Once running, hit the health check:

```bash
curl http://localhost:6543/health
```

---

## 4. Project structure

A Damat app is organized around modules and file-based routes:

```
my-app/
├── damat.config.ts          # the single entry point: project config + modules
├── .env                     # secrets and connection strings
├── package.json             # scripts call the `damat` / `damat-orm` CLIs
└── src/
    ├── api/
    │   ├── middleware/       # Hono middleware (auth, etc.)
    │   └── routes/           # file-based routes -> URL paths
    │       ├── posts/route.ts            # GET/POST  /posts
    │       └── users/[userId]/route.ts   # GET/PUT/DELETE /users/:userId
    ├── modules/             # your domain modules
    │   └── user/
    │       ├── index.ts      # defineModule(...)
    │       ├── service.ts    # ModuleService({ models, credentialsSchema })
    │       ├── config/       # credentials schema + loader
    │       ├── models/       # ORM models
    │       ├── migrations/   # SQL migrations
    │       └── types/        # generated row types + zod schemas
    ├── links/               # cross-module relationships
    └── workflows/           # saga workflows + steps
```

The two files you touch most: **`damat.config.ts`** (wire-up) and the files
inside **`src/modules/<name>/`** (your domain logic).

---

## 5. Configuration (`damat.config.ts`)

Everything starts here. `defineConfig` gives you a typed config; `projectConfig`
configures the server/DB/logging, and `modules` registers each module by id.

```ts
import { defineConfig } from "@damatjs/framework";

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL,
    nodeEnv: "development",
    loggerConfig: {
      level: "debug",
      format: "pretty",       // "json" | "pretty" | "simple"
      timestamp: true,
      prefix: "server",
    },
    http: {
      port: Number(process.env.PORT) || 6543,
      host: process.env.HOST || "0.0.0.0",
      corsConfig: process.env.FRONTEND_CORS,
    },
  },
  // `modules` is an OBJECT keyed by module id (not an array):
  modules: {
    user: {
      resolve: "./src/modules/user",   // path to the module's folder
      id: "user",
    },
  },
});
```

> **Heads up:** older docs showed `modules` as an array — it is now a keyed
> object `{ [id]: { resolve, id } }`. When you install a module with
> `damat module add`, this block is updated for you.

See [`@damatjs/framework` → config internals](../packages/framework/docs/config.md)
for the full `ProjectConfig`/`HttpConfig` type reference.

---

## 6. The mental model

Damat has four layers you compose:

1. **Models** define your tables (the [ORM DSL](#7-defining-models-the-orm-dsl)).
2. **Services** turn models into typed CRUD + business logic
   ([ModuleService](#9-modules--services)).
3. **Modules** bundle models + service + config + migrations into a portable
   unit registered in `damat.config.ts`.
4. **Routes** and **workflows** expose and orchestrate that logic
   ([HTTP](#10-building-http-apis), [workflows](#11-workflows-the-saga-engine)).

A typical request: `route → module service (CRUD/transaction) → ORM → Postgres`.
A multi-step operation that must roll back on failure: `route → workflow → steps
→ module services`, with the engine running compensations if a step throws.

---

## 7. Defining models (the ORM DSL)

Models are defined with a fluent, type-safe DSL from
[`@damatjs/orm-model`](../packages/orm/model/README.md). `model(table, columns)`
returns a definition you can refine with `.indexes()`, `.constrain()`,
`.timestamps()`, and `.softDelete()`.

```ts
import { model, columns } from "@damatjs/orm-model";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),

  // relations reference the target table name
  accounts: columns.hasMany("accounts"),
  sessions: columns.hasMany("sessions"),
}).indexes([
  columns.indexes().columns(["email"]).unique(),
]);

export default UserModel;
```

### Columns

The DSL covers the PostgreSQL type system. Common builders:

| Group | Builders |
|-------|----------|
| Identity | `id({ prefix? })`, `uuid()` |
| Strings | `text()`, `varchar(length?)`, `char(length?)` |
| Numbers | `integer()`, `numeric(precision?, scale?)`, `real()`, `doublePrecision()`, `money()` |
| Boolean | `boolean()` |
| Temporal | `timestamp({ withTimezone? })`, `date()`, `time()`, `interval()` |
| JSON | `json()`, `jsonb()` |
| Binary | `bytea()` |
| Enum | `enum(values)` |
| Vector | `vector(dimensions)` — pgvector |
| Relations | `belongsTo(target)`, `hasMany(target)`, `hasOne(target)` |

Modifiers chain: `.primaryKey()`, `.unique()`, `.nullable()`,
`.default(value)`, `.defaultNow()`, `.length(n)`, `.name("col_name")`,
`.autoincrement()`. See the
[orm-model column reference](../packages/orm/model/docs/README.md) for the
complete list and exact semantics.

### Relations, indexes, constraints

```ts
export const AccountModel = model("accounts", {
  id: columns.id({ prefix: "acc" }).primaryKey(),
  userId: columns.text(),
  provider: columns.text(),
  user: columns.belongsTo("users"),   // FK -> users
})
  .indexes([columns.indexes().columns(["userId"])])
  .timestamps();                       // adds createdAt / updatedAt
```

Cross-module relationships live in `src/links/` so modules stay decoupled — see
the [default backend](#15-the-default-backend-end-to-end).

---

## 8. Migrations

Damat's migration system ([`@damatjs/orm-migration`](../packages/orm/migration/README.md))
is **module-aware**: each module owns a `migrations/` folder, and applied
migrations are tracked **per module** so modules can be added and migrated
independently. The `damat-orm` CLI drives it.

```bash
bun run db:create add_users        # generate a migration from model changes
bun run db:migrate                 # apply all pending migrations
bun run db:status                  # what's applied vs pending
bun run db:revert                  # roll back the last migration
```

Those scripts map to the [`damat-orm`](../packages/orm/cli/README.md) commands
(`migrate:create`, `migrate:up`, `migrate:status`, `migrate:revert`,
`migrate:list`). Generation diffs your current models against a snapshot and
emits SQL via [`@damatjs/orm-processor`](../packages/orm/processor/README.md).

> Applied migrations are recorded in a tracking table so re-running `migrate:up`
> is safe and idempotent.

---

## 9. Modules & services

A module is the unit of composition. It has three small pieces.

### 9.1 The service

`ModuleService({ models, credentialsSchema })` returns a base class that
**auto-generates CRUD** for every model you register, keyed by the model's name.

```ts
// src/modules/user/service.ts
import { ModuleService } from "@damatjs/framework";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "./models";
import { schema } from "./config/schema";

export const models = {
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
  verification: VerificationModel,
};

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: schema,
}) {
  // Add domain methods on top of the generated CRUD:
  async findByEmail(email: string) {
    return this.user.find({ where: { email } });
  }

  async createWithAccount(email: string, provider: string) {
    return this.transaction(async () => {
      const user = await this.user.create({ data: { email } });
      await this.account.create({ data: { userId: user.id, provider } });
      return user;
    });
  }
}
```

Each registered model gets methods like `create`, `createMany`, `find`,
`findMany`, `findById`, `update`, `delete`, `softDelete`, `restore`, `count`,
`exists`, plus `this.transaction(cb)`. Full list and options:
[`@damatjs/services` → module-service internals](../packages/service/docs/module-service.md).

### 9.2 Credentials (config)

A module declares a zod schema for the config it needs and a loader that reads it
from the environment. This keeps secrets typed and validated at startup.

```ts
// src/modules/user/config/schema.ts
import { z } from "@damatjs/deps/zod";
export const schema = z.object({
  betterAuth: z.object({
    betterAuthSecret: z.string().min(32),
    sessionMaxAge: z.coerce.number().default(604800),
  }),
});

// src/modules/user/config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({
  betterAuth: {
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    sessionMaxAge: env.SESSION_MAX_AGE,
  },
});
```

### 9.3 The module definition

```ts
// src/modules/user/index.ts
import { defineModule } from "@damatjs/framework";
import { UserModuleService, models } from "./service";
import credentials from "./config";   // { schema, load }

export const USER_MODULE = "user";
export { UserModuleService, models };

export default defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials: credentials.load,
});
```

Register it in `damat.config.ts` (see [§5](#5-configuration-damatconfigts)).
At runtime, get a module's service anywhere with `getModule`:

```ts
import { getModule } from "@damatjs/framework";
const users = getModule("user");
await users.user.create({ data: { email: "a@b.co" } });
```

> The same module can be **developed and tested in isolation** as a standalone
> package — see [Authoring a module](#16-authoring-a-module).

---

## 10. Building HTTP APIs

Routing is **file-based**: every `route.ts` under `src/api/routes/` becomes a URL
path, and the HTTP method exports (`GET`, `POST`, `PUT`, `DELETE`, …) become
handlers. Dynamic segments use `[param]` folders. Handlers receive the Hono
context.

```ts
// src/api/routes/posts/route.ts  ->  /posts
import { RouteHandler } from "@damatjs/framework/router";

export const GET: RouteHandler = async (c) => {
  return c.json({ success: true, data: { posts: [] } });
};

export const POST: RouteHandler = async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, data: body }, 201);
};
```

For typed params, use `defineRoute<Params>`:

```ts
// src/api/routes/users/[userId]/route.ts  ->  /users/:userId
import { defineRoute } from "@damatjs/framework/router";

export const GET = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({ success: true, data: { id: params.userId } });
});
```

Combine routes with module services via `getModule` and add cross-cutting
middleware in `src/api/middleware/`. Routing, the scanner, and middleware are
documented in
[`@damatjs/framework` → router internals](../packages/framework/docs/router.md).

---

## 11. Workflows (the saga engine)

For multi-step operations that must **roll back cleanly on failure**, use
[`@damatjs/workflow-engine`](../packages/workflow-engine/README.md). It
implements the saga pattern on Effect-TS: each step has a forward action and an
optional **compensation**; if a later step fails, the engine runs the
compensations of completed steps in reverse.

### A step (with compensation)

```ts
import { createStep } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";

export const createProfileStep = createStep<NewUser, User>(
  "create-profile",
  async (input, ctx) => {                       // forward
    const users = getModule("user");
    return users.user.create({ data: { email: input.email }, returning: ["id", "email"] });
  },
  async (input, output, ctx) => {               // compensation (rollback)
    getModule("user").user.delete({ where: { id: output.id } });
  },
  { timeoutMs: 10_000, description: "Create user profile" },
);
```

### A workflow

Workflows compose steps inside an Effect generator with `executeStep`:

```ts
import { createWorkflow, executeStep, Effect } from "@damatjs/workflow-engine";

export const userOnboardingWorkflow = createWorkflow<NewUser, { user: User; emailSent: boolean }>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      const user = yield* executeStep(createProfileStep, input, ctx);
      const email = yield* executeStep(sendWelcomeEmailStep, user, ctx);
      return { user, emailSent: email.sent };
    }),
  { timeoutMs: 60_000 },
);
```

### Running one

```ts
const result = await userOnboardingWorkflow.execute(input);
// or, to prevent concurrent runs for the same key:
const result = await userOnboardingWorkflow.executeWithLock(input, {
  lockId: input.email,
  ttlMs: 60_000,
});

if (result.success) {
  // result.result, result.executionId, result.durationMs
} else {
  // result.error.message, result.error.code, result.compensated
}
```

Retry policies, control flow (`parallel` / `when` / `ifElse`), distributed
locking, and the error classes are all covered in the
[workflow-engine internals](../packages/workflow-engine/docs/README.md).
Distributed locks are backed by [`@damatjs/redis`](#12-redis-cache-queue-locks-rate-limiting).

---

## 12. Redis: cache, queue, locks, rate limiting

[`@damatjs/redis`](../packages/core/redis/README.md) provides batteries-included
Redis helpers. Initialize the client once (the framework does this when
`redisUrl` is set), then use the helpers.

```ts
import {
  initRedis, cacheGet, cacheSet,
  checkRateLimit, withLock, RedisQueue,
} from "@damatjs/redis";

initRedis(process.env.REDIS_URL!);

// cache with TTL
await cacheSet("user:1", user, 60);
const cached = await cacheGet("user:1");

// sliding-window rate limit
const { allowed } = await checkRateLimit("ip:1.2.3.4", { limit: 100, windowMs: 60_000 });

// distributed lock
await withLock("import-job", { ttlMs: 30_000 }, async () => { /* critical section */ });

// background queue
const queue = new RedisQueue("emails");
await queue.enqueue({ to: "a@b.co" });
```

It also covers sessions and counters. See the
[redis internals](../packages/core/redis/docs/README.md) for every helper and
its options.

---

## 13. Logging

[`@damatjs/logger`](../packages/core/logger/README.md) is a structured logger
with levels (`debug`/`info`/`success`/`warn`/`error`/`fatal`/`skip`), formats
(`json`/`pretty`/`simple`), child/prefixed loggers, and optional file transport.
Configure it via `projectConfig.loggerConfig`; access it through the global
helpers or a child logger:

```ts
import { getGlobalLogger } from "@damatjs/logger";
const log = getGlobalLogger().child({ requestId });
log.info("user created", { userId });
```

---

## 14. Environment variables

Env loading ([`@damatjs/load-env`](../packages/core/env/README.md)) cascades, so
local overrides win:

```
.env.{environment}.local   ← highest priority
.env.{environment}
.env.local
.env                       ← lowest
```

Common variables (see the default backend's `.env.example` for the full set):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | — | Redis URL (enables cache/queues/locks/rate limiting) |
| `NODE_ENV` | — | `development` \| `production` \| `test` |
| `PORT` / `HOST` | — | HTTP bind |
| `BETTER_AUTH_SECRET` | ✅* | Auth secret (min 32 chars) — *if using the auth module* |
| `DAMAT_MODULE_REGISTRY` | — | Module registry index (for `module add` / MCP) |
| `DAMAT_MODULE_VERIFY` | — | `off` \| `warn` \| `require` install policy |

Modules declare their own env vars in `module.json`; `damat module add` syncs
them into `.env.example` for you (see [§16](#16-authoring-a-module)).

---

## 15. The default backend, end to end

[`@damatjs/default`](../backend/default/README.md) is a complete reference app
demonstrating the whole framework: a `user` module (Better Auth models),
file-based routes (`/health`, `/posts`, `/users/:userId`, `/workflows`),
cross-module `links/`, a `user-onboarding` saga workflow, Redis usage, and a
Docker setup. Read it alongside this guide as a worked example — most patterns
here are taken directly from it. Its README has the full route and feature list.

---

## 16. Authoring a module

A module can be developed and shipped as a **standalone package**, with no
backend app around it. This is what [`@damatjs/module`](../packages/module/README.md)
enables, and it's how shareable modules are built.

### Scaffold and develop

```bash
damat module init my-module      # scaffold a standalone module package
cd my-module
damat module dev                 # run the module as a live app (its own server)
```

Inside the package you write the same `index.ts` / `service.ts` / `models/`
you would in an app. For modules, import the authoring surface from
`@damatjs/module` (a single import for `defineModule`, `ModuleService`,
`model`/`columns`, the workflow engine, route types, and zod):

```ts
import { defineModule, ModuleService, model, columns } from "@damatjs/module";
```

### Test it in isolation

The harness boots the same infrastructure the framework uses (connection
manager + pool), applies the module's own migrations, and initializes it — so
you can test the service without a server:

```ts
import { withModule } from "@damatjs/module";
import userModule from "./index";

await withModule(userModule, { moduleDir: import.meta.dir }, async ({ service }) => {
  await service.user.create({ data: { email: "a@b.co" } });
  expect(await service.user.exists({ where: { email: "a@b.co" } })).toBe(true);
});
```

### Tooling

```bash
damat module migration:create    # diff models -> a migration
damat module codegen             # generate row types + zod schemas
damat module validate            # contract + registry-readiness check
```

### Make it portable: `module.json`

Ship a `module.json` next to `index.ts`. It declares the module's name, version,
required env vars, npm packages, dependencies on other modules, and registry
metadata. This is the contract `damat module add` reads. **Full reference:**
[MODULES.md](../MODULES.md).

```jsonc
{
  "name": "user",
  "version": "0.1.0",
  "description": "Auth, sessions and accounts.",
  "env": [{ "name": "BETTER_AUTH_SECRET", "required": true, "example": "min-32-chars…" }],
  "packages": { "better-auth": "^1.4.18" },
  "registry": { "namespace": "damatjs", "keywords": ["auth"], "license": "MIT" }
}
```

Run `damat module validate` until it reports no warnings — then it's
registry-ready. See [`@damatjs/module` internals](../packages/module/docs/README.md)
for the authoring, harness, runtime, tooling, and registry details.

---

## 17. Installing existing modules

`damat module add <source>` installs a module shadcn-style: it reads the
module's `module.json`, copies the source into `src/modules/<id>`, registers it
in `damat.config.ts`, syncs required env vars into `.env.example`, and installs
the npm packages it needs.

```bash
# from a registry ref (requires DAMAT_MODULE_REGISTRY)
damat module add damatjs/user@0.2.0

# from a local path
damat module add ./packages/modules/user

# from a github shorthand or git URL
damat module add damatjs/modules/user
damat module add https://github.com/damatjs/modules.git#main

# then apply the module's migrations and restart the dev server
bun damat-orm migrate:up
```

Useful commands:

```bash
damat module list                # what's installed in this app
damat module add <src> --force   # overwrite an existing module
damat module add <src> --name x  # install under a different id
```

**Trust:** registry installs carry an owner + verification status; the install
gate is controlled by `DAMAT_MODULE_VERIFY` (`off` / `warn` / `require`).
`rejected`/`revoked` modules are always blocked. Path and git sources are
trusted as-is (you pointed at them). Details in [MODULES.md](../MODULES.md).

---

## 18. Installing modules with AI (MCP)

[`@damatjs/mcp`](../packages/mcp/README.md) is a Model Context Protocol server
that lets an AI assistant (Claude Code, Claude Desktop, Cursor, …) discover and
install modules for you. It wraps the registry and the `damat module add` flow
in safe tools.

### Wire it up

This repo ships a ready `.mcp.json`. In your own app, add:

```json
{
  "mcpServers": {
    "damat-modules": {
      "command": "bunx",
      "args": ["damat-mcp"],
      "env": {
        "DAMAT_MODULE_REGISTRY": "https://registry.damatjs.dev/index.json",
        "DAMAT_APP_DIR": ".",
        "DAMAT_CLI": "damat"
      }
    }
  }
}
```

(Inside this monorepo, point `args` at the source:
`"command": "bun", "args": ["run", "packages/mcp/bin/damat-mcp.ts"]`.)

### What the assistant can do

| Tool | Purpose |
|------|---------|
| `search_modules` / `list_modules` | find modules in the registry |
| `module_info` | inspect a module before installing |
| `add_module` | install it (runs `damat module add`) |
| `list_installed` | see what's already in the app |

Then just ask: *"Find a Damat auth module and install it."* The assistant calls
`search_modules → module_info → add_module`, and tells you to run migrations.
Claude Code users also get a [`/damat-modules` skill](../.claude/skills/) that
teaches the full add/author workflow. See the
[MCP internals](../packages/mcp/docs/README.md) to extend the server.

---

## 19. CLI reference

### `damat` — dev & modules ([docs](../packages/cli/damat/README.md))

| Command | Description |
|---------|-------------|
| `damat dev` | Start the dev server with hot reload |
| `damat build` | Build for production |
| `damat start` | Start the production server |
| `damat module add <src>` | Install a module (registry/path/git) |
| `damat module list` | List installed modules |
| `damat module init <name>` | Scaffold a standalone module package |
| `damat module dev` | Run a module package as a live app |
| `damat module migration:create` | Diff models → migration (in a module) |
| `damat module codegen` | Generate types/schemas (in a module) |
| `damat module validate` | Contract + registry-readiness check |

### `damat-orm` — migrations & codegen ([docs](../packages/orm/cli/README.md))

| Command | Description |
|---------|-------------|
| `damat-orm migrate:up` | Apply pending migrations |
| `damat-orm migrate:status` | Show applied vs pending |
| `damat-orm migrate:create <name>` | Create a migration |
| `damat-orm migrate:revert` | Revert the last migration |
| `damat-orm migrate:list` | List modules with migrations |
| `damat-orm generate:types` | Generate TypeScript types from models |

### `create-damat-app` — scaffolding ([docs](../packages/cli/create-damat-app/README.md))

```bash
bunx create-damat-app@latest my-app          # new project
bunx create-damat-app@latest --module my-mod # new standalone module
```

---

## 20. Deployment

The default backend ships a multi-stage `Dockerfile` and a `docker-compose.yml`
with Postgres (pgvector), Redis, and Adminer.

```bash
# local infra
docker-compose up -d db redis

# build & run the API image
docker build -t damatjs/api ./backend/default
docker-compose up api
```

For production: set `NODE_ENV=production`, provide `DATABASE_URL`/`REDIS_URL`,
run `damat build` then `damat start`, and apply migrations with
`damat-orm migrate:up` as part of your release. See the
[default backend README](../backend/default/README.md) for the full setup.

---

## 21. Package reference

Every package has its own **README** (overview) and **`docs/`** (internals).
Start from the [package map](#the-package-map) above, or:

- Framework & app: [framework](../packages/framework/README.md) ·
  [services](../packages/service/README.md) ·
  [module](../packages/module/README.md) ·
  [workflow-engine](../packages/workflow-engine/README.md)
- ORM: [orm (umbrella)](../packages/orm/main/README.md) ·
  [model](../packages/orm/model/README.md) ·
  [pg](../packages/orm/pg/README.md) ·
  [connector](../packages/orm/connector/README.md) ·
  [migration](../packages/orm/migration/README.md) ·
  [processor](../packages/orm/processor/README.md) ·
  [codegen](../packages/orm/codegen/README.md) ·
  [core](../packages/orm/core/README.md) ·
  [type](../packages/orm/type/README.md)
- Core: [logger](../packages/core/logger/README.md) ·
  [redis](../packages/core/redis/README.md) ·
  [load-env](../packages/core/env/README.md) ·
  [types](../packages/core/types/README.md) ·
  [cli](../packages/core/cli/README.md) ·
  [deps](../packages/deps/README.md)
- CLIs & AI: [damat-cli](../packages/cli/damat/README.md) ·
  [orm-cli](../packages/orm/cli/README.md) ·
  [create-damat-app](../packages/cli/create-damat-app/README.md) ·
  [mcp](../packages/mcp/README.md)
- [Module manifest reference (MODULES.md)](../MODULES.md)
- [AI contributor guide (AGENTS.md)](../AGENTS.md)

---

## 22. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Server won't start, config error | A module's credentials schema failed validation — check the env vars it declares in `module.json`. |
| `module add` says "no registry knows it" | Set `DAMAT_MODULE_REGISTRY`, or install from a path/git source instead. |
| `module add` refuses to install | Verification policy is `require` and the module isn't `verified`; set `DAMAT_MODULE_VERIFY=warn`, or it's `rejected`/`revoked` (blocked). |
| Migrations not applying | Run `damat-orm migrate:status`; ensure the module is registered in `damat.config.ts`. |
| Redis features no-op / error | `REDIS_URL` not set or `initRedis` not called. |
| MCP `add_module` fails to spawn | `damat` not on PATH — set `DAMAT_CLI` in `.mcp.json` env. |

---

*Building Damat itself (not an app on top of it)? Each package's `docs/` folder
is the maintainer guide, and [AGENTS.md](../AGENTS.md) is the map for working in
this repo.*
