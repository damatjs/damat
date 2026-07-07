# Steps

Source: `src/step/create.ts`, `src/step/execute.ts`,
`src/types/step.ts`, `src/types/definition.ts`.

A step is the unit of work. It is a typed `async` function (`invoke`) plus an
optional `compensate` (undo) function and per-step config. `executeStep` is what
actually runs it inside a workflow, applying retry, timeout, and registering
compensation.

`invoke` returns a [`StepResponse`](#stepresponse) wrapping its `output` (what
flows downstream) and an optional `compensateInput` (the payload handed to
`compensate`). `compensate` receives **only** that payload plus the context — not
the original input or output. The third generic `C` is the compensation payload
type and defaults to `undefined`.

## `createStep`

```ts
function createStep<I, O, C = undefined>(
  name: string,
  invoke: (input: I, ctx: WorkflowContext, signal?: AbortSignal) => Promise<StepResponse<O, C>>,
  compensate?: (compensateInput: C, ctx: WorkflowContext) => Promise<void>,
  config: StepConfig = {},
): StepDefinition<I, O, C>;
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
interface StepDefinition<I, O, C = undefined> {
  name: string;
  config: RequiredStepConfig;
  rawConfig?: StepConfig;
  invoke: (input: I, ctx: WorkflowContext, signal?: AbortSignal) => Promise<StepResponse<O, C>>;
  compensate?: (compensateInput: C, ctx: WorkflowContext) => Promise<void>;
}
```

### `StepConfig`

```ts
interface StepConfig {
  timeoutMs?: number;          // per-attempt timeout (default 30000)
  retry?: Partial<RetryPolicy>;// default: no retries (maxAttempts 0)
  idempotent?: boolean;        // safe to retry? false suppresses retries (default true)
  description?: string;        // used in debug logs
}
```

> `idempotent: false` **disables automatic retries** for the step: retries
> re-invoke `invoke` wholesale, so a step whose side effects must not be
> duplicated (e.g. a payment charge without an idempotency key) fails straight
> to the workflow's failure/compensation path on its first error. Any configured
> retry policy is ignored (with a logged warning). The default (`true`) leaves
> retry behavior entirely to the `retry` policy. See
> [retry.md](./retry.md#the-idempotency-gate).

## `StepResponse`

Source: `src/step/response.ts`. The value `invoke` returns.

```ts
class StepResponse<O, C = undefined> {
  readonly output: O;          // flows downstream / to the next step
  readonly compensateInput: C; // handed to compensate (or undefined)
  constructor(
    output: O,
    // required when C excludes undefined, optional otherwise
    ...rest: undefined extends C ? [compensateInput?: C] : [compensateInput: C]
  );
  static isStepResponse(value: unknown): value is StepResponse<unknown, unknown>;
}
```

- **`output`** is unwrapped by `executeStep` and returned downstream — the
  workflow never sees the `StepResponse` itself.
- **`compensateInput`** is the *only* thing `compensate` receives (plus `ctx`).
  There is **no fallback**: provide nothing and `compensate` gets `undefined`,
  never the output.
- **Type-enforced optionality.** When `C` excludes `undefined`, the second
  constructor argument is **required** — a step that declares it needs rollback
  data cannot forget to capture it (`new StepResponse(output)` is a compile
  error). Type `C` as `… | undefined` to opt out, then the payload may be omitted
  and `compensate` must guard for `undefined`.
- **Detection** uses a realm-global `Symbol.for` brand (`isStepResponse`), not
  `instanceof`, so it survives duplicate copies of the package.

```ts
// rollback needs the prior row → capture it as the payload
return new StepResponse(updatedRow, priorRow);
// read-only step → output only, no payload
return new StepResponse(rows);
```

## `executeStep`

```ts
function executeStep<I, O, C = undefined>(
  step: StepDefinition<I, O, C>,
  input: I,
  ctx: WorkflowContext,
  overrideConfig?: StepConfig,   // optional per-call timeout/retry override
): Effect.Effect<
  O,
  StepExecutionError | StepTimeoutError,
  Scope.Scope
>;
```

You always call it inside a workflow generator: `const x = yield* executeStep(step, input, ctx)`.
It requires a `Scope` in its context — supplied by `Effect.scoped(...)` in
`executeWorkflowInternal` — which is what lets compensation finalizers be registered.

**Calling a step directly.** A step built by `createStep` is itself callable, so
`step(input, ctx)` is exact sugar for `executeStep(step, input, ctx)` — write
`const x = yield* createUser(input, ctx)` and skip the `executeStep` wrapper.

**Per-call override.** Both forms take an optional final `StepConfig` that is
layered **on top of** the step's own config for that one invocation —
`step(input, ctx, { timeoutMs: 15_000, retry: { maxAttempts: 5 } })` or
`executeStep(step, input, ctx, { timeoutMs: 15_000 })`. Omit it to keep the
step's configured values. This keeps retry/timeout available when calling steps
directly without baking per-site values into the step definition.

### Behavior, step by step (`src/step/execute.ts`)

1. **Resolve config** via `resolveStepConfig`: `DEFAULT_STEP_CONFIG` <
   `ctx.engineState.defaultStepConfig` < `step.rawConfig` < the per-call
   `overrideConfig` (highest priority); `retry` merged the same way under
   `DEFAULT_RETRY_POLICY`. (No `rawConfig` ⇒ use `step.config`, with any
   `overrideConfig` still layered on top.)
2. **Build one attempt** as `Effect.timeoutFail(Effect.tryPromise(...))`:
   - `tryPromise` calls `step.invoke(input, { ...ctx, attempt: attemptCount }, signal)`.
     `attemptCount` is incremented inside `try` so `ctx.attempt` is accurate and
     1-based, and the AbortSignal is the one Effect provides.
   - On a thrown error, `catch` wraps it in `StepExecutionError(stepName, message, cause, workflowName)` (the original error is `cause`).
   - On exceeding `timeoutMs`, `onTimeout` produces a `StepTimeoutError`.
3. **If `maxAttempts > 0` and the step is `idempotent`, wrap in `Effect.retry`**
   (a non-idempotent step skips retry entirely — a warning is logged when a
   retry policy was configured anyway) with:
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
5. **Run the attempt(s)**, then **unwrap the `StepResponse`** once: `output` is
   returned downstream; `compensateInput` (or `undefined` when none was provided)
   is held for the finalizer. A non-`StepResponse` value (a JS caller ignoring the
   types) is treated as the `output` with no payload. Log `debug` "Step completed".
6. **Register compensation** (only if `step.compensate` exists) via
   `Effect.addFinalizer((exit) => ...)`:
   - If the scope closes with **failure**, run `step.compensate(compensateInput, ctx)`.
     On success, increment `engineState.compensationsRun`.
     On throw, increment `engineState.compensationsFailed`, log the error
     (with the squashed original cause), and **swallow** it (`Effect.catchAll → Effect.void`).
   - If the scope closes with **success**, the finalizer is a no-op.
7. **Return** the step output (the unwrapped `StepResponse.output`).

### Compensation timing

Compensation is registered **after** the step succeeds, so the `compensateInput`
captured by the forward step exists to pass to `compensate(compensateInput, ctx)`.
Finalizers run in **reverse** registration order when the workflow scope fails —
i.e. the most recently completed step is rolled back first.

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
