# Utils Package (`@damatjs/utils`)

Shared utility modules for the damatjs monorepo. Provides foundational utilities for logging, configuration, Redis operations, HTTP routing, and database configuration.

## Directory Structure

```
packages/utils/src/
├── index.ts              # Main entry point - exports all public APIs
├── logger/               # Logging utilities
├── config/               # Configuration management
├── redis/                # Redis client and utilities
├── router/               # HTTP routing utilities
├── dal/                  # Database access layer (MikroORM)
└── UTILS.md              # This documentation
```

## Module Reference

### 1. Logger (`logger/`)

**Purpose:** Configurable logging with support for JSON and pretty formats, child loggers, and log levels.

**Key Files:**

- `types.ts` - `LogLevel`, `LogFormat`, `LogContext`, `LoggerConfig`, `LogEntry`, `ILogger`
- `config.ts` - Logger config schema and loader
- `logger.ts` - `Logger` class
- `childLogger.ts` - `ChildLogger` class for contextual logging
- `data.ts` - Log level constants
- `index.ts` - Re-exports, `createLogger()` factory
- `LOGGER.md` - Detailed documentation

**Key exports:**

- `createLogger(config)` - Create a logger instance
- `Logger` - Logger class
- `ChildLogger` - Child logger class
- `ILogger` - Common interface (use for type annotations)
- `schema` - Zod schema for logger config
- `loadConfig(env)` - Load logger config from env vars

**Example:**

```typescript
import { createLogger } from "@damatjs/utils";

const logger = createLogger({ logLevel: "info", logFormat: "pretty" });
logger.info("Application started", { port: 3000 });

const childLogger = logger.child({ service: "UserService" });
childLogger.debug("Processing request");
```

**Important:** When accepting a logger as a parameter, use `ILogger` type which works for both `Logger` and `ChildLogger`.

---

### 2. Config (`config/`)

**Purpose:** Configuration system where users define project config and modules in a root `damat.config.ts`. `defineConfig` automatically initializes the database connection and all service modules.

**Key Files:**

- `types/app.ts` - `AppConfig<TModules>`
- `types/project.ts` - `ProjectConfig`, `HttpConfig`
- `types/result.ts` - `ConfigResult<TModules>`
- `define.ts` - `defineConfig()` function (also calls `initDatabase` + `initProjectConfig`)
- `instance.ts` - `initProjectConfig()`, `getProjectConfig()`, `resetProjectConfig()`
- `loader/database.ts` - `initDatabase()`, `disconnectDatabase()`, `getDbModules()`, `getOrmConfig()`, `getAllEntities()`
- `index.ts` - Re-exports all types and functions
- `CONFIG.md` - Detailed documentation

**Key exports:**

- `loadEnv(environment, cwd)` - Load .env files
- `defineConfig(config)` - Define app config; triggers DB init as a side effect
- `getProjectConfig()` - Get the initialized project config singleton
- `resetProjectConfig()` - Reset the project config singleton (useful in tests)
- `initDatabase(options)` - Initialize DB connection and service modules
- `disconnectDatabase()` - Close the database connection
- `getDbModules()` - Get registered `DatabaseModule[]`
- `getOrmConfig()` - Get the MikroORM options object
- `getAllEntities()` - Get all entity classes across all modules

**User creates `damat.config.ts`:**

```typescript
import { loadEnv, defineConfig } from "@damatjs/utils";
import userModule from "./src/modules/user";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

// defineConfig initializes DB and all modules automatically
export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    http: {
      port: 3000,
      host: "0.0.0.0",
      corsOrigin: process.env.CORS_ORIGIN || "*",
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    },
  },
  modules: [userModule],
});
```

**Access config in app:**

```typescript
import { getProjectConfig } from "@damatjs/utils";

// After damat.config.ts has been imported
const config = getProjectConfig();
console.log(config.databaseUrl);
console.log(config.http.port);
```

---

### 3. Redis (`redis/`)

**Purpose:** Redis client utilities for caching, rate limiting, sessions, distributed locks, and atomic counters.

**Key Files:**

- `types.ts` - `RedisConfig`, `RateLimitResult`, `RateLimitWindow`, `MultiRateLimitResult`
- `client.ts` - `createRedis()`, `initRedis()`, `getRedis()`, `disconnectRedis()`
- `cache.ts` - `cacheGet()`, `cacheSet()`, `cacheDelete()`, `cacheDeletePattern()`
- `rateLimit.ts` - `checkRateLimit()`, `checkMultiRateLimit()`
- `session.ts` - `getSession()`, `setSession()`, `deleteSession()`, `extendSession()`
- `lock.ts` - `acquireLock()`, `releaseLock()`, `withLock()`
- `counter.ts` - `incrementCounter()`, `decrementCounter()`, `getCounter()`, `setCounter()`
- `index.ts` - Re-exports
- `REDIS.md` - Detailed documentation

**Key pattern:** All functions take a Redis client as first parameter (dependency injection).

**Example:**

```typescript
import {
  createRedis,
  cacheGet,
  cacheSet,
  checkRateLimit,
} from "@damatjs/utils";

const redis = createRedis({ url: process.env.REDIS_URL });

// Caching
await cacheSet(redis, "user:123", userData, 3600);
const user = await cacheGet(redis, "user:123");

// Rate limiting
const result = await checkRateLimit(redis, `user:${userId}`, 60000, 100);
if (!result.allowed) {
  throw new Error(`Rate limited. Retry after ${result.retryAfter}s`);
}

// Distributed locks
import { withLock } from "@damatjs/utils";
await withLock(redis, "process-order:123", async () => {
  await processOrder(123);
});
```

---

### 4. Router (`router/`)

