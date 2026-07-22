# Server & shutdown

Source: `src/server/`, `src/shutdown/`, and `src/runtime/startup.ts`.

## Server

`startServer(app, config, logger)` starts the Hono app through
`@hono/node-server`, passing `port` and optional `hostname`. It returns a
`ServerHandle`:

```ts
interface ServerHandle {
  close(): Promise<void>;
}
```

`close()` is idempotent. It waits for a server that is still starting, closes
the listener, and shares one promise across repeated calls.

The entry runtime calls `startServer` only when `ResolvedRuntime.servesHttp` is
true. A `worker` process never constructs the Hono app or opens a listener.
The returned close handle is registered in the `http` shutdown phase.

## Shutdown registry

Every registration names its ordered phase:

```ts
type ShutdownPhase =
  | "http"
  | "claims"
  | "drain"
  | "heartbeat"
  | "bindings"
  | "redis"
  | "durability"
  | "postgres"
  | "logger";

interface ShutdownRegistration {
  name: string;
  phase: ShutdownPhase;
  handler: () => Promise<void> | void;
}
```

Use `registerShutdown(registration)` to append a handler.
`runShutdownHandlers(logger, { graceMs? })` visits every phase in this order:

1. **HTTP** — stop accepting requests.
2. **Claims / wakeups** — stop external producers, subscribers, routers, and
   worker claims.
3. **Drain** — allow registered in-flight work to finish up to `graceMs`.
4. **Heartbeat / reconciliation** — stop lease renewal and maintenance loops.
5. **Bindings** — clear process-local pipeline/job runtime bindings.
6. **Redis** — close Redis transports.
7. **Durability** — clear process-global durability clients.
8. **PostgreSQL** — close the database pool.
9. **Logger** — emit shutdown completion and close logging last.

Handlers within one phase run concurrently with `Promise.allSettled`. Each
failure is logged with its handler and phase, and later handlers and phases
still run. A drain timeout rejects only that registration; leased work remains
recoverable by another worker after expiry.

`JobWorker.stop` and `DurableEventWorker.stop` already stage claim shutdown,
graceful drain, and heartbeat/reconciliation cleanup internally. The framework
therefore registers each worker once in `claims` and passes
`runtime.shutdownGraceMs` to its stop method.

The framework phase order applies to its registrations. Worker sub-stages are
ordered inside each worker; when several workers stop together, their internal
drain and maintenance sub-stages may overlap. Lease fencing and expiry preserve
recovery across that overlap.

## Signals

`setupShutdownHandlers(logger, { graceMs? })` installs handlers once:

- `SIGINT` and `SIGTERM` start the ordered shutdown and exit with code 0.
- repeated termination signals share the same in-flight shutdown promise.
- `uncaughtException` and `unhandledRejection` log and exit with code 1.

`runtime.shutdownGraceMs` accepts 0 through 2,147,483,647 milliseconds. Invalid
values fail before services start. Zero requests immediate drain timeout/worker
abort while retaining lease-based recovery.

## Registrations created by the framework

- HTTP server close → `http`.
- Auth shutdown, ephemeral event broadcast, the process-wide Redis acceleration
  transport/relay, durable event router/worker, and job worker → `claims`.
- Redis disconnect → `redis`.
- Pipeline/job runtime binding cleanup → `bindings`.
- Durability global cleanup → `durability`.
- PostgreSQL disconnect and `PoolManager.reset()` → `postgres`.
- Logger close → `logger`.

The registry is process-global. Tests can use `resetShutdownRegistry()` and
`resetShutdownSignalsForTests()` to isolate repeated starts.
