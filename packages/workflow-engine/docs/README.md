# @damatjs/workflow-engine — Internals

Maintainer-facing documentation for the workflow engine. For the public
overview and quick start, see the [package README](../README.md).

## What this package is

A saga-style, **in-process** workflow orchestrator built on [Effect-TS](https://effect.website).
A *workflow* is a generator that yields *steps*. The engine wraps each step
with retry + per-attempt timeout, registers compensations as scoped finalizers
that fire in reverse order on failure, wraps the whole workflow in a timeout,
and turns the Effect `Exit` into a plain `WorkflowResult` discriminated union.

**Best-effort, in-process only.** There is no persisted journal — a run lives
entirely in memory. A crash mid-workflow will **not** run compensations for
already-completed steps and cannot be resumed; rollback only happens when the
workflow *fails* inside a live process.

## Module map

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Public barrel. Curates exactly what is exported (note: lock barrel `src/lock/index.ts` exports helpers like `getLockKey`, but only the four named lock fns are re-exported from the root). |
| `src/types/` | All interfaces/types. See [steps.md](./steps.md), [workflows.md](./workflows.md). |
| `src/types/step.ts` | `StepConfig`, `RequiredStepConfig`. |
| `src/types/workflow.ts` | `WorkflowConfig`, `RequiredWorkflowConfig`. |
| `src/types/context.ts` | `WorkflowContext`, internal `WorkflowEngineState`. |
| `src/types/definition.ts` | `StepDefinition<I,O>`, `WorkflowDefinition<I,O>`. |
| `src/types/result.ts` | `WorkflowSuccess`, `WorkflowFailure`, `WorkflowResult`. |
| `src/types/retry.ts` | `RetryPolicy`. |
| `src/types/lock.ts` | `WorkflowLockConfig`, `WorkflowLockResult`. |
| `src/errors/` | Error hierarchy. See [errors.md](./errors.md). |
| `src/config/` | `DEFAULT_*` config + `RetryPolicies` presets. See [retry.md](./retry.md). |
| `src/step/create.ts` | `createStep` — builds a `StepDefinition`, merges config. See [steps.md](./steps.md). |
| `src/step/execute.ts` | `executeStep` — the engine core: config layering, retry, timeout, compensation registration. |
| `src/workflow/create.ts` | `createWorkflow` — wraps `execute`/`executeWithLock`. See [workflows.md](./workflows.md). |
| `src/workflow/execute.ts` | `executeWorkflowInternal` — runs the Effect, builds `WorkflowResult`. |
| `src/lock/` | Redis-backed distributed locking. See [locking.md](./locking.md). |
| `src/utils/` | `runStep`, `skipStep`, `parallel`, `when`, `ifElse`. See [control-flow.md](./control-flow.md). |

## Split docs

- [steps.md](./steps.md) — `createStep`, `executeStep`, config layering, compensation registration.
- [workflows.md](./workflows.md) — `createWorkflow`, `execute`, `executeWithLock`, result mapping.
- [control-flow.md](./control-flow.md) — `parallel`, `when`, `ifElse`, `skipStep`, `runStep`.
- [retry.md](./retry.md) — `RetryPolicy`, presets, backoff schedule, `isRetryable`.
- [locking.md](./locking.md) — the lock primitives, lock keys, auto-extend heartbeat.
- [errors.md](./errors.md) — error classes, codes, properties.

## Architecture overview

```
createWorkflow(name, definition, config)
  └─ returns { name, config, execute, executeWithLock }

execute(input, metadata)
  └─ executeWorkflowInternal(...)
       ├─ build WorkflowContext { executionId, engineState, ... }
       ├─ Effect.scoped( definition(input, ctx) )      ← the user's generator
       │     └─ each `yield* executeStep(step, in, ctx)`:
       │          ├─ resolveStepConfig (defaults < workflow defaults < step)
       │          ├─ Effect.timeoutFail( Effect.tryPromise(step.invoke) )
       │          ├─ Effect.retry(..., { schedule, while: isRetryable })
       │          ├─ on retries exhausted → re-fail with last error +
       │          │     record MaxRetriesExceededError on engineState.retriesExceeded
       │          └─ if step.compensate: Effect.addFinalizer (runs on scope failure)
       ├─ Effect.timeoutFail(...)                       ← whole-workflow timeout
       └─ Effect.runPromiseExit → map Exit to WorkflowResult
```

Compensation is *not* explicit unwinding code. Each successful step with a
`compensate` fn adds a finalizer to the workflow's `Scope`. When the scope
closes with a **failure** `Exit`, Effect runs the finalizers in **reverse**
registration order — that's the saga rollback. On success the finalizers are
no-ops.

## Control & data flow

- **Context (`WorkflowContext`)** is created once per execution and threaded to
  every step. It carries `executionId`, `workflowName`, `startedAt`, the current
  `attempt`, free-form `metadata`, and `engineState` (`@internal` bookkeeping).
- **`engineState`** lives on the context so a step's compensation finalizer can
  increment `compensationsRun` / `compensationsFailed` and collect
  `compensationErrors`, which the workflow result then reports. Steps must not
  read or mutate it.
- **Errors flow as the Effect error channel.** Step-level errors are
  `StepExecutionError | StepTimeoutError`. At the workflow boundary, if a step
  recorded `engineState.retriesExceeded` (retries exhausted), that
  `MaxRetriesExceededError` becomes the result error; otherwise `Cause.squash`
  extracts the failure — if it is already a `WorkflowError` it is passed through,
  else it is wrapped as `WorkflowError("WORKFLOW_FAILED", ...)`.

## Invariants & design decisions

- **`maxAttempts: N` means 1 initial attempt + up to N retries.** A step that
  always fails with `maxAttempts: 2` calls `invoke` 3 times (see
  `tests/engine.test.ts` "exhausted retries").
- **`timeoutMs` is per attempt, not per step.** A timed-out attempt becomes a
  retryable `StepTimeoutError`.
- **`isRetryable` receives the *original* error**, not the engine wrapper:
  `execute.ts` unwraps `StepExecutionError.cause` before calling the predicate.
- **Default no-retry policy.** `DEFAULT_RETRY_POLICY.maxAttempts === 0`, so steps
  don't retry unless configured. The default `while` predicate (when retrying)
  skips errors named `"ValidationError"`.
- **`idempotent: false` suppresses retries entirely.** Retries re-invoke a step
  wholesale, so a step explicitly marked non-idempotent is never retried — its
  first failure goes straight to the failure/compensation path (a warning is
  logged if a retry policy was configured). Default is `idempotent: true`.
- **Locks auto-extend by default.** `executeWithLock` heartbeats the lock TTL
  every `ttlMs/2` unless `autoExtend: false`; a failed *release* is logged and
  swallowed (the TTL frees the lock) so it never discards the workflow result.
- **Compensation never masks the original error.** Compensation failures are
  logged, counted in `compensationsFailed`, collected (in occurrence order) in
  `compensationErrors`, and swallowed (`Effect.catchAll → Effect.void`) — the
  workflow's own error is never replaced.
- **`compensated` is true only if at least one compensation ran successfully**
  (`engineState.compensationsRun > 0`).
- **`executionId` is always unique** (`nanoid`), even under a lock — the `lockId`
  is a business id that repeats across runs and is surfaced via `metadata.lockId`.
- **Config layering is three-deep:** `DEFAULT_STEP_CONFIG` < workflow
  `defaultStepConfig` < the step's own `rawConfig`; `retry` is merged the same
  way under `DEFAULT_RETRY_POLICY`.
- **Steps built outside `createStep`** (no `rawConfig`) skip workflow-level
  layering and use their pre-merged `config` as-is.
- **Logging is silent by default.** The engine logs through `@damatjs/logger`'s
  global logger; if none is set, it is a no-op. Inputs are logged at `debug` only
  (they may contain PII/credentials).

## Safe-extension guidance

- Adding a new error type: extend `WorkflowError`, set a unique `code` and `_tag`,
  add it to `src/errors/index.ts` (or `src/errors/step/index.ts`), and to the
  `index.ts` export list.
- Adding a control-flow helper: put it under `src/utils/`, return an
  `Effect.Effect<O, WorkflowError, Scope.Scope>` so it composes with `executeStep`,
  and export it from `src/utils/index.ts` and root `index.ts`.
- Changing config defaults: edit `src/config/constant.ts` /
  `src/config/retry/default.ts`. Keep `RequiredStepConfig`/`RequiredWorkflowConfig`
  fully populated — `resolveStepConfig` assumes every field is present.
- Touching retry/timeout logic lives entirely in `src/step/execute.ts`; the
  retry schedule is an Effect `Schedule` (exponential ∩ recurs, unioned with a
  spaced cap). See [retry.md](./retry.md) before changing it.
