# Retry & timeout

Source: `src/types/retry.ts`, `src/config/retry/default.ts`,
`src/config/retry/policies.ts`, and the retry logic in `src/step/execute.ts`.

## `RetryPolicy`

```ts
interface RetryPolicy {
  maxAttempts: number;          // number of RETRIES (0 = none). Total runs = 1 + maxAttempts
  initialDelayMs: number;       // first backoff delay
  maxDelayMs: number;           // cap applied to each delay
  backoffMultiplier: number;    // exponential factor (e.g. 2)
  isRetryable?: (error: unknown) => boolean; // predicate on the ORIGINAL error
}
```

### The attempts model

`maxAttempts` counts **retries**, not total tries. With `maxAttempts: 2`, a step
that always fails runs **3 times** (1 initial + 2 retries) and then fails with
`MaxRetriesExceededError`. This is asserted in `tests/engine.test.ts`
("exhausted retries fail with MaxRetriesExceededError" → `attempts === 3`).

## Defaults

```ts
// src/config/retry/default.ts
DEFAULT_RETRY_POLICY = { maxAttempts: 0, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 };
```

So by default steps **do not retry**. `DEFAULT_STEP_CONFIG.timeoutMs` is `30_000`
and `DEFAULT_STEP_CONFIG.idempotent` is `true` (see the idempotency gate below).

## The idempotency gate

Retries only run when the step is idempotent (the default). A step configured
with `idempotent: false` is **never** automatically retried:

- `maxAttempts` is ignored — a warning is logged when it is `> 0`.
- The first failure propagates straight to the workflow's
  failure/compensation path.
- Since retries were *suppressed*, not *exhausted*, no
  `MaxRetriesExceededError` is recorded — the plain
  `StepExecutionError`/`StepTimeoutError` surfaces at the workflow boundary.

Use it for steps whose side effects must not be duplicated (payments, emails,
non-idempotent external APIs). The gate resolves through the normal config
layering, so it can also come from a workflow's `defaultStepConfig` or a
per-call override.

## Presets — `RetryPolicies`

```ts
// src/config/retry/policies.ts  (each is a Partial<RetryPolicy>)
RetryPolicies.none       // { maxAttempts: 0 }
RetryPolicies.once       // { maxAttempts: 1, initialDelayMs: 0 }
RetryPolicies.standard   // { maxAttempts: 3, initialDelayMs: 100,  maxDelayMs: 5000,  backoffMultiplier: 2 }
RetryPolicies.aggressive // { maxAttempts: 5, initialDelayMs: 50,   maxDelayMs: 10000, backoffMultiplier: 2 }
RetryPolicies.patient    // { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 3 }
```

`RetryPolicyPreset = keyof typeof RetryPolicies`. Presets are partial; missing
fields fall back to `DEFAULT_RETRY_POLICY` during config merge.

Usage:

```ts
createStep("call-api", invoke, undefined, { retry: RetryPolicies.standard });
// or a custom policy:
createStep("call-api", invoke, undefined, {
  retry: { maxAttempts: 4, initialDelayMs: 200, maxDelayMs: 10_000, backoffMultiplier: 2,
           isRetryable: (e) => !(e instanceof MyValidationError) },
});
```

## The backoff schedule (`src/step/execute.ts`)

When `maxAttempts > 0` (and the step is idempotent), the engine builds an
Effect `Schedule`:

```ts
Schedule.exponential(Duration.millis(initialDelayMs), backoffMultiplier)
  .pipe(
    Schedule.union(Schedule.spaced(Duration.millis(maxDelayMs))), // cap each delay
    Schedule.intersect(Schedule.recurs(maxAttempts)),             // bound the count
  );
```

- **Exponential**: delay grows `initialDelayMs * backoffMultiplier^k`.
- **`union` with `spaced(maxDelayMs)`**: caps each delay at `maxDelayMs`. The
  capping test (`maxDelayMs: 20`, `backoffMultiplier: 1000`) confirms a run that
  would otherwise wait ~1000s finishes in under 2s.
- **`intersect` with `recurs(maxAttempts)`**: stops after `maxAttempts` retries.

> Why `union` for the cap: `Schedule.union` takes the *shorter* of the two delays,
> so once the exponential delay exceeds `maxDelayMs`, the `spaced` schedule wins —
> producing a flat cap.

## `while` / `isRetryable`

The retry continues while the predicate returns true:

```ts
while: (error) => {
  const original = error instanceof StepExecutionError ? (error.cause ?? error) : error;
  return retryPolicy.isRetryable
    ? retryPolicy.isRetryable(original)
    : !(original instanceof Error && original.name === "ValidationError");
}
```

- The predicate receives the **original** error your `invoke` threw (unwrapped
  from `StepExecutionError`), or the `StepTimeoutError` for timeouts. Test
  "isRetryable receives the original error" asserts this.
- **Default behavior** (no `isRetryable`): retry everything *except* errors whose
  `name === "ValidationError"`.
- Returning `false` stops retries early; the last error propagates as-is (it is
  **not** wrapped in `MaxRetriesExceededError`, because `attemptCount <= maxAttempts`).

## Timeouts interact with retry

`timeoutMs` is **per attempt**. A timed-out attempt becomes a retryable
`StepTimeoutError`. Test "step timeout applies per attempt and is retryable":
first attempt sleeps past a 50ms timeout (→ `StepTimeoutError`), the retry runs
fast and succeeds. Timeouts are retryable by default (their `name` is not
`"ValidationError"`).

## Exhaustion

When all retries are spent (`attemptCount > maxAttempts`), the step itself
**re-fails with the last `StepExecutionError`/`StepTimeoutError`** — not with a
`MaxRetriesExceededError`. Instead, the engine records the latter on the context:

```ts
ctx.engineState.retriesExceeded = new MaxRetriesExceededError(
  step.name, maxAttempts, lastError, ctx.workflowName,
);
// code: "MAX_RETRIES_EXCEEDED"; .cause = last error
```

The workflow boundary then surfaces this recorded error as the `WorkflowResult`'s
`error` (so `result.error.code === "MAX_RETRIES_EXCEEDED"`). At the **step**
level, the error channel is only `StepExecutionError | StepTimeoutError`.

## Gotchas

- Don't set `maxAttempts` expecting "total tries" — it's retries on top of the
  first attempt.
- `initialDelayMs: 0` (as in `RetryPolicies.once`) still uses exponential math;
  with a 0 base the delays stay 0.
- The cap (`maxDelayMs`) applies per delay, not to total time. Bound total runtime
  with the workflow `timeoutMs` if needed.
