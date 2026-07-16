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

`DurabilityExecutor` accepts a PostgreSQL pool, pool client, or compatible ORM
transaction executor. The default client uses
`Symbol.for("damatjs.durability.client")`; standalone consumers may pass a
client directly instead.

## System migrations

`durabilitySystemMigrations` declares the shared idempotency, worker, control,
control-activity, and maintenance-activity tables. Compose catalogs with
`collectSystemMigrations`, then pass the result to the ORM migration runner.

Framework startup never creates these tables. Use
`assertSystemMigrationsApplied` for a read-only readiness check; missing
migrations instruct the operator to run `bun run db:migrate`.

See [the internals guide](./docs/README.md) for the package map and contracts.
