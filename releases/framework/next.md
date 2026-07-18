# @damatjs/framework Unreleased

> One application build can now run as an HTTP server, selected durable workers,
> or both, with PostgreSQL readiness and ordered shutdown.

## What changed

Process selection moved from the jobs service block to a shared runtime contract.
Runtime mode and worker capabilities can be configured independently and each has
an environment override. The default remains a combined process (`all`) with
workers inferred from enabled durable services.

Startup now initializes logger, PostgreSQL, Redis, modules/providers, and auth,
then verifies durable system migrations and configures durable wake-up
publishers before starting selected workers. Ephemeral broadcast initializes
independently. Hono is built only for a runtime that serves HTTP. Redis wakeups are
optional; PostgreSQL polling remains the durability fallback.

Shutdown registrations now use ordered phases: HTTP, claims/wakeups, drain,
heartbeat/reconciliation, Redis, PostgreSQL, and logger. Handlers within a phase
settle together, failures are logged, and later phases continue.
Job and event worker stop operations keep their own staged claim, drain, and
maintenance order inside the claims phase; multiple workers may progress
through those internal sub-stages independently.

Module locations also resolve one provider surface. Packaged routes mount through
external file-router providers, and declared workflow, job, event, and pipeline
providers load before workers start.

## Added

- `runtime.mode`: `server`, `worker`, or `all`.
- `runtime.workers`: any selection of `jobs` and `events`.
- `runtime.shutdownGraceMs` for bounded graceful worker drain.
- `DAMAT_RUNTIME_MODE` and `DAMAT_WORKER_TYPES` deployment overrides.
- Durable event runtime wiring through `services.events.durable`.
- Root re-exports for headless durability, jobs, and durable-event inspection
  and control clients. No administration routes are mounted automatically.
- `services.durability.acceleration` adaptive polling, worker-liveness,
  durable-snapshot, and relay-batch configuration.
- One process-wide wake-up subscriber/publisher gate, transactional outbox
  relay, projection rebuild, health query, and in-process invalidations.

## Changed / improved

- `services.jobs` configures the job capability with `queue` and `concurrency`;
  runtime config decides whether the current process executes it.
- Jobs and durable events require `projectConfig.databaseUrl` and applied system
  migrations. Startup fails visibly with `damat-orm migrate:up` guidance.
- Redis wakeups improve responsiveness without replacing PostgreSQL polling.
- `all` mode shares one PostgreSQL pool and one background coordinator across
  HTTP, jobs, event routing/delivery, inspection, relay, and maintenance.
- Redis `NOPERM` disables durable publishers/subscriber once, emits one
  actionable warning, falls back within five seconds, and recovers with bounded
  backoff. Healthy Redis removes one-second idle PostgreSQL traffic.
- `startServer` returns an idempotent asynchronous close handle and honors the
  configured host.

## Breaking

- Job-process selection moved from the jobs service block to `runtime`.
- `services.jobs.queueName` is replaced by `services.jobs.queue`.
- A configured durable capability fails startup when its database or system
  migrations are unavailable.

## Action required

1. Replace an HTTP-only job configuration:

   ```ts
   // Before
   services: { jobs: { worker: false } }

   // After
   services: { jobs: {} },
   runtime: { mode: "server" }
   ```

2. Replace an executing job configuration and rename `queueName` when present:

   ```ts
   // Before
   services: {
     jobs: { worker: true, queueName: "mail", concurrency: 4 },
   }

   // After: dedicated worker
   services: {
     jobs: { queue: "mail", concurrency: 4 },
   },
   runtime: {
     mode: "worker", // use "all" to serve HTTP in the same process
     workers: ["jobs"], // optional when jobs is the only enabled capability
   }
   ```

3. Configure `projectConfig.databaseUrl`, then apply system migrations before
   starting jobs or durable events:

   ```bash
   damat-orm migrate:up
   ```

4. Give package modules a valid `damat.json`. Package mode remains early alpha.

5. Add Redis ACL channel patterns `&damat:*` and `&damat-events`, verify
   publish/subscribe access, persist direct-server changes with `CONFIG REWRITE`,
   and retain the ACL declaration in recreated container configuration.

## References

- Current behavior: [framework README](../../packages/framework/README.md),
  [configuration](../../packages/framework/docs/config.md), and
  [events/jobs guide](../../docs/guide/10b-events-and-jobs.md)
- Source: `packages/framework/src/runtime/`, `packages/framework/src/services/`,
  `packages/framework/src/shutdown/`, and `packages/framework/src/entry.ts`
