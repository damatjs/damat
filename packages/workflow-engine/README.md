# @damatjs/workflow-engine

> Saga-style workflow orchestration on Effect-TS: typed steps with automatic compensation, retries, timeouts, and distributed locking.

`@damatjs/workflow-engine` runs multi-step business processes that must succeed as a unit or roll back cleanly. You author each step as a plain `async` function with an optional compensation (undo) function, compose steps inside an Effect generator, and the engine handles retries, per-attempt timeouts, reverse-order rollback on failure, and (optionally) a Redis lock so the same workflow can't run twice concurrently. It is the orchestration primitive used across Damat — module workflows are built on it, and the framework re-exports it.

> **Warning — best-effort, in-process saga.** All workflow state (completed
> steps, registered compensations) lives in memory for the duration of a run.
> There is no durable journal and no crash recovery: if the process crashes or
> is killed mid-workflow, compensations for already-completed steps will **not**
> run and the run cannot be resumed. The saga gives you rollback on _failure_
> inside a live process — for crash-safe guarantees, pair it with idempotent
> steps, reconciliation jobs, or an external saga log.

Part of the [Damat](../../README.md) monorepo · [Full guide](../../docs/GUIDE.md) · [Internals](./docs/README.md)

## Install

```bash
bun add @damatjs/workflow-engine
```

Inside the Damat monorepo it is a workspace package — depend on it with the `*` version range:

```json
{ "dependencies": { "@damatjs/workflow-engine": "*" } }
```

## When to use

Use it when:

- A process spans multiple side-effecting steps (create order → charge card → reserve stock) and a later failure must **undo** earlier work (saga / compensating transactions).
- You want per-step **retries with exponential backoff** and **per-attempt timeouts** without hand-rolling them.
- You need **mutual exclusion** across processes/instances — e.g. "only one workflow may process this order at a time" (distributed lock via `@damatjs/redis`).
- You want typed inputs/outputs threaded through a process and structured logging for free.

Skip it when:

- A single function call with `try/catch` covers your needs — there is no orchestration to do.
- You need durable, resumable-after-crash workflows. This engine is **in-process**: state lives in memory for the duration of a run; it does not persist a journal or resume interrupted executions.

## Quick start

```ts
import {
  createStep,
  createWorkflow,
  executeStep,
  StepResponse,
  RetryPolicies,
  Effect,
} from "@damatjs/workflow-engine";

// A step returns a StepResponse(output, compensateInput?): the output flows
// downstream; the compensateInput is the only thing the compensation receives.
const createOrder = createStep<{ items: string[] }, Order, string>(
  "create-order",
  async (input, ctx, signal) => {
    const order = await orderService.create(input, { signal }); // forward signal so timeouts cancel
    return new StepResponse(order, order.id); // output = order; rollback payload = order id
  },
  // Compensation — runs (in reverse order) if a *later* step fails. Receives the
  // compensateInput (the order id) plus ctx — not the original input/output.
  async (orderId, ctx) => {
    await orderService.cancel(orderId);
  },
  { retry: RetryPolicies.standard, timeoutMs: 10_000 },
);

const chargeCard = createStep<{ orderId: string }, Payment>(
  "charge-card",
  async (input) => new StepResponse(await paymentService.charge(input.orderId)),
);

const placeOrder = createWorkflow(
  "place-order",
  (input: { items: string[] }, ctx) =>
    Effect.gen(function* () {
      const order = yield* executeStep(createOrder, input, ctx);
      const payment = yield* executeStep(
        chargeCard,
        { orderId: order.id },
        ctx,
      );
      return { order, payment };
    }),
  { timeoutMs: 60_000 },
);

const result = await placeOrder.execute({ items: ["sku-1"] });
if (result.success) {
  console.log(result.result, result.durationMs);
} else {
  // If chargeCard failed, createOrder's compensation already ran. Any
  // compensation that itself threw is listed in result.compensationErrors
  // (empty array when none failed) — the original error is never replaced.
  console.error(
    result.error.code,
    result.compensated,
    result.compensationErrors,
  );
}
```

