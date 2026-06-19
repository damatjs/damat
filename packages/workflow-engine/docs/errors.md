# Errors

Source: `src/errors/base.ts`, `src/errors/step/*`, `src/errors/compensation.ts`,
`src/errors/lock.ts`.

All errors extend `WorkflowError`. Every error carries a programmatic `code` and
a `_tag` (Effect-style discriminant). The workflow result's `error` field is
always a `WorkflowError` (or subclass).

## `WorkflowError` (base)

```ts
class WorkflowError extends Error {
  readonly _tag: string = "WorkflowError";
  constructor(
    public readonly code: string,        // programmatic code
    message: string,
    public readonly workflowName?: string,
    public readonly stepName?: string,
    public readonly cause?: unknown,      // original underlying error
  ) { super(message); this.name = "WorkflowError"; }
}
```

It is also used directly with two codes produced by the workflow runner:

- `WORKFLOW_TIMEOUT` — the whole-workflow `timeoutMs` elapsed.
- `WORKFLOW_FAILED` — a non-`WorkflowError` escaped the generator and was wrapped
  (the raw error is in `cause`).

## Subclasses

| Class | `code` | `_tag` | Thrown when | Extra fields |
| --- | --- | --- | --- | --- |
| `StepExecutionError` | `STEP_EXECUTION_FAILED` | `StepExecutionError` | `step.invoke` throws | `cause` = the thrown error |
| `StepTimeoutError` | `STEP_TIMEOUT` | `StepTimeoutError` | a step attempt exceeds `timeoutMs` | `timeoutMs` |
| `MaxRetriesExceededError` | `MAX_RETRIES_EXCEEDED` | `MaxRetriesExceededError` | all retries exhausted (surfaced at the **workflow** boundary) | `maxRetries`; `cause` = last error |
| `CompensationError` | `COMPENSATION_FAILED` | `CompensationError` | a compensation throws | `cause` = the thrown error |
| `WorkflowLockError` | `WORKFLOW_LOCKED` | `WorkflowLockError` | lock can't be acquired | `lockId` |

### Signatures

```ts
new StepExecutionError(stepName, message, cause?, workflowName?);
new StepTimeoutError(stepName, timeoutMs, workflowName?);
new MaxRetriesExceededError(stepName, maxRetries, lastError, workflowName?);
new CompensationError(stepName, message, cause?, workflowName?);
new WorkflowLockError(workflowName, lockId);
```

## Where each surfaces

- **`StepExecutionError`** is the immediate wrapper of any throw inside `invoke`.
  With no retries it is the step's failure. With retries it is the per-attempt
  failure that the retry loop sees.
- **`StepTimeoutError`** comes from `Effect.timeoutFail` per attempt. Retryable by
  default.
- **`MaxRetriesExceededError`** is **not** raised by the step. Once
  `attemptCount > maxAttempts`, the step re-fails with its last
  `StepExecutionError`/`StepTimeoutError`, and the engine records a
  `MaxRetriesExceededError` on `ctx.engineState.retriesExceeded`. The workflow
  boundary then promotes that recorded error to `result.error`. `cause` holds the
  last underlying error.
- **`CompensationError`** is constructed inside the compensation finalizer, then
  **logged and swallowed** — it never reaches `result.error`. Its only externally
  visible effect is incrementing `result.compensationsFailed`.
- **`WorkflowLockError`** is placed in a `WorkflowFailure` by `executeWithLock`
  when acquisition fails (it is returned, not thrown).

## Handling pattern

```ts
const result = await workflow.execute(input);
if (!result.success) {
  switch (result.error.code) {
    case "WORKFLOW_LOCKED":     /* already running */ break;
    case "STEP_TIMEOUT":        /* slow dependency */ break;
    case "MAX_RETRIES_EXCEEDED":/* persistent failure; inspect .cause */ break;
    default:                    /* STEP_EXECUTION_FAILED / WORKFLOW_FAILED / WORKFLOW_TIMEOUT */
  }
  // result.compensated / result.compensationsFailed describe rollback
}
```

You can also branch on `instanceof` (the classes are exported) or on `_tag`.

## Adding an error type

1. Create a class extending `WorkflowError` with a unique `code` and `override readonly _tag`.
2. Set `this.name` in the constructor.
3. Export it from `src/errors/index.ts` (or `src/errors/step/index.ts` for step errors).
4. Add it to the export list in `src/index.ts`.
5. If a step path can produce it, widen the error channel return type of
   `executeStep` accordingly.

## Gotchas

- `cause` is `unknown` — narrow before use.
- The base `WorkflowError._tag` is a mutable-typed `string` (so subclasses can
  `override` it with a literal); rely on `code`/`instanceof` for exhaustive
  matching rather than the base tag's type.
- Compensation errors are intentionally invisible in `result.error`. Watch
  `compensationsFailed` and your logs.
