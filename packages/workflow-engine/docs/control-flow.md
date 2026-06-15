# Control flow helpers

Source: `src/utils/runStep.ts`, `src/utils/skipStep.ts`,
`src/utils/parallel.ts`, `src/utils/conditional.ts`.

These are thin, composable wrappers that return Effects so they slot into a
workflow generator alongside `executeStep`. They add no engine behavior of their
own beyond what `executeStep` does (except `parallel`, which adds concurrency).

## `runStep`

```ts
function runStep<I, O>(
  step: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
): Effect.Effect<O, WorkflowError, Scope.Scope>;
```

A readability alias for `executeStep`. Identical behavior (retry, timeout,
compensation registration). Use whichever reads better in a given workflow.

## `skipStep`

```ts
function skipStep<T>(value: T): Effect.Effect<T, never, never>;
```

`Effect.succeed(value)` — yields a value without running anything and with no
compensation. Use it for the "do nothing" branch of a conditional.

```ts
const result = input.skip
  ? yield* skipStep({ skipped: true })
  : yield* runStep(processStep, input, ctx);
```

## `parallel`

```ts
function parallel<T extends readonly Effect.Effect<any, any, any>[]>(
  ...effects: T
): Effect.Effect<
  { [K in keyof T]: Effect.Effect.Success<T[K]> },
  Effect.Effect.Error<T[number]>,
  Effect.Effect.Context<T[number]>
>;
```

`Effect.all(effects, { concurrency: "unbounded" })`. Runs the given step effects
**concurrently** and resolves to a tuple of their outputs (order preserved). The
error type is the union of the inputs' errors; the context is their combined
context (so it still requires a `Scope`).

```ts
const [user, products, inventory] = yield* parallel(
  runStep(fetchUser, { userId }, ctx),
  runStep(fetchProducts, { ids }, ctx),
  runStep(checkInventory, { ids }, ctx),
);
```

The engine test asserts three 20ms steps finish in well under 60ms — confirming
they run concurrently, not sequentially.

> Concurrency is **unbounded** — every effect starts at once. For large fan-outs
> against a rate-limited resource, batch them yourself or run sequentially.
> If one effect fails, Effect interrupts the others (standard `Effect.all`
> short-circuit). Compensations for any steps that *did* complete still fire when
> the workflow scope unwinds.

## `when`

```ts
function when<I, O>(
  condition: boolean,
  step: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
  defaultValue: O,
): Effect.Effect<O, WorkflowError, Scope.Scope>;
```

Runs `step` when `condition` is true, otherwise `Effect.succeed(defaultValue)`.
Both branches must produce the same output type `O`.

```ts
const verification = yield* when(
  input.needsVerification, verifyStep, input, ctx, { verified: false },
);
```

## `ifElse`

```ts
function ifElse<I, O>(
  condition: boolean,
  ifTrue: StepDefinition<I, O>,
  ifFalse: StepDefinition<I, O>,
  input: I,
  ctx: WorkflowContext,
): Effect.Effect<O, WorkflowError, Scope.Scope>;
```

Executes one of two steps by condition. Both take the same `input: I` and return
the same `O`.

```ts
const result = yield* ifElse(input.isPremium, premiumStep, standardStep, input, ctx);
```

## Gotchas

- `when`/`ifElse` evaluate `condition` eagerly in plain JS *before* returning the
  effect — they are not lazy on the Effect side. The unchosen step is never run.
- All of these (except `skipStep`) propagate the underlying step's retry/timeout/
  compensation behavior, because they delegate to `executeStep`.
- You can use ordinary `if`/ternaries in the generator instead of these helpers;
  they exist for symmetry and to keep branch types aligned.
