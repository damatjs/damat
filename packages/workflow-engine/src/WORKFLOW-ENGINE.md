# Workflow Engine (`@damatjs/workflow-engine`)

A saga-style workflow orchestration engine built on Effect-TS with typed error handling, automatic compensation (rollback), retry policies, distributed locking, and structured logging.

## Directory Structure

```
packages/workflow-engine/src/
├── index.ts        # Main entry point - exports all public APIs
├── types/          # Type definitions (step, workflow, context, result, retry, lock)
├── errors/         # Error classes (WorkflowError, StepExecutionError, ...)
├── config/         # Default configurations and RetryPolicies presets
├── lock/           # Distributed locking built on @damatjs/redis
├── step/           # Step creation and execution (createStep, executeStep)
├── workflow/       # Workflow creation and execution (createWorkflow)
└── utils/          # Utility functions (runStep, skipStep, parallel, when, ifElse)
```

## Key Features

- **Saga Pattern**: Automatic rollback (compensation) on failure, in reverse order
- **Type Safety**: Full TypeScript support with typed inputs/outputs
- **Retry Policies**: Exponential backoff capped at `maxDelayMs`, custom predicates
- **Timeouts**: Per-attempt step timeouts and per-workflow timeout
- **Cancellation**: Steps receive an `AbortSignal` that fires on timeout/interruption
- **Distributed Locking**: Prevent concurrent execution using Redis locks, with optional auto-extend
- **Structured Logging**: Integration with `@damatjs/logger`
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
    if (input.items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    return { validated: true, items: input.items };
  }
);

