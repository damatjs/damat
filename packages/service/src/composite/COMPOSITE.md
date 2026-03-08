# Composite Service

## Overview

Base classes for services that orchestrate other services without directly accessing the database. Located in `packages/service/src/composite/`.

## File Structure

```
packages/service/src/composite/
├── index.ts      # Re-exports all modules
├── types.ts      # Type definitions
├── health.ts     # Health check utilities
├── metrics.ts    # Operation tracking
├── base.ts       # BaseCompositeService class
└── aggregator.ts # BaseAggregatorService class
```

## Use Cases

- **Orchestration services** - Coordinate multiple other services
- **Notification services** - Send notifications via multiple channels
- **Aggregation services** - Combine data from multiple sources
- **Facade services** - Simplify complex subsystems

## Usage

### BaseCompositeService

```typescript
import { BaseCompositeService } from "@damatjs/service";
import type { Logger } from "@damatjs/utils";

class NotificationService extends BaseCompositeService {
  constructor(
    private webhookService: WebhookService,
    private emailService: EmailService,
    logger: Logger,
  ) {
    super({ name: "NotificationService", logger });
  }

  async notifyTeam(teamId: string, event: string, data: unknown) {
    // Execute in parallel, collect results
    const { results, errors } = await this.executeAll([
      {
        name: "webhook",
        fn: () => this.webhookService.trigger(teamId, event, data),
      },
      { name: "email", fn: () => this.emailService.send(teamId, event, data) },
    ]);

    if (errors.length > 0) {
      this.log.warn("Some notifications failed", { errors });
    }

    return results;
  }
}
```

### BaseAggregatorService

```typescript
import { BaseAggregatorService } from "@damatjs/service";
import type { Logger } from "@damatjs/utils";

interface DashboardSources {
  team: Team;
  usage: UsageStats;
  members: Member[];
}

class DashboardService extends BaseAggregatorService<string, DashboardSources> {
  constructor(
    private teamService: TeamService,
    private usageService: UsageService,
    logger: Logger,
  ) {
    super({ name: "DashboardService", logger });
  }

  protected fetchSources(teamId: string) {
    return {
      team: () => this.teamService.getTeam(teamId),
      usage: () => this.usageService.getTeamUsage(teamId),
      members: () => this.teamService.getMembers(teamId),
    };
  }

  // Returns all data (partial if some fail)
  async getDashboard(teamId: string) {
    return this.aggregate(teamId);
  }

  // Throws if team or usage fails
  async getDashboardRequired(teamId: string) {
    return this.aggregateRequired(teamId, ["team", "usage"]);
  }
}
```

## API Reference

### CompositeServiceConfig

```typescript
interface CompositeServiceConfig {
  name: string;
  version?: string;
  description?: string;
  enableMetrics?: boolean;
  logger: Logger; // Required
}
```

### BaseCompositeService Methods

| Method                            | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `healthCheck()`                   | Returns health status (override for custom checks) |
| `checkDependency(name, check)`    | Check a dependency's health                        |
| `trackOperation(name, fn)`        | Track operation for metrics                        |
| `getMetrics()`                    | Get operation metrics                              |
| `safeExecute(name, fn, options?)` | Execute with error handling                        |
| `executeAll(operations)`          | Execute multiple operations in parallel            |
| `initialize()`                    | Lifecycle hook (override for setup)                |
| `shutdown()`                      | Lifecycle hook (override for cleanup)              |

### SafeExecuteOptions

```typescript
interface SafeExecuteOptions<T> {
  fallback?: T; // Return this on error
  rethrow?: boolean; // Re-throw error (default: true)
}
```

### Health Check

```typescript
interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  dependencies?: Record<string, HealthCheckResult>;
  latencyMs?: number;
}
```

### Metrics

```typescript
interface OperationMetrics {
  operations: Record<
    string,
    {
      count: number;
      avgLatencyMs: number;
    }
  >;
}

// Usage
const metrics = service.getMetrics();
// { operations: { "notifyTeam": { count: 150, avgLatencyMs: 45 } } }
```

## Error Handling

### safeExecute

```typescript
// With fallback
const result = await this.safeExecute("fetchData", () => this.api.getData(), {
  fallback: [],
});

// Without rethrow (returns undefined on error)
const result = await this.safeExecute("fetchData", () => this.api.getData(), {
  rethrow: false,
});
```

### executeAll

Executes operations in parallel and collects both results and errors:

```typescript
const { results, errors } = await this.executeAll([
  { name: "op1", fn: () => doOp1() },
  { name: "op2", fn: () => doOp2() },
  { name: "op3", fn: () => doOp3() },
]);

// results: [{ name: "op1", result: ... }, { name: "op3", result: ... }]
// errors: [{ name: "op2", error: Error }]
```

## Types

```typescript
type HealthStatus = "healthy" | "degraded" | "unhealthy";

interface OperationDefinition<T> {
  name: string;
  fn: () => Promise<T>;
}

interface ExecuteAllResult<T> {
  results: Array<{ name: string; result: T }>;
  errors: Array<{ name: string; error: Error }>;
}
```
