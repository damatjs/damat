# Workflow Engine (`@damatjs/workflow-engine`)

A saga-style workflow orchestration engine built on Effect-TS with typed error handling, automatic compensation (rollback), retry policies, distributed locking, and structured logging.

## Directory Structure

```
packages/workflow-engine/src/
├── index.ts      # Main entry point - exports all public APIs
├── types.ts      # Type definitions (interfaces, context, results, locking)
├── errors.ts     # Error classes (WorkflowError, StepExecutionError, WorkflowLockError, etc.)
├── config.ts     # Default configurations and RetryPolicies presets
├── logger.ts     # Logger integration with @damatjs/utils
├── lock.ts       # Distributed locking using Redis
├── step.ts       # Step creation and execution (createStep, executeStep)
├── workflow.ts   # Workflow creation (createWorkflow)
├── utils.ts      # Utility functions (runStep, parallel, when, ifElse)
└── workflow-engine.md  # This documentation
```

## Key Features

- **Saga Pattern**: Automatic rollback (compensation) on failure
- **Type Safety**: Full TypeScript support with typed inputs/outputs
- **Retry Policies**: Configurable exponential backoff with custom predicates
- **Timeouts**: Per-step and per-workflow timeout configuration
- **Distributed Locking**: Prevent concurrent execution using Redis locks
- **Structured Logging**: Integration with `@damatjs/utils` ILogger
- **Effect-TS**: Built on Effect for composable, type-safe effects

---

## Quick Start

### Basic Workflow

```typescript
import {
  createWorkflow,
  createStep,
  executeStep,
  RetryPolicies,
  Effect,
} from '@damatjs/workflow-engine';

// Define steps
const validateOrderStep = createStep(
  'validate-order',
  async (input: { items: Item[] }, ctx) => {
    // Validation logic
    if (input.items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    return { validated: true, items: input.items };
  }
);

const createOrderStep = createStep(
  'create-order',
  async (input: { items: Item[] }, ctx) => {
    const order = await orderService.create(input);
    return order;
  },
  // Compensation function - runs on workflow failure
  async (input, output, ctx) => {
    await orderService.cancel(output.id);
  },
  { retry: RetryPolicies.standard }
);

// Create workflow
const orderWorkflow = createWorkflow(
  'process-order',
  (input: OrderInput, ctx) =>
    Effect.gen(function* (_) {
      const validated = yield* executeStep(validateOrderStep, input, ctx);
      const order = yield* executeStep(createOrderStep, validated, ctx);
      return order;
    }),
  { timeoutMs: 60000 }
);

// Execute
const result = await orderWorkflow.execute({ items: [...] });

if (result.success) {
  console.log('Order created:', result.result.id);
} else {
  console.error('Failed:', result.error.message);
  // Compensation was automatically run
}
```

---

## API Reference

### Steps

#### `createStep(name, invoke, compensate?, config?)`

Creates a workflow step with typed input/output.

```typescript
const myStep = createStep<Input, Output>(
  "step-name",
  async (input, ctx) => {
    // Main execution
    return output;
  },
  async (input, output, ctx) => {
    // Compensation (rollback) - optional
  },
  {
    timeoutMs: 5000,
    retry: RetryPolicies.standard,
    idempotent: true,
    description: "My step description",
  },
);
```

#### `executeStep(step, input, ctx)`

Executes a step within a workflow Effect generator.

```typescript
const result = yield * executeStep(myStep, input, ctx);
```

### Workflows

#### `createWorkflow(name, definition, config?)`

Creates a workflow with typed input/output.

```typescript
const workflow = createWorkflow<Input, Output>(
  "workflow-name",
  (input, ctx) =>
    Effect.gen(function* (_) {
      // Workflow implementation using executeStep
      return output;
    }),
  { timeoutMs: 300000 },
);
```

#### Workflow Execution

```typescript
const result = await workflow.execute(input, metadata);

if (result.success) {
  // result.result - the output
  // result.executionId - unique ID
  // result.durationMs - execution time
} else {
  // result.error - WorkflowError instance
  // result.compensated - whether rollback ran
}
```

### Utility Functions

#### `runStep(step, input, ctx)`

Alias for `executeStep` with cleaner syntax.

```typescript
const result = yield * runStep(myStep, input, ctx);
```

#### `skipStep(value)`

Returns a value without executing anything. For conditional workflows.