const createOrderStep = createStep(
  'create-order',
  async (input: { items: Item[] }, ctx, signal) => {
    // Pass the signal so a timed-out step actually stops working
    const order = await orderService.create(input, { signal });
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
    Effect.gen(function* () {
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
  // result.compensated — true if at least one compensation ran
  // result.compensationsFailed — number of compensations that threw
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
  async (input, ctx, signal) => {
    // ctx.attempt is 1 on the first try and increments on each retry.
    // signal aborts on step timeout — forward it to fetch/db calls.
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
const result = yield* executeStep(myStep, input, ctx);
```

### Workflows

#### `createWorkflow(name, definition, config?)`

Creates a workflow with typed input/output.

```typescript
const workflow = createWorkflow<Input, Output>(
  "workflow-name",
  (input, ctx) =>
    Effect.gen(function* () {
      // Workflow implementation using executeStep
      return output;
    }),
  {
    timeoutMs: 300000,
    // Applies to every step that doesn't set its own value
    defaultStepConfig: { retry: RetryPolicies.standard },
  },
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
  // result.compensated - true if at least one compensation ran
  // result.compensationsFailed - number of compensations that threw
}
```

### Utility Functions

#### `runStep(step, input, ctx)`

Alias for `executeStep` with cleaner syntax.

```typescript
const result = yield* runStep(myStep, input, ctx);
```

#### `skipStep(value)`

Returns a value without executing anything. For conditional workflows.

```typescript
const result = condition
  ? yield* runStep(myStep, input, ctx)
  : yield* skipStep(defaultValue);
```

#### `parallel(...effects)`

Runs multiple steps in parallel.

```typescript
const [user, products, inventory] = yield* parallel(
  runStep(fetchUserStep, { userId }, ctx),
  runStep(fetchProductsStep, { ids }, ctx),
  runStep(checkInventoryStep, { ids }, ctx),
);
```

#### `when(condition, step, input, ctx, defaultValue)`

Conditionally execute a step.

```typescript
const result =
  yield* when(input.needsVerification, verifyStep, input, ctx, { verified: false });
```

#### `ifElse(condition, ifTrue, ifFalse, input, ctx)`

Execute one of two steps based on condition.

```typescript
const result =
  yield* ifElse(input.isPremium, premiumProcessStep, standardProcessStep, input, ctx);
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
  maxDelayMs: 10000, // each delay is capped here
  backoffMultiplier: 2,
  // Receives the ORIGINAL error your step threw (not an engine wrapper).
  // Timeouts arrive as StepTimeoutError and are retryable by default.
  isRetryable: (error) => !(error instanceof MyValidationError),
};
```

Retry semantics:

- `maxAttempts: N` means 1 initial attempt + up to N retries.
- `timeoutMs` applies **per attempt**; a timed-out attempt counts as a retryable failure.
- When all retries are exhausted, the step fails with `MaxRetriesExceededError`
  whose `cause` holds the last error.

### Step Configuration

```typescript
interface StepConfig {
  timeoutMs?: number; // Per-attempt timeout. Default: 30000 (30s)
  retry?: Partial<RetryPolicy>;
  idempotent?: boolean; // Safe to retry
  description?: string; // For logging
}
```

### Workflow Configuration

```typescript
interface WorkflowConfig {
  timeoutMs?: number; // Default: 300000 (5 min)
  // Layered under each step's own config:
  // engine defaults < defaultStepConfig < step config
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
| `StepTimeoutError`        | `STEP_TIMEOUT`          | Step attempt exceeded timeout      |
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

The workflow engine logs through `@damatjs/logger`'s global logger. Configure it
once at application startup:

```typescript
import { createLogger, setGlobalLogger } from "@damatjs/logger";

const logger = createLogger({ level: "info", format: "json" });
setGlobalLogger(logger);
```

If no global logger is configured, the engine is silent (no-op logger).

Workflow inputs are only logged at `debug` level — they may contain credentials
or PII, so production log levels (`info` and above) never include them.

---

## Distributed Locking

The workflow engine supports distributed locking to prevent concurrent execution of workflows with the same lock ID. This is useful for:

- Preventing duplicate order processing
- Ensuring only one instance processes a specific entity
- Implementing distributed mutual exclusion

### Setup

Locking uses the global Redis client from `@damatjs/redis`. Initialize it at startup
(the framework does this automatically when `redisUrl` is configured):

```typescript
import { initRedis, connectRedis } from "@damatjs/redis";

initRedis({ url: process.env.REDIS_URL });
await connectRedis();
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
    autoExtend: true,       // Re-extend TTL every ttlMs/2 while running
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
  /** Keep the lock alive while the workflow runs (default: false) */
  autoExtend?: boolean;
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
  attempt: number; // Current retry attempt (1-based, increments on retry)
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

When executing with a lock, `metadata.lockId` is set automatically and the
`executionId` stays unique per run (it is NOT the lock ID).

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
  Effect.gen(function* () {
    const a = yield* executeStep(step1, input, ctx);
    const b = yield* executeStep(step2, { aId: a.id }, ctx);
    // If step2 fails, step1's compensation runs automatically
    return { a, b };
  }),
);
```

Compensation failures are logged and counted in `result.compensationsFailed`,
but never mask the original workflow error.

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
  undefined,
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
createStep("validate", invoke, undefined, { timeoutMs: 5000 });

// External API call - medium timeout with retry
createStep("call-api", invoke, compensate, {
  timeoutMs: 30000,
  retry: RetryPolicies.standard,
});

// File processing - long timeout
createStep("process-file", invoke, compensate, { timeoutMs: 120000 });
```

### 5. Forward the AbortSignal

A JavaScript promise can't be force-cancelled. When a step times out, the engine
stops waiting, but your code keeps running unless you forward the signal:

```typescript
createStep("call-api", async (input, ctx, signal) => {
  return fetch(url, { signal }); // stops the request on timeout
});
```

---

## Dependencies

- `@damatjs/logger` - Structured logging
- `@damatjs/redis` - Redis client + distributed lock primitives
- `effect` - Effect-TS for composable, type-safe effects
- `nanoid` - Unique execution ID generation
