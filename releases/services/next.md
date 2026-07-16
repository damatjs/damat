# @damatjs/services Unreleased

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
- Transaction options are forwarded to the ORM transaction.

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

## Action required

No change is required for zero-argument callbacks. Code that needs to compose
durable database writes may accept and pass the new executor while the callback
is active. Do not retain it for later use.
