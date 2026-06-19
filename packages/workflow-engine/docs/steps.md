# Steps

Source: `src/step/create.ts`, `src/step/execute.ts`,
`src/types/step.ts`, `src/types/definition.ts`.

A step is the unit of work. It is a typed `async` function (`invoke`) plus an
optional `compensate` (undo) function and per-step config. `executeStep` is what
actually runs it inside a workflow, applying retry, timeout, and registering
compensation.

## `createStep`

```ts
function createStep<I, O>(
  name: string,
  invoke: (input: I, ctx: WorkflowContext, signal?: AbortSignal) => Promise<O>,
  compensate?: (input: I, output: O, ctx: WorkflowContext) => Promise<void>,
  config: StepConfig = {},
): StepDefinition<I, O>;
```

It merges config eagerly and returns a plain object:

```ts
{
  name,
  config: mergedConfig,   // RequiredStepConfig: defaults < config
  rawConfig: config,      // exactly what was passed (no defaults) — see below
  invoke,
  ...(compensate ? { compensate } : {}),
}
```

`mergedConfig` = `{ ...DEFAULT_STEP_CONFIG, ...config, retry: { ...DEFAULT_RETRY_POLICY, ...config.retry } }`.

`rawConfig` is kept *unmerged* so `executeStep` can layer workflow-level defaults
*between* the engine defaults and the step's own values. A step constructed by
hand without `rawConfig` falls back to `config` and skips workflow layering.

### Step definition shape

```ts
interface StepDefinition<I, O> {
  name: string;
  config: RequiredStepConfig;
  rawConfig?: StepConfig;
  invoke: (input: I, ctx: WorkflowContext, signal?: AbortSignal) => Promise<O>;
  compensate?: (input: I, output: O, ctx: WorkflowContext) => Promise<void>;
}
```

### `StepConfig`

```ts
interface StepConfig {
  timeoutMs?: number;          // per-attempt timeout (default 30000)
  retry?: Partial<RetryPolicy>;// default: no retries (maxAttempts 0)
  idempotent?: boolean;        // metadata only — the engine does not act on it
  description?: string;        // used in debug logs
}
```

> `idempotent` is **documentation/intent** today: nothing in the engine reads it
> to change behavior. Mark steps that are safe to retry for human readers and to
> signal the author's intent.

## `executeStep`

```ts
function executeStep<I, O>(
  step: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
): Effect.Effect<
  O,
  StepExecutionError | StepTimeoutError,
  Scope.Scope
>;
```

You always call it inside a workflow generator: `const x = yield* executeStep(step, input, ctx)`.
It requires a `Scope` in its context — supplied by `Effect.scoped(...)` in
`executeWorkflowInternal` — which is what lets compensation finalizers be registered.

### Behavior, step by step (`src/step/execute.ts`)

1. **Resolve config** via `resolveStepConfig`: `DEFAULT_STEP_CONFIG` <
   `ctx.engineState.defaultStepConfig` < `step.rawConfig`; `retry` merged the same
   way under `DEFAULT_RETRY_POLICY`. (No `rawConfig` ⇒ use `step.config` as-is.)
2. **Build one attempt** as `Effect.timeoutFail(Effect.tryPromise(...))`:
   - `tryPromise` calls `step.invoke(input, { ...ctx, attempt: attemptCount }, signal)`.
     `attemptCount` is incremented inside `try` so `ctx.attempt` is accurate and
     1-based, and the AbortSignal is the one Effect provides.
   - On a thrown error, `catch` wraps it in `StepExecutionError(stepName, message, cause, workflowName)` (the original error is `cause`).
   - On exceeding `timeoutMs`, `onTimeout` produces a `StepTimeoutError`.
3. **If `maxAttempts > 0`, wrap in `Effect.retry`** with:
   - `schedule`: `Schedule.exponential(initialDelayMs, backoffMultiplier)` unioned
     with `Schedule.spaced(maxDelayMs)` (the cap) and intersected with
     `Schedule.recurs(maxAttempts)`. See [retry.md](./retry.md).
   - `while`: the user's `isRetryable(originalError)` if provided, else
     "retry unless the error's `name === 'ValidationError'`". The predicate is
     handed the **unwrapped** error (`StepExecutionError.cause ?? error`, or the
     `StepTimeoutError` for timeouts).
4. **Map exhausted retries**: after retrying, `catchAll` checks
   `attemptCount > maxAttempts`. If so it records
   `MaxRetriesExceededError(stepName, maxAttempts, lastError, workflowName)` onto
   `ctx.engineState.retriesExceeded` and then **re-fails the step with the last
   `StepExecutionError`/`StepTimeoutError`** (not the `MaxRetriesExceededError`).
   The workflow boundary later surfaces the recorded error as `result.error`
   (code `MAX_RETRIES_EXCEEDED`). If the predicate stopped retries early
   (`attemptCount <= maxAttempts`), nothing is recorded and the last error
   propagates as-is.
5. **Run the attempt(s)** and log `debug` "Step completed" with `durationMs` and
   `attempts`.
6. **Register compensation** (only if `step.compensate` exists) via
   `Effect.addFinalizer((exit) => ...)`:
   - If the scope closes with **failure**, run `step.compensate(input, result, ctx)`.
     On success, increment `engineState.compensationsRun`.
     On throw, increment `engineState.compensationsFailed`, log the error
     (with the squashed original cause), and **swallow** it (`Effect.catchAll → Effect.void`).
   - If the scope closes with **success**, the finalizer is a no-op.
7. **Return** the step output.

### Compensation timing

Compensation is registered **after** the step succeeds, so an output exists to
pass to `compensate(input, output, ctx)`. Finalizers run in **reverse**
registration order when the workflow scope fails — i.e. the most recently
completed step is rolled back first.

```ts
const a = createStep("a", invokeA, undoA);
const b = createStep("b", invokeB, undoB);
const wf = createWorkflow("saga", (input, ctx) =>
  Effect.gen(function* () {
    yield* executeStep(a, input, ctx); // succeeds
    yield* executeStep(b, input, ctx); // succeeds
    yield* executeStep(boom, input, ctx); // throws
  }),
);
// rollback order on failure: undoB, then undoA
```

## Gotchas

- A timed-out promise is *abandoned*, not force-killed. JS can't cancel a
  promise, so forward the `signal` (3rd `invoke` arg) into `fetch`/db calls to
  actually stop work on timeout.
- `attempt` in the *outer* `ctx` passed to `executeStep` is whatever the workflow
  set (1); inside `invoke` you receive `{ ...ctx, attempt: attemptCount }`, so use
  the `ctx` parameter your `invoke` function is given to read the real attempt
  number.
- Don't throw from compensation expecting it to abort anything — it's logged and
  swallowed; only `compensationsFailed` reflects it.
- `executeStep` needs a `Scope`. Calling it outside a scoped workflow effect is a
  type error (its `R` channel includes `Scope.Scope`).