```typescript
const result = condition
  ? yield * runStep(myStep, input, ctx)
  : yield * skipStep(defaultValue);
```

#### `parallel(...effects)`

Runs multiple steps in parallel.

```typescript
const [user, products, inventory] =
  yield *
  parallel(
    runStep(fetchUserStep, { userId }, ctx),
    runStep(fetchProductsStep, { ids }, ctx),
    runStep(checkInventoryStep, { ids }, ctx),
  );
```

#### `when(condition, step, input, ctx, defaultValue)`

Conditionally execute a step.

```typescript
const result =
  yield *
  when(input.needsVerification, verifyStep, input, ctx, { verified: false });
```

#### `ifElse(condition, ifTrue, ifFalse, input, ctx)`

Execute one of two steps based on condition.

```typescript
const result =
  yield *
  ifElse(input.isPremium, premiumProcessStep, standardProcessStep, input, ctx);
```

---

## Configuration

### Retry Policies

```typescript
import { RetryPolicies } from "@damatjs/workflow-engine";

// Pre-configured policies
RetryPolicies.none; // No retries
RetryPolicies.once; // Retry once immediately
RetryPolicies.standard; // 3 retries with exponential backoff
RetryPolicies.aggressive; // 5 retries with longer delays
RetryPolicies.patient; // 3 retries with very long delays (rate limiting)

// Custom policy
const customRetry = {
  maxAttempts: 4,
  initialDelayMs: 200,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  isRetryable: (error) => error.code !== "VALIDATION_ERROR",
};
```

### Step Configuration

```typescript
interface StepConfig {
  timeoutMs?: number; // Default: 30000 (30s)
  retry?: Partial<RetryPolicy>;
  idempotent?: boolean; // Safe to retry
  description?: string; // For logging
}
```

### Workflow Configuration

```typescript
interface WorkflowConfig {
  timeoutMs?: number; // Default: 300000 (5 min)
  defaultStepConfig?: StepConfig;
}
```

---

## Error Handling

### Error Types

| Error                     | Code                    | Description                        |
| ------------------------- | ----------------------- | ---------------------------------- |
| `WorkflowError`           | Various                 | Base error class                   |
| `StepExecutionError`      | `STEP_EXECUTION_FAILED` | Step threw an error                |
| `StepTimeoutError`        | `STEP_TIMEOUT`          | Step exceeded timeout              |
| `MaxRetriesExceededError` | `MAX_RETRIES_EXCEEDED`  | All retries failed                 |
| `CompensationError`       | `COMPENSATION_FAILED`   | Rollback failed                    |
| `WorkflowLockError`       | `WORKFLOW_LOCKED`       | Could not acquire distributed lock |

### Error Properties

```typescript
error.code; // Error code
error.message; // Human-readable message
error.workflowName; // Workflow where error occurred
error.stepName; // Step where error occurred (if applicable)
error.cause; // Original error
```

---

## Logging

The workflow engine integrates with `@damatjs/utils` ILogger interface.

### Setup Logger

```typescript
import { setLogger } from "@damatjs/workflow-engine";
import { createLogger } from "@damatjs/utils";

const appLogger = createLogger({
  logLevel: "info",
  logFormat: "json",
});

// Inject the logger at application startup
setLogger(appLogger);
```

### No-op Logger

If no logger is set, the engine operates silently (no-op logger).

---

## Distributed Locking

The workflow engine supports distributed locking to prevent concurrent execution of workflows with the same lock ID. This is useful for:

- Preventing duplicate order processing
- Ensuring only one instance processes a specific entity
- Implementing distributed mutual exclusion

### Setup

Initialize the lock manager with a Redis client:

```typescript
import { initWorkflowLock, setLogger } from "@damatjs/workflow-engine";
import { createRedis, createLogger } from "@damatjs/utils";

// Initialize Redis for locking
const redis = createRedis({ url: process.env.REDIS_URL });
initWorkflowLock(redis);

// Optional: Set up logging
const logger = createLogger({ logLevel: "info", logFormat: "json" });
setLogger(logger);
```

### Execute with Lock

Use `executeWithLock` to prevent concurrent execution:

