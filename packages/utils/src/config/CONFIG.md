# Config Module

Simple configuration management for damatjs applications.

## Overview

The config module provides **project-level configuration** (database, server settings) and **database/module initialization** in a single call via `defineConfig`.

**Module credentials** (API keys, secrets) are handled by service modules via `defineModule` in `@damatjs/services`.

## Quick Start

### 1. Create `damat.config.ts`

```typescript
// damat.config.ts
import "reflect-metadata";
import { loadEnv, defineConfig } from "@damatjs/utils";

// Service modules
import userModule from "./src/modules/user";

// Load environment variables
loadEnv(process.env.NODE_ENV || "development", process.cwd());

// defineConfig initializes the database and all modules automatically
export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL,
    http: {
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST || "0.0.0.0",
      corsOrigin: process.env.CORS_ORIGIN || "*",
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    },
    logLevel: "info",
    logFormat: "pretty",
    nodeEnv: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
  },
  modules: [userModule],
});
```

> **Note:** `defineConfig` calls `initDatabase()` and `initProjectConfig()` internally. The database connection and all modules are initialized as a side effect of importing `damat.config.ts`.

### 2. Access Configuration

```typescript
import { getProjectConfig } from "@damatjs/utils";

// Get the project config (throws if not initialized)
const config = getProjectConfig();
console.log(config.databaseUrl);
console.log(config.http.port);
```

### 3. Database Helpers

```typescript
import {
  disconnectDatabase,
  getDbModules,
  getOrmConfig,
  getAllEntities,
} from "@damatjs/utils";

// Get registered database modules
const dbModules = getDbModules();

// Get MikroORM config
const ormConfig = getOrmConfig();

// Get all entities across all modules
const entities = getAllEntities();

// Clean up on shutdown
await disconnectDatabase();
```

## API Reference

### `defineConfig(config)`

Define application configuration. **Automatically initializes the database connection and all service modules** as a side effect.

```typescript
import { defineConfig, loadEnv } from "@damatjs/utils";
import userModule from "./src/modules/user";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL!,
    http: {
      port: 3000,
      host: "0.0.0.0",
      corsOrigin: "*",
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    },
  },
  modules: [userModule],
});
```

> Throws if `databaseUrl` is not set.

### `getProjectConfig()`

Get the initialized project config. Throws if `initProjectConfig` has not been called (i.e., `defineConfig` has not been imported/run yet).

```typescript
import { getProjectConfig } from "@damatjs/utils";
const config = getProjectConfig();
```

### `initProjectConfig(config)`

Manually initialize the project config singleton. Called internally by `defineConfig` — you typically don't call this directly.

### `resetProjectConfig()`

Reset the project config singleton (useful in tests).

```typescript
import { resetProjectConfig } from "@damatjs/utils";
resetProjectConfig();
```

### `initDatabase(options)`

Initialize the database connection and all service modules. Called internally by `defineConfig`.

```typescript
import { initDatabase } from "@damatjs/utils";

const orm = await initDatabase({
  databaseUrl: process.env.DATABASE_URL!,
  modules: [userModule],
  options: { /* extra MikroORM options */ },
});
```

### `disconnectDatabase()`

Close the database connection.

```typescript
await disconnectDatabase();
```

### `getDbModules()`

Get the list of `DatabaseModule` objects built from the registered modules.

### `getOrmConfig()`

Get the MikroORM options object (or `null` if not yet initialized).

### `getAllEntities()`

Get all entity classes across all registered modules.

### Environment Helpers

```typescript
import { loadEnv, getEnv, requireEnv } from "@damatjs/utils";

// Load .env files
loadEnv("development", process.cwd());

// Get with default
const port = getEnv("PORT", "3000");

// Get required (throws if missing)
const secret = requireEnv("JWT_SECRET");
```

## Types

### AppConfig

```typescript
interface AppConfig<TModules extends readonly any[] = readonly any[]> {
  projectConfig: ProjectConfig;
  modules: TModules;
}
```

### ProjectConfig

```typescript
interface ProjectConfig {
  /** Database connection URL (required) */
  databaseUrl: string;
  /** Redis connection URL */
  redisUrl?: string;
  /** Log level */
  logLevel?: "debug" | "info" | "warn" | "error";
  /** Log format */
  logFormat?: "pretty" | "json";
  /** Node environment */
  nodeEnv?: "development" | "production" | "test";
  /** HTTP server configuration (required) */
  http: HttpConfig;
}
```

### HttpConfig

```typescript
interface HttpConfig {
  port: number;
  host: string;
  corsOrigin: string;
  jwtSecret: string;
  cookieSecret: string;
  apiBaseUrl?: string;
}
```

### ConfigResult

```typescript
interface ConfigResult<TModules extends readonly any[] = readonly any[]> {
  projectConfig: ProjectConfig;
  modules: TModules;
}
```

## File Structure

```
packages/utils/src/config/
├── index.ts          # Public exports
├── define.ts         # defineConfig function
├── instance.ts       # Project config singleton (initProjectConfig, getProjectConfig, resetProjectConfig)
├── loader/           # Database initialization
│   ├── database.ts   # initDatabase, disconnectDatabase, getDbModules, getOrmConfig, getAllEntities
│   └── index.ts      # Re-exports loader
└── types/            # Type definitions
    ├── index.ts      # Re-exports all types
    ├── app.ts        # AppConfig
    ├── project.ts    # ProjectConfig, HttpConfig
    └── result.ts     # ConfigResult

backend/main/
├── damat.config.ts      # Single source of truth
└── src/
    └── modules/
        └── user/
            ├── index.ts        # Module definition (defineModule)
            ├── service.ts      # ModuleService with entities
            ├── models/         # Entity classes
            └── config/         # Module credentials
                ├── index.ts    # { schema, load }
                ├── load.ts     # Env loader
                └── schema/     # Zod schemas
```

## Module Credentials Pattern

Service modules handle their own credentials via `defineModule`:

```typescript
// modules/user/config/schema/index.ts
import { z } from "@damatjs/deps/zod";

export const schema = z.object({
  betterAuth: z.object({
    betterAuthSecret: z.string().min(32),
    // ...
  }),
});

// modules/user/config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({
  betterAuth: {
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    // ...
  },
});

// modules/user/config/index.ts
import { schema } from "./schema";
import { load } from "./load";
export default { schema, load };

// modules/user/index.ts
import { defineModule } from "@damatjs/services";
import UserModuleService from "./service";
import credentials from "./config";

const definition = defineModule("user", {
  service: UserModuleService,
  credentials,
});

export default definition;
```

Credentials are validated and available in the service via `this.credentials`.
