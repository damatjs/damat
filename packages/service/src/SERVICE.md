# Service Package (`@damatjs/services`)

Base service classes and utilities for building modular, maintainable backend services. This package provides foundational patterns for database services, external API integrations, background job processing, and module composition.

## Directory Structure

```
packages/service/src/
├── index.ts                # Main entry point - exports all public APIs
├── microOrm/ ✅            # MikroORM-based database services ("Vetted cleaned and working")
├── modules/ ✅             # Module definition and container ("Vetted cleaned and working")
├── external/ ❌            # External API integration services (needs to be re-vetted)
├── queue/ ❌               # Background job processing (needs to be re-vetted)
├── composite/ ❌           # Service composition and aggregation (needs to be re-vetted)
├── link/  ❌               # Cross-module relationship definitions (needs to be re-vetted)
└── SERVICE.md            # This documentation
```

## Module Reference

### 1. MikroORM Services (`microOrm/`)

**Purpose:** Base class for database-backed services with CRUD operations.

**Key Files:**

- `types.ts` - `BaseEntity`, `PaginatedResult`, `ListOptions`
- `base.ts` - `BaseModuleService` abstract class
- `index.ts` - Re-exports
- `MICRO_ORM_SERVICE.md` - Detailed documentation

**When to use:** Creating services that manage database entities.

**Example:**

```typescript
import { BaseModuleService } from "@damatjs/services";

class UserService extends BaseModuleService<User> {
  async findByEmail(email: string) {
    return this.findOne({ email });
  }
}
```

---

### 2. External API Services (`external/`)

**Purpose:** Base classes for integrating with external APIs with retry logic and circuit breaker patterns.

**Key Files:**

- `types.ts` - `ApiRetryPolicy`, `CircuitBreakerConfig`, `ExternalApiConfig`, `ApiCallOptions`, `HttpApiConfig`
- `errors.ts` - `ExternalApiError`, `CircuitBreakerOpenError`, `MaxRetriesExhaustedError`
- `defaults.ts` - Default configurations
- `base.ts` - `BaseExternalApiService` abstract class
- `http.ts` - `BaseHttpApiService` for HTTP APIs
- `index.ts` - Re-exports
- `EXTERNAL.md` - Detailed documentation

**When to use:** Integrating with third-party APIs (Stripe, GitHub, etc.)

**Key requirement:** Logger must be passed via config (uses `ILogger` from `@damatjs/utils`)

**Example:**

```typescript
import { BaseHttpApiService } from "@damatjs/services";

class GitHubService extends BaseHttpApiService {
  constructor(token: string, logger: ILogger) {
    super({
      serviceName: "github",
      clientConfig: {
        baseUrl: "https://api.github.com",
        auth: { type: "bearer", token },
      },
      logger, // Required
    });
  }
}
```

---

### 3. Queue Services (`queue/`)

**Purpose:** Background job processing with support for in-memory (dev) and Redis (prod) queues.

**Key Files:**

- `types.ts` - `Job`, `JobStatus`, `JobPriority`, `EnqueueOptions`, `QueueConfig`, `QueueStats`
- `defaults.ts` - Default configurations, priority scores
- `memory.ts` - `MemoryQueue` class for in-memory operations
- `redis.ts` - `RedisQueue` class for Redis operations
- `base.ts` - `BaseQueueService` abstract class
- `index.ts` - Re-exports
- `QUEUE.md` - Detailed documentation

**When to use:** Processing background jobs, sending emails, async tasks.

**Key requirements:**

- Logger must be passed via config (uses `ILogger` from `@damatjs/utils`)
- Redis client must be passed when `useRedis: true` (uses `Redis` from `@damatjs/deps/ioredis`)

**Example:**

```typescript
import { BaseQueueService } from "@damatjs/services";

class EmailQueueService extends BaseQueueService<EmailJobData> {
  constructor(logger: ILogger, redisClient?: Redis) {
    super({ queueName: "email", logger, redisClient, useRedis: !!redisClient });
  }

  protected async process(job: Job<EmailJobData>): Promise<void> {
    await sendEmail(job.data);
  }
}
```

---

