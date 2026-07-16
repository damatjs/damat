# @damatjs/durability

Shared PostgreSQL contracts for durable Damat infrastructure.

The package provides a structural query interface, a transaction client,
versioned system-migration descriptors, the shared durability migration
catalog, and startup readiness checks. Jobs, durable events, and framework
runtime behavior build on this package without making it own their domain APIs.

## Client

```ts
import {
  createDurabilityClient,
  setDurabilityClient,
} from "@damatjs/durability";

const durability = createDurabilityClient({ pool });
setDurabilityClient(durability);

await durability.transaction(async (executor) => {
  await executor.query("INSERT INTO app_records (id) VALUES ($1)", ["rec_1"]);
});
```

`DurabilityExecutor` is the structural query contract accepted by durability
APIs. A PostgreSQL pool, pool client, or compatible ORM executor can implement
it. The default client uses
`Symbol.for("damatjs.durability.client")`; standalone consumers may pass a
client directly instead.

## Transactional idempotency

```ts
import { withIdempotency } from "@damatjs/durability";

const result = await withIdempotency(
  { scope: "payment.capture", key: requestId },
  async (executor) => {
    await executor.query(
      "INSERT INTO payment_attempts (id, status) VALUES ($1, $2)",
      [requestId, "captured"],
    );
    return { captured: true };
  },
);
```

The first caller claims the scope/key pair and stores its JSON-safe result in
the same PostgreSQL transaction as the operation. Concurrent duplicates wait
for that transaction and replay the completed value. Failures roll back the
claim with the database work, while an expired key may be claimed again.

Pass `executor` when the caller already owns a transaction. A supplied executor
must be the active callback executor from `createDurabilityClient().transaction`
or another Damat transaction owner such as `ModuleService.transaction`.
Unmarked pools and inactive executors are rejected before the claim query.
Without an executor, `withIdempotency` uses the configured default client.

Transaction-adapter authors can use `markTransactionalExecutor` and
`unmarkTransactionalExecutor` around their callback. The marker is active only
for that callback and is cleared after both commit and rollback paths. These
helpers connect an adapter to the runtime contract; application code should not
use them to bless a pool.

The guarantee covers database effects performed through the supplied executor.
Remote providers must receive the same idempotency key; a local transaction
cannot make an external side effect exactly once.

## System migrations

`durabilitySystemMigrations` declares the shared idempotency, worker, control,
control-activity, and maintenance-activity tables. Compose catalogs with
`collectSystemMigrations`, then pass the result to the ORM migration runner.

Framework startup never creates these tables. Use
`assertSystemMigrationsApplied` for a read-only readiness check; missing
migrations instruct the operator to run `bun run db:migrate`.

See [the internals guide](./docs/README.md) for the package map and contracts.