## API

| Export                                                                                                                         | Kind      | Summary                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createStep(name, invoke, compensate?, config?)`                                                                               | function  | Build a typed `StepDefinition<I, O, C>`. `invoke` returns a `StepResponse<O, C>`; `compensate(compensateInput, ctx)` gets the `C` payload.                                               |
| `StepResponse(output, compensateInput?)`                                                                                       | class     | `invoke`'s return: `output` flows downstream, `compensateInput` is delivered to `compensate` (required when `C` excludes `undefined`).                                                   |
| `executeStep(step, input, ctx, overrideConfig?)`                                                                               | function  | Run a step inside a workflow generator (handles timeout, retry, compensation registration). The optional `overrideConfig` layers per-call timeout/retry on top of the step's own config. |
| `step(input, ctx, overrideConfig?)`                                                                                            | call      | A `StepDefinition` is callable: `step(input, ctx)` ≡ `executeStep(step, input, ctx)`, with the same optional per-call override.                                                          |
| `createWorkflow(name, definition, config?)`                                                                                    | function  | Build a `WorkflowDefinition<I, O>` exposing `execute` and `executeWithLock`.                                                                                                             |
| `runStep(step, input, ctx, overrideConfig?)`                                                                                   | function  | Alias of `executeStep` for readability.                                                                                                                                                  |
| `skipStep(value)`                                                                                                              | function  | An effect that immediately succeeds with `value` (for conditional branches).                                                                                                             |
| `parallel(...effects)`                                                                                                         | function  | Run step effects concurrently; resolves to a tuple of outputs.                                                                                                                           |
| `when(cond, step, input, ctx, default)`                                                                                        | function  | Run `step` if `cond`, else return `default`.                                                                                                                                             |
| `ifElse(cond, ifTrue, ifFalse, input, ctx)`                                                                                    | function  | Run one of two steps by condition.                                                                                                                                                       |
| `acquireWorkflowLock` / `releaseWorkflowLock` / `extendWorkflowLock` / `isWorkflowLocked`                                      | function  | Manual distributed-lock primitives (Redis-backed).                                                                                                                                       |
| `RetryPolicies`                                                                                                                | const     | Presets: `none`, `once`, `standard`, `aggressive`, `patient`.                                                                                                                            |
| `DEFAULT_RETRY_POLICY` / `DEFAULT_STEP_CONFIG` / `DEFAULT_WORKFLOW_CONFIG`                                                     | const     | Engine defaults (no retries, 30s step / 5min workflow timeout).                                                                                                                          |
| `WorkflowError`, `StepExecutionError`, `StepTimeoutError`, `MaxRetriesExceededError`, `CompensationError`, `WorkflowLockError` | class     | Error hierarchy; all extend `WorkflowError` and carry a `code`.                                                                                                                          |
| `Effect`, `Scope`                                                                                                              | re-export | Re-exported from `effect` so callers don't add a direct dependency.                                                                                                                      |

Key types: `StepDefinition<I,O>`, `WorkflowDefinition<I,O>`, `WorkflowContext`, `WorkflowResult<T>` (`WorkflowSuccess<T>` \| `WorkflowFailure`), `StepConfig`, `WorkflowConfig`, `RetryPolicy`, `WorkflowLockConfig`, `WorkflowLockResult`.

## How it fits

Depends on:

- `effect` — composable, typed effects (timeouts, retry schedules, scoped finalizers for compensation).
- `@damatjs/redis` — distributed-lock primitives (`acquireLock`/`releaseLock`/`extendLock`/`isLocked`).
- `@damatjs/logger` — structured, context-scoped logging (no-op if no global logger is set).
- `nanoid` — unique `executionId` per run.

Depended on by (in-repo):

- `@damatjs/module` — re-exports the engine as part of its module authoring surface.
- `@damatjs/framework` — re-exports it to backend apps.
- `backend/default` — the generated backend app.

## Documentation

- [Internals & maintainer guide](./docs/README.md)
- [Damat full guide](../../docs/GUIDE.md)

## License

MIT