### 4. Composite Services (`composite/`)

**Purpose:** Services that orchestrate other services without direct database access.

**Key Files:**

- `types.ts` - `HealthStatus`, `HealthCheckResult`, `ServiceMetadata`, `CompositeServiceConfig`, `OperationMetrics`
- `health.ts` - Health check types
- `metrics.ts` - `MetricsTracker` class
- `base.ts` - `BaseCompositeService` abstract class
- `aggregator.ts` - `BaseAggregatorService` for aggregating data from multiple services
- `index.ts` - Re-exports
- `COMPOSITE.md` - Detailed documentation

**When to use:** Orchestrating multiple services, aggregating data, implementing health checks.

**Key requirement:** Logger must be passed via config (uses `ILogger` from `@damatjs/utils`)

---

### 5. Link Definitions (`link/`)

**Purpose:** Define relationships between modules without coupling them.

**Key Files:**

- `types.ts` - `LinkRelationship`, `LinkEndpoint`, `LinkDefinition`, `LoadedLink`
- `container.ts` - `LinkContainer` class
- `helpers.ts` - `defineLink()`, `generateJunctionTableSQL()`
- `index.ts` - Re-exports
- `LINK.md` - Detailed documentation

**When to use:** Creating many-to-many or cross-module relationships.

**Example:**

```typescript
import { defineLink } from "@damatjs/services";

const userTeamLink = defineLink({
  name: "user_team",
  from: { module: "user", entity: User, field: "teams" },
  to: { module: "team", entity: Team, field: "members" },
  relationship: "many-to-many",
});
```

---

### 6. Module Definitions (`modules/`)

**Purpose:** Define self-contained modules following Medusa.js patterns.

**Key Files:**

- `types.ts` - `ModuleDefinition`, `LoadedModule`
- `container.ts` - `ModuleContainer` class
- `helpers.ts` - `defineModule()`, `createModuleExports()`
- `index.ts` - Re-exports
- `MODULES.md` - Detailed documentation

**When to use:** Creating independent, pluggable modules.

**Example:**

```typescript
import { defineModule } from "@damatjs/services";

export const userModule = defineModule({
  name: "user",
  service: UserService,
  entities: [User],
  dependencies: ["core"],
});
```

---

## Common Patterns

### Logger Injection

All service base classes require a logger to be passed in config:

```typescript
import { getLogger } from "@damatjs/utils";

const logger = getLogger();
const service = new MyService({ logger, ...otherConfig });
```

The logger uses `ILogger` interface which supports both `Logger` and `ChildLogger`.

### Path Aliases

This package uses TypeScript path aliases:

- `@/*` → `src/*`

Example: `import { BaseModuleService } from "@/microOrm";`

### Dependencies

- `@damatjs/deps` - External dependencies (MikroORM, ioredis, nanoid, etc.)
- `@damatjs/utils` - Utilities (logger, router, etc.)
- `@damatjs/types` - Shared type definitions

---

## Quick Reference: Which Module to Use

| Use Case                   | Module       | Main Class/Function                            |
| -------------------------- | ------------ | ---------------------------------------------- |
| Database CRUD operations   | `microOrm/`  | `BaseModuleService`                            |
| External API integration   | `external/`  | `BaseExternalApiService`, `BaseHttpApiService` |
| Background job processing  | `queue/`     | `BaseQueueService`                             |
| Service orchestration      | `composite/` | `BaseCompositeService`                         |
| Data aggregation           | `composite/` | `BaseAggregatorService`                        |
| Cross-module relationships | `link/`      | `defineLink`, `LinkContainer`                  |
| Module definition          | `modules/`   | `defineModule`, `ModuleContainer`              |

---

## Adding New Service Types

When adding a new service type:

1. Create a new directory under `src/`
2. Create these files:
   - `types.ts` - Type definitions
   - `base.ts` or main implementation file(s)
   - `index.ts` - Re-exports
   - `<MODULE_NAME>.md` - Documentation
3. Export from main `src/index.ts`
4. Run `bun run build` to verify

---

## Build & Test

```bash
# Build the package
bun run build

# Watch mode
bun run watch
```