```typescript
const orderWorkflow = createWorkflow("process-order", ...);

// Execute with lock using order ID
const result = await orderWorkflow.executeWithLock(
  orderInput,
  {
    lockId: orderId,        // Use business ID as lock key
    ttlMs: 120000,          // Lock TTL (2 minutes)
    maxRetries: 3,          // Retry lock acquisition 3 times
    retryDelayMs: 100,      // Wait 100ms between retries
  },
  { userId: "123" }         // Optional metadata
);

if (!result.success && result.error.code === "WORKFLOW_LOCKED") {
  console.log("Order is already being processed");
}
```

### Lock Configuration

```typescript
interface WorkflowLockConfig {
  /** Lock ID - use a business ID (e.g., orderId, userId) */
  lockId?: string; // Auto-generated if not provided
  /** Lock TTL in milliseconds (default: 300000 = 5 min) */
  ttlMs?: number;
  /** Max retries to acquire lock (default: 0) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 100) */
  retryDelayMs?: number;
}
```

### Manual Lock Management

For advanced use cases, you can manage locks manually:

```typescript
import {
  acquireWorkflowLock,
  releaseWorkflowLock,
  extendWorkflowLock,
  isWorkflowLocked,
} from "@damatjs/workflow-engine";

// Acquire lock
const lock = await acquireWorkflowLock("process-order", {
  lockId: orderId,
  ttlMs: 60000,
});

if (!lock.acquired) {
  throw new Error("Could not acquire lock");
}

try {
  // Do work...

  // Extend lock if needed (long-running operation)
  await extendWorkflowLock(
    "process-order",
    lock.lockId,
    lock.lockValue!,
    120000,
  );
} finally {
  // Release lock
  await releaseWorkflowLock("process-order", lock.lockId, lock.lockValue!);
}

// Check if locked
const isLocked = await isWorkflowLocked("process-order", orderId);
```

---

## Workflow Context

Every step receives a `WorkflowContext`:

```typescript
interface WorkflowContext {
  executionId: string; // Unique execution ID
  workflowName: string; // Workflow name
  startedAt: Date; // Start timestamp
  attempt: number; // Current retry attempt
  metadata: Record<string, unknown>; // Custom metadata
}
```

Pass metadata when executing:

```typescript
const result = await workflow.execute(input, {
  userId: "123",
  correlationId: "abc",
});
```

---

## Compensation (Saga Pattern)

When a workflow fails, compensation functions run in reverse order:

```typescript
const step1 = createStep(
  "step1",
  async (input, ctx) => {
    /* create resource A */
  },
  async (input, output, ctx) => {
    /* delete resource A */
  },
);

const step2 = createStep(
  "step2",
  async (input, ctx) => {
    /* create resource B */
  },
  async (input, output, ctx) => {
    /* delete resource B */
  },
);

const workflow = createWorkflow("saga", (input, ctx) =>
  Effect.gen(function* (_) {
    const a = yield* executeStep(step1, input, ctx);
    const b = yield* executeStep(step2, { aId: a.id }, ctx);
    // If step2 fails, step1's compensation runs automatically
    return { a, b };
  }),
);
```

---

## Best Practices

### 1. Make Steps Idempotent

```typescript
const createUserStep = createStep(
  "create-user",
  async (input, ctx) => {
    // Check if already exists
    const existing = await userService.findByEmail(input.email);
    if (existing) return existing;
    return userService.create(input);
  },
  null,
  { idempotent: true },
);
```

### 2. Use Meaningful Step Names

```typescript
// Good
createStep('validate-payment-details', ...)
createStep('reserve-inventory', ...)

// Bad
createStep('step1', ...)
createStep('process', ...)
```

### 3. Keep Compensation Simple

Compensation should be simple and unlikely to fail:

```typescript
// Good - simple delete
async (input, output, ctx) => {
  await orderService.cancel(output.id);
};

// Bad - complex logic that could fail
async (input, output, ctx) => {
  await orderService.cancel(output.id);
  await notifyUser(output.userId); // Could fail
  await updateAnalytics(output); // Could fail
};
```

### 4. Set Appropriate Timeouts

```typescript
// Quick validation - short timeout
createStep("validate", invoke, null, { timeoutMs: 5000 });

// External API call - medium timeout with retry
createStep("call-api", invoke, compensate, {
  timeoutMs: 30000,
  retry: RetryPolicies.standard,
});

// File processing - long timeout
createStep("process-file", invoke, compensate, { timeoutMs: 120000 });
```

---

## Dependencies

- `@damatjs/utils` - Logger (ILogger) and Redis utilities
- `effect` - Effect-TS for composable effects
- `nanoid` - Unique execution ID generation