**Purpose:** HTTP routing utilities for Hono-based APIs with automatic route scanning and response helpers.

**Key Files:**

- `types.ts` - Route types and interfaces
- `scanner.ts` - Route file scanner
- `builder.ts` - Route builder
- `helpers.ts` - Routing helper functions
- `response.ts` - HTTP response utilities
- `index.ts` - Re-exports
- `ROUTER.md` - Detailed documentation

**Key exports:**

- Route scanning and building utilities
- Response helpers for consistent API responses

---

### 5. DAL - Database Access Layer (`dal/`)

**Purpose:** Database configuration, connection management, and module-based migrations using MikroORM.

**Key Files:**

- `types.ts` - `DatabaseConfig`, `OrmConfig`, `DatabaseConnection`, `MigrationInfo`, etc.
- `config.ts` - `createOrmConfig()`, `createSimpleOrmConfig()`
- `connection.ts` - `createConnection()`, `initConnection()`, `getConnection()`, `closeConnection()`
- `migrations/runner.ts` - Migration discovery, running, reverting, tracking
- `migrations/cli.ts` - CLI for migration commands
- `index.ts` - Re-exports
- `DAL.md` - Detailed documentation

**Key exports:**

- `createOrmConfig(config)` - Create MikroORM config from structured options
- `createSimpleOrmConfig(url, entities)` - Simplified config creation
- `createConnection(config)` - Create a database connection
- `initConnection(config)` / `getConnection()` - Singleton pattern
- `runMigrations(orm, dir, modules)` - Run pending migrations
- `revertMigrations(orm, dir, module, count)` - Revert migrations
- `getMigrationStatus(orm, dir, modules)` - Get migration status
- `createMigration(dir, module, name)` - Create new migration file
- `runCli(options)` - Run migration CLI

**Example:**

```typescript
import {
  createConnection,
  runMigrations,
  createMigration,
} from "@damatjs/utils";

// Create connection
const connection = await createConnection({
  database: { url: process.env.DATABASE_URL },
  entities: [User, Team],
});

// Run migrations
const results = await runMigrations(connection.orm, "./src/modules", [
  "user",
  "billing",
]);

// Create new migration
createMigration("./src/modules", "user", "AddPhoneColumn");

// Clean up
await connection.close();
```

**Module-based migrations:** Each module has its own `migrations/` folder:

```
src/modules/
├── user/
│   └── migrations/
│       └── Migration20260101_CreateUserTable.ts
├── billing/
│   └── migrations/
│       └── Migration20260105_CreateInvoiceTable.ts
```

---

## Common Patterns

### ILogger Interface

When writing functions/classes that accept a logger, use `ILogger`:

```typescript
import type { ILogger } from "@damatjs/utils";

class MyService {
  constructor(private logger: ILogger) {}

  doSomething() {
    this.logger.info("Doing something");
  }
}
```

### Dependency Injection

All utilities follow dependency injection patterns:

- Logger is passed via config, not imported globally
- Redis client is passed to functions, not fetched from singleton
- Configuration is loaded explicitly, not auto-discovered

### Zod Schemas

Module configs use Zod for validation:

```typescript
import { z } from "@damatjs/utils";

export const schema = z.object({
  apiKey: z.string(),
  maxRetries: z.coerce.number().default(3),
});

export const loadConfig = (env: NodeJS.ProcessEnv) => ({
  apiKey: env.API_KEY,
  maxRetries: env.MAX_RETRIES,
});
```

---

## Quick Reference

| Use Case                   | Module    | Key Function/Class                        |
| -------------------------- | --------- | ----------------------------------------- |
| Create a logger            | `logger/` | `createLogger(config)`                    |
| Log with context           | `logger/` | `logger.child({ service: 'X' })`          |
| Logger type annotation     | `logger/` | `ILogger`                                 |
| Load env files             | `config/` | `loadEnv(env, cwd)`                       |
| Define app config + init   | `config/` | `defineConfig(config)`                    |
| Get project config         | `config/` | `getProjectConfig()`                      |
| Reset project config       | `config/` | `resetProjectConfig()`                    |
| Init database manually     | `config/` | `initDatabase(options)`                   |
| Disconnect database        | `config/` | `disconnectDatabase()`                    |
| Get registered DB modules  | `config/` | `getDbModules()`                          |
| Get all entities           | `config/` | `getAllEntities()`                         |
| Create Redis client        | `redis/`  | `createRedis(config)`                     |
| Cache data                 | `redis/`  | `cacheSet(client, key, value, ttl)`       |
| Rate limiting              | `redis/`  | `checkRateLimit(client, id, window, max)` |
| Distributed lock           | `redis/`  | `withLock(client, key, fn)`               |
| Session storage            | `redis/`  | `setSession(client, token, data, ttl)`    |
| Create DB connection       | `dal/`    | `createConnection(config)`                |
| Singleton DB connection    | `dal/`    | `initConnection()` / `getConnection()`    |
| Run migrations             | `dal/`    | `runMigrations(orm, dir, modules)`        |
| Create migration           | `dal/`    | `createMigration(dir, module, name)`      |
| Migration CLI              | `dal/`    | `runCli(options)`                         |

---

## Dependencies

- `@damatjs/deps` - External dependencies (zod, ioredis, etc.)

---

## Adding New Utilities

When adding a new utility module:

1. Create a new directory under `src/`
2. Create these files:
   - `types.ts` - Type definitions
   - Implementation file(s)
   - `index.ts` - Re-exports
   - `<MODULE_NAME>.md` - Documentation
3. Export from main `src/index.ts`
4. Follow dependency injection patterns (pass dependencies, don't import globals)
5. Run `bun run build` to verify

---

## Build & Test

```bash
# Build the package
bun run build

# Watch mode
bun run watch
```
