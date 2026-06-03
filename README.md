# Damat

**A composable backend framework for TypeScript/Node.js.**

Damat gives you a modular, production-ready backend built from independent, plug-and-play building blocks. Rather than picking a monolithic framework and fighting its opinions, you assemble exactly what your application needs — database layer, authentication, billing, queues, workflows, and more — each as a self-contained module.

> Built with Bun, Hono, Effect-TS, Better Auth, and PostgreSQL.

---

## Table of Contents

- [What is Damat?](#what-is-damat)
- [Monorepo Structure](#monorepo-structure)
- [Core Concepts](#core-concepts)
  - [Modules](#modules)
  - [ORM Model DSL](#orm-model-dsl)
  - [Service Layer](#service-layer)
  - [Workflow Engine](#workflow-engine)
- [The Default Backend](#the-default-backend-damatjsdefault)
- [Package Reference](#package-reference)
  - [Framework](#damatjsframework)
  - [Services](#damatjsservices)
  - [Dependencies](#damatjsdeps)
  - [Workflow Engine](#damatjsworkflow-engine)
  - [Logger](#damatjslogger)
  - [Types](#damatjstypes)
  - [ORM Packages](#orm-packages)
  - [Utility Packages](#utility-packages)
  - [CLI Packages](#cli-packages)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## What is Damat?

Damat is a **composable backend engine** inspired by Medusa.js's module-first architecture. Every domain concern (users, teams, billing, API keys, webhooks) is a fully independent module with its own entities, service, credentials, and migrations. Modules are registered in a single config file and automatically wired to the database at startup.

On top of the module system, Damat provides:

- A **fluent ORM model DSL** for type-safe schema definitions with 79+ PostgreSQL column types
- **Service base classes** with auto-generated CRUD methods, transactions, and pool management
- A **saga/workflow engine** (via Effect-TS) with automatic compensation and distributed locking
- A **production-ready default backend** wiring everything together with auth, teams, billing, rate limiting, and webhooks
- **Unified CLI** for development, builds, migrations, and code generation

---

## Monorepo Structure

This is a Bun-powered [Turborepo](https://turborepo.dev) monorepo with **22 workspace packages**.

```
damat/
├── package.json              # Root workspace config (bun@1.3.9)
├── turbo.json                # Turborepo task pipeline
├── bunfig.toml               # Bun config (install safety)
│
├── backend/
│   └── default/              # @damatjs/default — Reference backend app
│       ├── package.json
│       ├── damat.config.ts   # App config entry point
│       ├── docker-compose.yml # PostgreSQL (pgvector) + Redis + Adminer
│       ├── Dockerfile
│       └── src/
│           ├── api/
│           │   ├── middleware/  # Auth & request middleware
│           │   │   ├── index.ts
│           │   │   └── auth.ts
│           │   └── routes/      # File-based routing
│           │       ├── auth/[auth]/route.ts
│           │       ├── posts/route.ts
│           │       └── users/[userId]/route.ts
│           ├── modules/user/    # Domain module
│           │   ├── index.ts
│           │   ├── service.ts
│           │   ├── migrations/
│           │   ├── models/
│           │   │   ├── user.ts
│           │   │   ├── session.ts
│           │   │   ├── account.ts
│           │   │   └── verification.ts
│           │   └── config/
│           ├── links/           # Cross-module relationships
│           ├── auth/            # Better Auth config
│           ├── services/
│           └── utils/
│
└── packages/
    ├── framework/              # @damatjs/framework — Core framework
    ├── service/                # @damatjs/services — Base service classes
    ├── deps/                   # @damatjs/deps — External deps re-export
    ├── workflow-engine/        # @damatjs/workflow-engine — Saga orchestration
    ├── typescript-config/      # Shared tsconfig presets
    │
    ├── core/
    │   ├── logger/             # @damatjs/logger — Structured logging
    │   └── types/              # @damatjs/types — Error classes & types
    │
    ├── orm/
    │   ├── main/               # @damatjs/orm — Umbrella package
    │   ├── model/              # @damatjs/orm-model — Fluent model DSL
    │   ├── core/               # @damatjs/orm-core — Registry & logging
    │   ├── type/               # @damatjs/orm-type — Shared types
    │   ├── connector/          # @damatjs/orm-connector — DB connections
    │   ├── pg/                 # @damatjs/orm-pg — PostgreSQL execution
    │   ├── migration/          # @damatjs/orm-migration — Migration system
    │   ├── processor/          # @damatjs/orm-processor — Schema processing
    │   ├── codegen/            # @damatjs/orm-codegen — Type generation
    │   └── cli/                # @damatjs/orm-cli — Unified CLI (damat-orm)
    │
    ├── utils/
    │   ├── main/               # @damatjs/utils — Umbrella package
    │   ├── env/                # @damatjs/utils-env — Env loading
    │   └── redis/              # @damatjs/utils-redis — Redis utilities
    │
    └── cli/
        ├── damat/              # damat — Dev/build CLI
        └── create-damat-app/  # @damatjs/create-damat-app — Project scaffolding
```

### Workspace Configuration

**Root package.json workspaces:**
```json
{
  "workspaces": [
    "apps/*",
    "backend/*",
    "packages/*",
    "packages/cli/*",
    "packages/core/*",
    "packages/utils/*",
    "packages/orm/*"
  ],
  "packageManager": "bun@1.3.9"
}
```

**Turbo tasks (`turbo.json`):**
| Task | Depends On | Outputs | Cache |
|------|------------|---------|-------|
| `build` | `^build` | `dist/**`, `.next/**` | Yes |
| `lint` | `^lint` | — | Yes |
| `check-types` | `^check-types` | — | Yes |
| `dev` | — | — | No (persistent) |

---

## Core Concepts

### Modules

Every domain is a self-contained module. A module defines its models, service, credentials schema, and migrations folder.

**Module Definition:**

```typescript
// src/modules/user/index.ts
import { defineModule } from "@damatjs/services";
import { UserModuleService } from "./service";
import { z } from "@damatjs/deps/zod";

export const USER_MODULE = "user";

export default defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials: {
    schema: z.object({
      jwtSecret: z.string().min(32),
      sessionExpiry: z.number().default(86400),
    }),
    load: (env) => ({
      jwtSecret: env.JWT_SECRET,
      sessionExpiry: parseInt(env.SESSION_EXPIRY || "86400"),
    }),
  },
});
```

**Module Service:**

```typescript
// src/modules/user/service.ts
import { ModuleService, PoolManager } from "@damatjs/services";
import { UserModel, AccountModel, SessionModel } from "./models";

export class UserModuleService extends ModuleService(
  {
    user: UserModel,
    account: AccountModel,
    session: SessionModel,
  },
  UserCredentialsSchema
) {
  async findByEmail(email: string) {
    return this.user.find({ where: { email } });
  }

  async createUserWithAccount(data: CreateUserInput) {
    return this.transaction(async (tx) => {
      const user = await this.user.create({ data });
      await this.account.create({ 
        data: { userId: user.id, provider: "email" } 
      });
      return user;
    });
  }

  async softDeleteUser(id: string) {
    return this.user.softDelete({ where: { id } });
  }
}
```

**Register in config:**

```typescript
// damat.config.ts
import { defineConfig, loadEnv } from "@damatjs/framework";
import userModule from "./src/modules/user";

loadEnv();

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL,
    nodeEnv: process.env.NODE_ENV || "development",
    http: {
      port: 3000,
      host: "0.0.0.0",
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
        credentials: true,
      },
    },
  },
  modules: [userModule],
});
```

### ORM Model DSL

Define database models with a fluent, type-safe API.

**Basic Model:**

```typescript
// src/modules/user/models/user.ts
import { model, columns } from "@damatjs/orm-model";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),
  role: columns.enum(["user", "admin", "owner"]).default("user"),
  metadata: columns.jsonb().nullable(),
  deletedAt: columns.timestamp().nullable(),
})
.timestamps(true)
.softDelete(true, "deleted_at")
.indexes([
  { columns: ["email"], unique: true },
  { columns: ["createdAt"] },
]);
```

**Column Types (79+ supported):**

| Category | Column Types |
|----------|--------------|
| **Identity** | `id({ prefix? })`, `uuid()` |
| **Strings** | `text()`, `varchar(length?)`, `char(length?)` |
| **Numbers** | `integer()`, `numeric(precision?, scale?)`, `real()`, `doublePrecision()`, `money()` |
| **Booleans** | `boolean()` |
| **Dates/Times** | `timestamp({ withTimezone? })`, `date()`, `time()`, `interval()` |
| **JSON** | `json()`, `jsonb()` |
| **Binary** | `bytea()` |
| **Enums** | `enum(string[] \| Record<string, string>)` |
| **Vector** | `vector(dimensions)` — pgvector support |
| **Relations** | `belongsTo(target, options?)`, `hasMany(target, options?)`, `hasOne(target, options?)` |

**Column Modifiers (chainable):**

```typescript
columns.text()
  .nullable()
  .default("value")
  .unique()
  .length(255)
  .name("custom_field_name")

columns.integer()
  .primaryKey()
  .autoincrement()

columns.timestamp()
  .defaultNow()
```

**Relations:**

```typescript
export const TeamModel = model("teams", {
  id: columns.id({ prefix: "team" }).primaryKey(),
  name: columns.text(),
  members: columns.hasMany(() => TeamMemberModel),
  owner: columns.belongsTo(() => UserModel, { 
    onDelete: "CASCADE",
    onUpdate: "RESTRICT",
  }),
});

export const TeamMemberModel = model("team_members", {
  teamId: columns.uuid(),
  userId: columns.uuid(),
  role: columns.enum(["owner", "admin", "member", "viewer"]),
  team: columns.belongsTo(() => TeamModel, { 
    foreignKey: "teamId",
    reference: "id",
  }),
});
```

**Model Options:**

```typescript
model("table_name", { ...columns })
  .timestamps(true)              // Adds createdAt, updatedAt
  .softDelete(true, "deleted_at") // Adds soft delete support
  .indexes([{ columns: ["email"], unique: true }])
  .constrain([{ type: "unique", columns: ["slug"] }]);
```

### Service Layer

`@damatjs/services` provides service base classes and utilities.

#### ModuleService Factory

Auto-generates CRUD methods for registered models:

```typescript
class UserModuleService extends ModuleService(
  { user: UserModel, account: AccountModel },
  CredentialsSchema
) {
  // Auto-generated methods for each model:
  // - this.user.create({ data })
  // - this.user.find({ where })
  // - this.user.findMany({ where, select, order, limit, offset })
  // - this.user.findById(id)
  // - this.user.update({ where, data })
  // - this.user.delete({ where })
  // - this.user.softDelete({ where })
  // - this.user.restore({ where })
  // - this.user.count({ where })
  // - this.user.exists({ where })
  // - this.transaction(cb)
}
```

**Query Options:**

```typescript
interface FindOptions {
  where?: Record<string, any>;
  select?: string[];
  order?: Record<string, "ASC" | "DESC">;
  limit?: number;
  offset?: number;
}

interface CreateOptions {
  data: Record<string, any>;
  returning?: string[];
}

interface UpdateOptions {
  where: Record<string, any>;
  data: Record<string, any>;
  returning?: string[];
}
```

#### PoolManager

Static class managing database connection:

```typescript
import { PoolManager } from "@damatjs/services";
import { ConnectionManager } from "@damatjs/orm-connector";

// Setup
PoolManager.setup({
  connectionManager: new ConnectionManager(config),
  pool: pgPool,
  logger,
});

// Access
const pool = PoolManager.getPool();
const em = PoolManager.getPgEntityManager();
const isHealthy = await PoolManager.healthCheck();
const stats = PoolManager.getStats(); // { totalCount, idleCount, waitingCount }
```

#### defineModule

Factory function creating typed module instances:

```typescript
const userModule = defineModule("user", {
  service: UserService,
  credentials: {
    schema: z.object({ ... }),
    load: (env) => ({ ... }),
  },
});

// Returns: { name, service, credentials, init() }
// Uses Proxy for lazy instantiation
```

### Workflow Engine

The workflow engine implements the **saga pattern** with automatic compensation and distributed locking, built on Effect-TS.

#### Creating Steps

```typescript
import { createStep, RetryPolicies } from "@damatjs/workflow-engine";

const createTeamStep = createStep(
  "create-team",
  async (input: CreateTeamInput, ctx) => {
    const team = await teamService.create(input);
    return { teamId: team.id };
  },
  // Compensation (rollback) - runs on failure
  async (input, output, ctx) => {
    await teamService.delete(output.teamId);
  },
  {
    timeoutMs: 10000,
    retry: RetryPolicies.standard,
    idempotent: true,
    description: "Creates a new team",
  }
);
```

#### Creating Workflows

```typescript
import { createWorkflow } from "@damatjs/workflow-engine";

const assignOwnerStep = createStep(
  "assign-owner",
  async ({ teamId, userId }) => {
    await memberService.create({ teamId, userId, role: "owner" });
  }
);

export const createTeamWorkflow = createWorkflow(
  "create-team",
  async (input: CreateTeamInput, ctx) => {
    const { teamId } = await createTeamStep(input, ctx);
    await assignOwnerStep({ teamId, userId: input.ownerId }, ctx);
    return { teamId };
  },
  { timeoutMs: 30000 }
);
```

#### Executing Workflows

```typescript
const result = await createTeamWorkflow.execute({
  name: "My Team",
  ownerId: "usr_abc123",
});

// Success: { success: true, result: { teamId }, executionId, durationMs }
// Failure: { success: false, error, executionId, durationMs, compensated }
```

#### Distributed Locking

```typescript
// Execute with lock (prevents concurrent runs)
const result = await createTeamWorkflow.executeWithLock(
  input,
  { lockId: "team-creation-user-123", ttlMs: 60000 }
);

// Or manual control
import { acquireWorkflowLock, releaseWorkflowLock } from "@damatjs/workflow-engine";

const lock = await acquireWorkflowLock("workflow-name", { ttlMs: 30000 });
if (lock) {
  try {
    // Do work
  } finally {
    await releaseWorkflowLock("workflow-name", lock.lockId, lock.lockValue);
  }
}
```

#### Retry Policies

```typescript
const RetryPolicies = {
  none: { maxAttempts: 0 },
  once: { maxAttempts: 1 },
  standard: { 
    maxAttempts: 3, 
    initialDelayMs: 100, 
    maxDelayMs: 5000, 
    backoffMultiplier: 2 
  },
  aggressive: { maxAttempts: 5 },
  patient: { maxAttempts: 10, initialDelayMs: 1000 },
};
```

#### Parallel & Conditional Execution

```typescript
import { parallel, when, ifElse } from "@damatjs/workflow-engine";

// Run steps concurrently
await parallel(
  sendWelcomeEmailStep.execute({ userId }),
  createDefaultProjectStep.execute({ userId }),
);

// Conditional execution
await when(
  input.plan === "pro",
  setupProFeaturesStep,
  { userId },
  ctx
);

// Branching
await ifElse(
  condition,
  onTrueStep,
  onFalseStep,
  input,
  ctx
);
```

#### Workflow Errors

```typescript
import {
  WorkflowError,
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  CompensationError,
  WorkflowLockError,
} from "@damatjs/workflow-engine";
```

---

## The Default Backend (`@damatjs/default`)

The reference backend demonstrates all framework capabilities.

### Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `damat dev` | Start development server with hot reload |
| `build` | `damat build` | Build for production |
| `start` | `damat start` | Start production server |
| `db:migrate` | `damat-orm migrate:up` | Run pending migrations |
| `db:status` | `damat-orm migrate:status` | Check migration status |
| `db:create` | `damat-orm migrate:create` | Create new migration |
| `test` | `vitest` | Run tests |
| `lint` | `eslint src/` | Lint code |
| `typecheck` | `tsc --noEmit` | Type check |

### Features

| Feature | Implementation |
|---------|---------------|
| HTTP server | Hono with file-based routing |
| Authentication | Better Auth (sessions, email/password, OAuth) |
| Multi-tenancy | Teams with role-based access (owner, admin, billing, member, viewer) |
| API keys | Scoped, hashed, rate-limited, usage-logged |
| Billing | Stripe subscriptions + one-time credits |
| Background jobs | Redis-backed queue |
| Webhooks | HMAC-SHA256 signed, retry with exponential backoff |
| Rate limiting | Sliding window via Redis |
| Vector search | pgvector + OpenAI embeddings |
| Caching | Redis with TTL |
| Migrations | Per-module tracking |
| Logging | Structured JSON / pretty-print |
| Docker | Multi-stage Dockerfile + docker-compose |

### API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check with DB + Redis latency |
| `POST` | `/api/v1/auth/login` | Session login |
| `POST` | `/api/v1/auth/register` | Register new user |
| `GET` | `/api/v1/users` | List users |
| `GET` | `/api/v1/users/:userId` | Get user by ID |
| `GET` | `/api/v1/posts` | List posts |
| `POST` | `/api/v1/posts` | Create post |

### Docker Services

```yaml
# docker-compose.yml
services:
  api:      # Production API container
  db:       # PostgreSQL 16 + pgvector
  redis:    # Redis 7
  adminer:  # DB admin (optional, profile: tools)
```

---

## Package Reference

### @damatjs/framework

**Version:** `0.0.1`  
**Description:** Core framework primitives — router, server, bootstrap, middleware, shutdown handlers.

**Exports:**

```typescript
// Main
export { bootstrap } from "./bootstrap";
export { start } from "./entry";
export { startServer } from "./server";
export { setupShutdownHandlers } from "./shutdown";
export { defineConfig } from "./config";

// Entry points
export { runEntry } from "./entry";           // "./entry" subpath
export { createRouter } from "./router";      // "./router" subpath
export { setupMiddleware } from "./middleware"; // "./middleware" subpath
```

**Key Functions:**

| Function | Description |
|----------|-------------|
| `bootstrap(options)` | Creates Hono app, sets up middleware & routing |
| `start(cwd)` | Loads config, initializes services, starts server |
| `startServer(app, config, logger)` | Starts HTTP server via `@hono/node-server` |
| `defineConfig(config)` | Type-safe config definition helper |
| `setupShutdownHandlers(server, logger)` | Graceful shutdown (SIGTERM, SIGINT) |

**Types:**

```typescript
interface AppConfig {
  projectConfig: ProjectConfig;
  modules?: ModuleConfig[];
}

interface ProjectConfig {
  databaseUrl: string;
  redisUrl?: string;
  nodeEnv?: "development" | "production" | "test";
  loggerConfig?: LoggerConfig;
  http: {
    port: number;
    host?: string;
    cors?: CorsOptions;
  };
}
```

**Dependencies:**
- `@damatjs/logger`, `@damatjs/deps`, `@damatjs/types`, `@damatjs/utils`, `@damatjs/services`
- `@damatjs/orm-connector`, `@damatjs/orm-type`, `@damatjs/workflow-engine`
- `@hono/node-server`

---

### @damatjs/services

**Version:** `0.0.1`  
**Description:** Service layer with auto-generated CRUD, pool management, and module definitions.

**Exports:**

```typescript
// Module system
export { defineModule, type ModuleInstance, type ModuleDefinition } from "./module";

// Service factory
export { ModuleService, type ModelsMap } from "./service";

// Pool management
export { PoolManager } from "./manager";

// Types
export type {
  FindOptions,
  CreateOptions,
  CreateManyOptions,
  UpdateOptions,
  DeleteOptions,
  SoftDeleteOptions,
  CountOptions,
  ExistsOptions,
} from "./types";
```

**Classes:**

| Class/Factory | Description |
|---------------|-------------|
| `ModuleService(models, schema)` | Factory returning abstract base class with auto-generated CRUD |
| `PoolManager` | Static class for connection pool management |
| `defineModule(name, definition)` | Factory creating typed module instances |

**ModuleService Generated Methods:**

For each registered model, generates:
- `create(options: CreateOptions)`
- `createMany(options: CreateManyOptions)`
- `find(options: FindOptions)`
- `findMany(options: FindOptions)`
- `findById(id: string)`
- `update(options: UpdateOptions)`
- `delete(options: DeleteOptions)`
- `softDelete(options: SoftDeleteOptions)`
- `restore(options)`
- `count(options: CountOptions)`
- `exists(options: ExistsOptions)`
- `transaction(cb, options?)`

**Dependencies:**
- `@damatjs/deps`, `@damatjs/orm-pg`, `@damatjs/orm-model`, `@damatjs/orm-type`, `@damatjs/types`, `@damatjs/logger`

---

### @damatjs/deps

**Version:** `0.0.1`  
**Description:** Re-exports all external dependencies with consistent versions.

**Subpath Exports:**

| Subpath | Package | Version |
|---------|---------|---------|
| `./hono` | `hono` | `^4.12.0` |
| `./zod` | `zod` | `4.3.6` |
| `./effect` | `effect` | `^3.19.18` |
| `./better-auth` | `better-auth` | `^1.4.18` |
| `./pg` | `pg` | `^8.18.0` |
| `./ioredis` | `ioredis` | `^5.9.3` |
| `./nanoid` | `nanoid` | `^5.1.6` |
| `./uuid` | `uuid` | `^13.0.0` |
| `./dotenv` | `dotenv` | `^17.3.1` |
| `./dotenv-expand` | `dotenv-expand` | `^12.0.3` |
| `./awilix` | `awilix` | `^13.0.0` |
| `./mikro-orm/cli` | `@mikro-orm/cli` | `6.6.7` |
| `./mikro-orm/core` | `@mikro-orm/core` | `6.6.7` |
| `./mikro-orm/postgresql` | `@mikro-orm/postgresql` | `6.6.7` |
| `./mikro-orm/migrations` | `@mikro-orm/migrations` | `6.6.7` |
| `./langchain/openai` | `@langchain/openai` | `^1.2.9` |

**Usage:**

```typescript
import { Hono } from "@damatjs/deps/hono";
import { z } from "@damatjs/deps/zod";
import { Effect } from "@damatjs/deps/effect";
import { betterAuth } from "@damatjs/deps/better-auth";
```

---

### @damatjs/workflow-engine

**Version:** `0.1.0`  
**Description:** Saga workflow orchestration with Effect-TS.

**Exports:**

```typescript
// Core
export { createStep, executeStep, runStep, skipStep } from "./step";
export { createWorkflow } from "./workflow";
export { parallel, when, ifElse } from "./control";

// Locking
export {
  acquireWorkflowLock,
  releaseWorkflowLock,
  extendWorkflowLock,
  isWorkflowLocked,
} from "./lock";

// Retry policies
export { RetryPolicies } from "./retry";

// Errors
export {
  WorkflowError,
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  CompensationError,
  WorkflowLockError,
} from "./errors";

// Types
export type {
  RetryPolicy,
  StepConfig,
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowSuccess,
  WorkflowFailure,
  StepDefinition,
  WorkflowDefinition,
} from "./types";
```

**Dependencies:**
- `@damatjs/logger`, `@damatjs/utils`
- `effect@^3.12.0`, `nanoid@^5.1.6`

---

### @damatjs/logger

**Version:** `0.0.1`  
**Description:** Structured logging with multiple formats and file transport.

**Exports:**

```typescript
// Classes
export { Logger, ChildLogger, FileTransport } from "./logger";

// Global helpers
export { setGlobalLogger, getGlobalLogger, createContextLogger } from "./global";

// Types
export type {
  LogLevel,
  LogFormat,
  LoggerConfig,
  LogContext,
  LogEntry,
  ILogger,
  FileTransportConfig,
} from "./types";
```

**Logger Methods:**

| Method | Description |
|--------|-------------|
| `debug(message, context?)` | Debug level |
| `info(message, context?)` | Info level |
| `success(message, context?)` | Success level (green) |
| `warn(message, context?)` | Warning level |
| `error(message, error?, context?)` | Error level |
| `fatal(message, error?, context?)` | Fatal level |
| `skip(message, context?)` | Skip level |
| `child(context)` | Create child logger with added context |
| `withPrefix(prefix)` | Create prefixed child logger |
| `request(data)` | Log HTTP request |
| `close()` | Close file transport |

**Log Levels:** `"debug" | "info" | "success" | "warn" | "error" | "fatal" | "skip"`

**Log Formats:** `"json" | "pretty" | "simple"`

**Dependencies:** None

---

### @damatjs/types

**Version:** `0.0.1`  
**Description:** Shared error classes and utility types.

**Exports:**

```typescript
// Error classes
export { AppError } from "./errors/AppError";
export { ValidationError } from "./errors/ValidationError";
export { RateLimitError } from "./errors/RateLimitError";
export { NotFoundError } from "./errors/NotFoundError";
export { AuthenticationError } from "./errors/AuthenticationError";
export { AuthorizationError } from "./errors/AuthorizationError";

// Utility
export { initFramework } from "./utils";
```

**Error Classes:**

| Error Class | Status Code | Code |
|-------------|-------------|------|
| `AppError` | Configurable | Configurable |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `AuthenticationError` | 401 | `UNAUTHORIZED` |
| `AuthorizationError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `RateLimitError` | 429 | `RATE_LIMITED` |

**Dependencies:** None

---

### ORM Packages

#### @damatjs/orm

**Version:** `0.0.1`  
**Description:** Umbrella package re-exporting all ORM sub-packages.

```typescript
export * from "@damatjs/orm-model";
export * from "@damatjs/orm-connector";
export * from "@damatjs/orm-migration";
export * from "@damatjs/orm-processor";
export * from "@damatjs/orm-pg";
```

**Subpath Exports:**
- `./model` → `@damatjs/orm-model`
- `./connector` → `@damatjs/orm-connector`
- `./migration` → `@damatjs/orm-migration`
- `./processor` → `@damatjs/orm-processor`
- `./pg` → `@damatjs/orm-pg`

---

#### @damatjs/orm-model

**Version:** `0.0.1`  
**Description:** Fluent model/schema DSL with 79+ PostgreSQL column types.

**Exports:**

```typescript
export { model, columns, defineModel } from "./schema";
export { ModelDefinition } from "./definition";
export type { ColumnBuilder, ColumnSchema, TableSchema } from "./types";
```

**Column Types:**

| Category | Methods |
|----------|---------|
| Identity | `id({ prefix? })`, `uuid()` |
| Strings | `text()`, `varchar(length?)`, `char(length?)` |
| Numbers | `integer()`, `numeric(p?, s?)`, `real()`, `doublePrecision()`, `money()` |
| Boolean | `boolean()` |
| Temporal | `timestamp()`, `date()`, `time()`, `interval()` |
| JSON | `json()`, `jsonb()` |
| Binary | `bytea()` |
| Enum | `enum(values)` |
| Vector | `vector(dimensions)` |
| Relations | `belongsTo()`, `hasMany()`, `hasOne()` |

**Dependencies:** `@damatjs/deps`, `@damatjs/orm-type`

---

#### @damatjs/orm-core

**Version:** `0.0.1`  
**Description:** Database-agnostic ORM registry, query logging.

**Exports:**

```typescript
export { ModelRegistry, ModelRegistryError } from "./registry";
export { QueryLogger, getQueryLogger, setQueryLogger } from "./logger";
export type { ModelRegistryEntry } from "./types";
```

**ModelRegistry Methods:**

| Method | Description |
|--------|-------------|
| `register(name, model)` | Register model definition |
| `get(name)` | Get registered model |
| `getAll()` | Get all registered models |
| `getModelNames()` | Get list of model names |
| `has(name)` | Check if model exists |

**Dependencies:** `@damatjs/logger`, `@damatjs/orm-model`, `@damatjs/orm-type`

---

#### @damatjs/orm-type

**Version:** `0.0.1`  
**Description:** Shared type definitions for ORM.

**Exports:**

```typescript
// Connection types
export type { Pool, PoolClient, QueryResultRow } from "pg";
export type { DbPoolConfig, ConnectionStatus, PoolStats } from "./connection";

// Model types
export type { ColumnSchema, TableSchema, IndexSchema, ForeignKeySchema } from "./model";
export type { RelationSchema, RelationType, LinkConfig } from "./relation";

// Query types
export type { FindOptions, CreateOptions, UpdateOptions } from "./query";
```

**Dependencies:** `@damatjs/deps`

---

#### @damatjs/orm-connector

**Version:** `0.0.1`  
**Description:** Database connection manager.

**Exports:**

```typescript
export { ConnectionManager, ConnectionError } from "./manager";
export { setupPoolListeners, performHealthCheck, fetchPoolStats } from "./utils";
```

**ConnectionManager Methods:**

| Method | Description |
|--------|-------------|
| `connect()` | Establish pool connection |
| `disconnect()` | Close all connections |
| `healthCheck()` | Check connection health |
| `getPool()` | Get pg Pool instance |
| `getPoolStats()` | Get pool statistics |
| `getClient()` | Get dedicated client |
| `isInitialized()` | Check if connected |

**Dependencies:** `@damatjs/deps`, `@damatjs/orm-type`, `@damatjs/types`, `@damatjs/logger`

---

#### @damatjs/orm-pg

**Version:** `0.0.1`  
**Description:** PostgreSQL execution layer with EntityManager and Repository pattern.

**Exports:**

```typescript
export { PgEntityManager, EntityManager } from "./manager";
export { PgRepository } from "./repository";
export { TransactionalEntityManager } from "./transaction";
export { executeQuery } from "./executor";
export type * from "./types";
```

**PgEntityManager Methods:**

| Method | Description |
|--------|-------------|
| `getRepository(name)` | Get typed repository |
| `transaction(cb, opts?)` | Run in transaction |
| `tx(cb, opts?)` | Transaction alias |
| `raw(sql, params?)` | Execute raw SQL |
| `execute(sql, params?)` | Execute with params |
| `registerModel(name, model)` | Register model |
| `getRegisteredModels()` | Get model names |

**PgRepository Methods:**

| Method | Description |
|--------|-------------|
| `findMany(opts?)` | Find multiple records |
| `findOne(opts?)` | Find single record |
| `findById(id)` | Find by ID |
| `create(opts)` | Create record |
| `createMany(opts)` | Create multiple |
| `update(opts)` | Update records |
| `delete(opts)` | Delete records |
| `upsert(opts)` | Insert or update |
| `count(where?)` | Count records |
| `exists(where)` | Check existence |

**Dependencies:** `@damatjs/logger`, `@damatjs/orm-core`, `@damatjs/orm-model`, `@damatjs/orm-type`, `@damatjs/types`

---

#### @damatjs/orm-migration

**Version:** `0.0.1`  
**Description:** Module-based migration system.

**Exports:**

```typescript
// Discovery
export { discoverModuleMigrations, discoverAllMigrations } from "./discovery";

// Execution
export { runMigrations, revertMigration } from "./executor";

// Generation
export { createInitialMigration, createDiffMigration } from "./generator";

// Tracking
export { MigrationTracker } from "./tracker";

// Logging
export { log, separator, successBanner, errorBanner } from "./logger";
```

**Dependencies:** `@damatjs/deps`, `@damatjs/logger`, `@damatjs/orm-model`, `@damatjs/orm-processor`, `@damatjs/types`

---

#### @damatjs/orm-processor

**Version:** `0.0.1`  
**Description:** Schema processing and diff generation.

**Exports:**

```typescript
export { diff, type SchemaDiff } from "./diff";
export { generateMigrationSQL } from "./sqlGenerator";
export { snapshotToJSON, snapshotFromJSON } from "./snapshot";
```

**Dependencies:** `@damatjs/deps`, `@damatjs/orm-model`, `@damatjs/orm-type`, `@damatjs/types`

---

#### @damatjs/orm-codegen

**Version:** `0.0.1`  
**Description:** TypeScript type generation from models.

**Exports:**

```typescript
export { generateTypes, generateInterface } from "./generator";
export { columnToTsType } from "./columnToTsType";
export { relationToTsType } from "./relation";
```

**Dependencies:** `@damatjs/orm-model`, `@damatjs/orm-type`

---

#### @damatjs/orm-cli

**Version:** `0.0.1`  
**Description:** Unified CLI for migrations and codegen. Binary: `damat-orm`.

**Commands:**

| Command | Description |
|---------|-------------|
| `migrate:up` | Run pending migrations |
| `migrate:status` | Show migration status |
| `migrate:create <name>` | Create new migration |
| `migrate:revert` | Revert last migration |
| `migrate:list` | List modules with migrations |
| `codegen:types` | Generate TypeScript types |

**Dependencies:** `@damatjs/deps`, `@damatjs/logger`, `@damatjs/orm-codegen`, `@damatjs/orm-migration`, `@damatjs/orm-processor`, `@damatjs/orm-model`, `@damatjs/orm-type`

---

### Utility Packages

#### @damatjs/utils

**Version:** `0.0.1`  
**Description:** Umbrella utility package.

```typescript
export * from "@damatjs/load-env";
export * from "@damatjs/redis";
```

---

#### @damatjs/utils-env

**Version:** `0.0.1`  
**Description:** Environment variable loading.

**Exports:**

```typescript
export function loadEnv(environment?: string, cwd?: string): void;
export function parseEnvFile(content: string): Record<string, string>;
```

**Load Order:**
1. `.env.{environment}.local`
2. `.env.{environment}`
3. `.env.local`
4. `.env`

**Dependencies:** None

---

#### @damatjs/utils-redis

**Version:** `0.0.1`  
**Description:** Redis utilities for caching, rate limiting, sessions, locks, and queues.

**Exports:**

```typescript
// Client
export { createRedis, initRedis, getRedis, disconnectRedis } from "./client";

// Cache
export { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from "./cache";

// Rate Limiting
export { checkRateLimit, checkMultiRateLimit } from "./rateLimit";

// Sessions
export { getSession, setSession, deleteSession, extendSession } from "./session";
export { SessionManager } from "./sessionManager";

// Locks
export { acquireLock, releaseLock, withLock } from "./lock";

// Counters
export { incrementCounter, getCounter, decrementCounter } from "./counter";

// Queue
export { RedisQueue } from "./queue";
```

**RedisQueue Methods:**

| Method | Description |
|--------|-------------|
| `enqueue(job)` | Add job to queue |
| `dequeue(count)` | Get pending jobs |
| `updateStatus(job)` | Update job status |
| `getJob(id)` | Get job by ID |
| `cancelJob(id)` | Cancel job |
| `getStats()` | Get queue statistics |
| `clear()` | Clear queue |

**Job Status:** `"pending" | "processing" | "completed" | "failed" | "retrying"`

**Priority Levels:** `"low" | "normal" | "high" | "critical"`

**Dependencies:** `@damatjs/deps`

---

### CLI Packages

#### damat

**Version:** `0.0.1`  
**Description:** Development and build CLI. Binary: `damat`.

**Commands:**

| Command | Description |
|---------|-------------|
| `damat dev` | Start development server with hot reload |
| `damat build` | Build for production |
| `damat start` | Start production server |

**Dependencies:** `@damatjs/logger`, `@damatjs/framework`

---

#### @damatjs/create-damat-app

**Version:** `0.0.1`  
**Description:** Project scaffolding CLI. Binary: `create-damat-app`.

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--module` | `false` | Create a module instead of project |
| `--repo-url` | `https://github.com/damatjs/damat-starter-default` | Custom starter repo |
| `--version` | `latest` | Pin package version |
| `--directory-path` | `cwd()` | Installation directory |
| `--use-bun` | `false` | Use Bun package manager |
| `--verbose` | `false` | Enable verbose output |

**Usage:**

```bash
npx create-damat-app@latest my-project
npx create-damat-app@latest --module user-module
```

**Dependencies:** `@clack/prompts`, `@damatjs/deps`, `boxen`, `cac`, `nanoid`, `open`, `picocolors`, `slugify`

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.1.0
- PostgreSQL 15+ with [pgvector](https://github.com/pgvector/pgvector) extension
- Redis 7+ (optional for caching, queues, rate limiting)

### Quick Start

```bash
# Clone and install
git clone https://github.com/damatjs/damat.git
cd damat
bun install

# Build all packages
bun run build

# Start the default backend
cd backend/default
cp .env.example .env

# Start infrastructure
docker-compose up -d db redis

# Run migrations
bun run db:migrate

# Start development server
bun run dev
```

Server starts at `http://localhost:3000`.

### Create New Project

```bash
npx create-damat-app@latest my-app
cd my-app
bun install
bun run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `LOG_LEVEL` | No | `info` | Log level |
| `LOG_FORMAT` | No | `pretty` | Log format |
| `CORS_ORIGIN` | No | `*` | Allowed origins (comma-separated) |
| `JWT_SECRET` | Yes | — | JWT signing key |
| `BETTER_AUTH_SECRET` | Yes | — | Better Auth secret (min 32 chars) |

---

## Database Migrations

```bash
# Run pending migrations
bun run db:migrate

# Check status
bun run db:status

# Create migration
bun run db:create migration_name

# Revert last migration
bun run db:revert
```

Migrations are tracked per-module in the `_module_migrations` table.

---

## Development

```bash
# Development mode (all packages)
bun run dev

# Build all packages
bun run build

# Lint
turbo lint

# Type check
turbo check-types

# Format
bun run format

# Test
bun test
```

### Docker

```bash
# Start infrastructure
docker-compose up -d db redis

# Build API image
docker build -t damatjs/api ./backend/default

# Run container
docker-compose up api

# View logs
docker-compose logs -f api
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | [Bun](https://bun.sh) 1.3+ |
| Language | TypeScript 5.x |
| HTTP Framework | [Hono](https://hono.dev) 4.x |
| ORM | damat-orm (custom) |
| Database | PostgreSQL 17 + pgvector |
| Cache/Queues | Redis 7 (ioredis) |
| Auth | [Better Auth](https://better-auth.com) 1.x |
| Workflows | [Effect-TS](https://effect.website) 3.x |
| Validation | Zod 4.x |
| Monorepo | Turborepo |
| Build | tsup / tsc |

---

## Packages Summary

| Package | Version | Description |
|---------|---------|-------------|
| `@damatjs/framework` | 0.0.1 | Core framework (router, server, bootstrap, middleware) |
| `@damatjs/services` | 0.0.1 | Service layer (ModuleService, PoolManager, defineModule) |
| `@damatjs/deps` | 0.0.1 | External dependencies re-export |
| `@damatjs/workflow-engine` | 0.1.0 | Saga orchestration with Effect-TS |
| `@damatjs/types` | 0.0.1 | Error classes (AppError, ValidationError, etc.) |
| `@damatjs/logger` | 0.0.1 | Structured logging with file transport |
| `@damatjs/orm` | 0.0.1 | Umbrella ORM package |
| `@damatjs/orm-model` | 0.0.1 | Fluent model DSL with 79+ column types |
| `@damatjs/orm-core` | 0.0.1 | Model registry and query logging |
| `@damatjs/orm-type` | 0.0.1 | ORM type definitions |
| `@damatjs/orm-connector` | 0.0.1 | Database connection manager |
| `@damatjs/orm-pg` | 0.0.1 | PostgreSQL execution (EntityManager, Repository) |
| `@damatjs/orm-migration` | 0.0.1 | Module-based migration system |
| `@damatjs/orm-processor` | 0.0.1 | Schema diff and SQL generation |
| `@damatjs/orm-codegen` | 0.0.1 | TypeScript type generation |
| `@damatjs/orm-cli` | 0.0.1 | CLI (binary: `damat-orm`) |
| `@damatjs/utils` | 0.0.1 | Utility umbrella package |
| `@damatjs/utils-env` | 0.0.1 | Environment variable loading |
| `@damatjs/utils-redis` | 0.0.1 | Redis utilities (cache, rate limit, sessions, locks, queues) |
| `damat` | 0.0.1 | Dev/build CLI |
| `@damatjs/create-damat-app` | 0.0.1 | Project scaffolding CLI |
| `@damatjs/typescript-config` | 0.0.0 | Shared tsconfig presets |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

Built by [Abel Lamesgen](https://github.com/damatjs).
