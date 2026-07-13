# Workflows

Source: `src/workflow/create.ts`, `src/workflow/execute.ts`,
`src/types/workflow.ts`, `src/types/definition.ts`, `src/types/result.ts`,
`src/types/context.ts`.

A workflow composes steps. `createWorkflow` returns a definition with two run
methods: `execute` (plain) and `executeWithLock` (mutually-exclusive via Redis).

## `createWorkflow`

```ts
function createWorkflow<I, O>(
  name: string,
  definition: (
    input: I,
    ctx: WorkflowContext,
  ) => Effect.Effect<O, WorkflowError, Scope.Scope>,
  config: WorkflowConfig = {},
): WorkflowDefinition<I, O>;
```

The `definition` is your orchestration: an Effect generator that `yield*`s
`executeStep(...)` calls. Its error channel is `WorkflowError` and it requires a
`Scope` (provided by the engine).

Config is merged once at creation:

```ts
mergedConfig = {
  ...DEFAULT_WORKFLOW_CONFIG,            // timeoutMs 300000
  ...config,
  defaultStepConfig: {
    ...DEFAULT_STEP_CONFIG,
    ...config.defaultStepConfig,
    retry: { ...DEFAULT_STEP_CONFIG.retry, ...config.defaultStepConfig?.retry },
  },
};
```

### `WorkflowConfig`

```ts
interface WorkflowConfig {
  timeoutMs?: number;            // whole-workflow timeout (default 300000 = 5 min)
  defaultStepConfig?: StepConfig;// layered under each step's own config
}
```

`defaultStepConfig` lets you set, say, `retry: RetryPolicies.standard` once for
every step that doesn't override it. See the layering rules in [steps.md](./steps.md).

### `WorkflowDefinition`

```ts
interface WorkflowDefinition<I, O> {
  name: string;
  config: RequiredWorkflowConfig;
  execute: (input: I, metadata?: Record<string, unknown>) => Promise<WorkflowResult<O>>;
  executeWithLock: (
    input: I,
    lockConfig?: WorkflowLockConfig,
    metadata?: Record<string, unknown>,
  ) => Promise<WorkflowResult<O>>;
}
```

## `execute`

```ts
const result = await workflow.execute(input, { userId: "123" });
```

Generates a `nanoid` `executionId` and delegates to `executeWorkflowInternal`.

### `executeWorkflowInternal` (`src/workflow/execute.ts`)

1. Create `engineState = { compensationsRun: 0, compensationsFailed: 0, defaultStepConfig }`.
2. Build the `WorkflowContext`: `{ executionId, workflowName, startedAt, attempt: 1, metadata, engineState }`.
3. Log `info` "Starting workflow execution"; log the input at `debug` only.
4. Build `workflowEffect = Effect.timeoutFail(Effect.scoped(definition(input, ctx)), { duration: timeoutMs, onTimeout: () => WorkflowError("WORKFLOW_TIMEOUT", ...) })`.
   - `Effect.scoped` opens the `Scope` that step compensations register into.
5. `const exit = await Effect.runPromiseExit(workflowEffect)`; compute `durationMs`.
6. **Map the `Exit` to a `WorkflowResult`:**
   - **Success** → `{ success: true, result, executionId, durationMs }`.
   - **Failure** → if `engineState.retriesExceeded` is set (a step exhausted its
     retries), use that `MaxRetriesExceededError`. Otherwise `Cause.squash(exit.cause)`;
     if it's a `WorkflowError`, use it, else wrap as
     `WorkflowError("WORKFLOW_FAILED", message, name, undefined, raw)`.
     Return `{ success: false, error, executionId, durationMs, compensated: engineState.compensationsRun > 0, compensationsFailed: engineState.compensationsFailed, compensationErrors: engineState.compensationErrors ?? [] }`.

## `WorkflowResult` — the return contract

```ts
type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure;

interface WorkflowSuccess<T> {
  success: true;
  result: T;
  executionId: string;
  durationMs: number;
}

interface WorkflowFailure {
  success: false;
  error: WorkflowError;     // always a WorkflowError (or subclass)
  executionId: string;
  durationMs: number;
  compensated: boolean;       // ≥1 compensation ran successfully
  compensationsFailed: number;// compensations that threw (logged, not raised)
  compensationErrors: CompensationError[]; // those errors, in occurrence order
                                           // (empty array when none failed)
}
```

`execute`/`executeWithLock` **never reject** for ordinary step failures — they
resolve to `{ success: false }`. Always branch on `result.success` (it narrows the
union, as the tests do).

## `executeWithLock`

```ts
const result = await workflow.executeWithLock(
  input,
  { lockId: orderId, ttlMs: 120_000, maxRetries: 3, retryDelayMs: 100, autoExtend: true },
  { userId: "123" },
);
```

Flow (`src/workflow/create.ts`):

1. `acquireWorkflowLock(name, lockConfig)`.
2. If **not acquired** → return a `WorkflowFailure` immediately with
   `error = WorkflowLockError(name, lockId)` (`code: "WORKFLOW_LOCKED"`),
   `durationMs: 0`, `compensated: false`, `compensationsFailed: 0`,
   `compensationErrors: []`. (It does **not** throw, despite the doc comment.)
3. If acquired → fresh `executionId` (the `lockId` repeats; the `executionId` must
   not). Merge `metadata` with `lockId`.
4. Unless `autoExtend: false` (it defaults **on**), start a `setInterval`
   heartbeat that calls `extendWorkflowLock` every `max(1000, floor(ttlMs/2))`
   ms; a failed extend logs a warning (lock expired or taken over).
5. Run `executeWorkflowInternal(...)` with `metadata: { ...metadata, lockId }`.
6. `finally`: clear the heartbeat and `releaseWorkflowLock(name, lockId, lockValue)`.
   A throwing release (e.g. Redis outage) is logged and swallowed — the
   already-computed workflow result is still returned; the lock expires via TTL.

See [locking.md](./locking.md) for lock config and primitives.

## `WorkflowContext`

```ts
interface WorkflowContext {
  executionId: string;
  workflowName: string;
  startedAt: Date;
  attempt: number;          // 1-based; inside a step's invoke, the current attempt
  metadata: Record<string, unknown>;
  engineState?: WorkflowEngineState; // @internal — do not read/mutate from steps
}
```

Pass `metadata` for correlation ids, user ids, etc. Under a lock, `metadata.lockId`
is set for you.

## Gotchas

- **In-process only.** A crash mid-run loses the run; there is no resume. The lock
  is for *concurrency*, not durability — a crash will leave the lock held until its
  TTL expires (which is why `autoExtend` + a sane `ttlMs` matter).
- The **workflow timeout** wraps the whole generator. A workflow timeout fails the
  scope, which triggers compensations for already-completed steps.
- `defaultStepConfig.retry` only applies to steps created via `createStep`
  (they carry `rawConfig`). Hand-built step objects bypass it.
- A successful result has **no** `compensated`/`compensationsFailed`/
  `compensationErrors` fields — they exist only on `WorkflowFailure`.
