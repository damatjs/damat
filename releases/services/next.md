# @damatjs/services Unreleased

> Makes domain transactions safe composition points for durable database work.

## What changed

Before, transaction state was held on mutable service accessors and callbacks
could not hand one explicitly bounded executor to durable operations. Now each
asynchronous transaction owns its accessor map and receives a public executor
whose lifetime ends with the callback; exported subclasses also emit portable
declarations without naming internal symbols.

## Changed

- `ModuleService.transaction` now passes a structural `DurabilityExecutor` to
  its callback. Callbacks that declare no parameter remain compatible.
- Nested transactions reuse the active executor and transaction-bound model
  accessors.
- Transaction state uses AsyncLocalStorage instead of a mutable service flag.
- Base model accessors are owned per service instance, and overlapping
  transactions receive independent accessor maps.
- Stable model accessors and captured methods resolve the active transaction at
  invocation time, then fall back to base methods after the callback.
- Transaction callback executors are marked only while active for safe
  composition with `withIdempotency`.
- Top-level transactions use fresh executor wrappers, so reuse of an underlying
  ORM transaction manager cannot reactivate a captured executor.
- Transaction options are forwarded to the ORM transaction.
- Durable after-commit callbacks run after the ORM commit, enabling prompt
  acceleration outbox relay without publishing rolled-back work.
- `ModuleService` declares an explicit public constructor and instance surface.
  Exported service subclasses can emit declarations through the
  `@damatjs/framework` re-export because the internal `resolveModelMethods`
  symbol no longer leaks into their `extends` type.

## Before

`ModuleService` shared one model-method map across instances and temporarily
mutated it to point at the active transaction. Concurrent calls could therefore
observe another call's executor or repositories.

## After

Each asynchronous transaction chain has its own executor and method map.
Stable accessors resolve that map when a method is called, so retaining an
accessor does not retain a completed transaction. Use the callback executor for
raw SQL or APIs such as transactional idempotency:

```ts
await service.transaction(async (executor) => {
  await executor.query("INSERT INTO audit_records (action) VALUES ($1)", [
    "updated",
  ]);
});
```

Generated service subclasses expose the supported credentials, models,
transactions, and model accessors without exposing the internal resolver.

## Action required

No change is required for zero-argument callbacks. Code that needs to compose
durable database writes may accept and pass the new executor while the callback
is active. Do not retain it for later use.

No action is required for exported service classes. Classes that previously hit
TS4020 during declaration emit now compile unchanged.

## Breaking

- None. Zero-argument callbacks remain assignable; executor use is additive.

## References

- Current behavior: [services README](../../packages/service/README.md)
- Source: `packages/service/src/service/`
