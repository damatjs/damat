[Damat Guide](../GUIDE.md) › Events & background jobs

# 10b. Events & background jobs

Two app-wide facilities round out the runtime: a **typed event bus**
([`@damatjs/events`](../../packages/core/events/README.md)) for reacting to
things that happened, and a **background job layer**
([`@damatjs/jobs`](../../packages/core/jobs/README.md)) for work that shouldn't
run inside a request. Both are re-exported by `@damatjs/framework`, so app code
imports them from the framework like everything else.

## The event bus

Subscribe anywhere, emit anywhere. Handlers are async and error-isolated — one
failing subscriber never blocks the others or the emitter — and delivery order
is subscription order.

```ts
import { getEventBus } from "@damatjs/framework";

// Type your events once via declaration merging:
declare module "@damatjs/events" {
  interface EventMap {
    "user.created": { id: string; email: string };
  }
}

const bus = getEventBus();

const off = bus.on("user.created", async (user, ctx) => {
  console.log(user.email, ctx.source); // "local" | "remote"
});
bus.once("user.created", (user) => sendWelcomeEmail(user));
bus.on("*", (payload, ctx) => audit(ctx.event, payload)); // wildcard: everything

await bus.emit("user.created", { id: "u1", email: "a@b.co" });
```

Event names you haven't declared still work (the payload is `unknown`);
augmenting `EventMap` is what makes them fully typed. `on` returns an
unsubscribe function; `off` and `removeAllListeners` exist too.

### Model CRUD events for free

A module's service can announce its own writes — set `events: true` in the
service config and every successful `create`/`update`/`delete` (and their
variants) emits `<model>.created` / `<model>.updated` / `<model>.deleted` with
a `{ model, method, result }` payload:

```ts
export class UserModuleService extends ModuleService({
  models,
  events: true,
}) {}

// anywhere else in the app:
getEventBus().on("user.created", async ({ result }) => {
  await enqueueJob("send-welcome-email", { userId: result.id });
});
```

This is the lightest way for modules to react to each other without importing
each other.

### Cross-process broadcast (opt-in)

Local, in-process delivery always works with no configuration. To also deliver
events to **other processes** (replicas, a worker), turn on the Redis pub/sub
transport in `damat.config.ts` — the API doesn't change, remote subscribers
just see `ctx.source === "remote"`:

```ts
projectConfig: {
  redisUrl: process.env.REDIS_URL,   // broadcast requires Redis
},
services: {
  events: { broadcast: true },       // optional: channel: "damat-events"
},
```

Self-published messages are deduped. Missing, unauthorized, or unavailable
Redis logs degraded broadcast and leaves local subscribers active. The
framework connects and disconnects a live transport for you.

### Durable events

Use durable events when each named consumer needs a persisted delivery record,
fenced retries, progress/log history, cancellation, and crash recovery. Enable
the capability and apply its PostgreSQL system migrations:

```ts
services: {
  events: {
    durable: { concurrency: 4 },
  },
},
```

```bash
bun run db:migrate
```

Definitions and consumers load from module providers before execution starts.
Optional Redis wake-ups reduce latency but never become the source of truth.
Healthy acceleration uses a 30-second PostgreSQL safety scan; degraded mode
discovers work within five seconds.

Define the event once and give every consumer a stable persistence identity:

```ts
import {
  defineDurableEvent,
  defineDurableEventHandler,
} from "@damatjs/framework";

declare module "@damatjs/events" {
  interface DurableEventMap {
    "user.created": { userId: string; email: string };
  }
}

defineDurableEvent("user.created", {
  version: 1,
  maxAttempts: 5,
  backoffMs: 1_000,
});

defineDurableEventHandler("user.created", "auditUser", async (user, ctx) => {
  await ctx.log("info", "User creation audited", { userId: user.userId });
  return { audited: true };
});

defineDurableEventHandler("user.created", "notifyUser", async (user, ctx) => {
  await ctx.progress({ percent: 100, phase: "notified" });
  return { notified: true };
});
```

Each consumer is routed and retried independently. Renaming a consumer creates
a different delivery identity, so treat names as persisted API.

## Background jobs

Jobs are named units of work persisted in PostgreSQL and executed by fenced
workers. You get retries with exponential backoff, dead-lettering, delayed
delivery, durable progress and logs, cancellation, and crash recovery.

```ts
import { defineJob, enqueueJob } from "@damatjs/framework";

// Type your jobs once (declaration merging):
declare module "@damatjs/jobs" {
  interface JobMap {
    "send-welcome-email": { userId: string };
  }
}

// 1. Define — in code the worker process imports (a module is a good home):
defineJob(
  "send-welcome-email",
  async ({ userId }, context) => {
    await context.progress(50);
    await mailer.sendWelcome(userId);
    return { sent: true };
  },
  { maxAttempts: 5, backoffMs: 2000 },
);

// 2. Enqueue — from any process: a route, a workflow step, a cron:
await enqueueJob("send-welcome-email", { userId: "u1" });
await enqueueJob(
  "send-welcome-email",
  { userId: "u2" },
  {
    priority: 10,
    delayMs: 60_000, // deliver in a minute
  },
);
```

Enable jobs in `damat.config.ts`. The selected worker starts after module init
(so every module's `defineJob` is registered) and after migration readiness:

```ts
services: {
  jobs: { queue: "damat-jobs", concurrency: 4 },
},
```

Jobs require `projectConfig.databaseUrl` and current migrations. On a fresh
backend use `bun run db:setup`; after schema changes use `bun run db:migrate`.
Redis is optional; PostgreSQL fallback always remains available.

Inside a standalone module, declaring jobs or durable events in `damat.json`
makes `damat module dev` install the required local catalogs and run concurrency
1 workers with 250 ms PostgreSQL polling. This is development policy only.
After installation, the backend must enable the services, select process roles,
and apply backend migrations itself.

## Commit domain data and durable work together

The executor received by `ModuleService.transaction` is accepted by enqueue,
publish, and shared idempotency APIs:

```ts
await userService.transaction(async (executor) => {
  const user = await userService.users.create({ data: input });
  await enqueueJob("reports.generate", report, {
    executor,
    correlationId: user.id,
    deduplication: { key: `report:${report.id}` },
  });
  await publishDurableEvent("user.created", user, {
    executor,
    correlationId: user.id,
    idempotencyKey: `user.created:${user.id}`,
  });
});
```

All three writes commit or roll back together, including acceleration-outbox
signals. The framework relay publishes only committed signals, so caller-owned
transactions receive reliable post-commit wake-ups and rollback emits none.

## Headless inspection and controls

```ts
import {
  createDurableEventInspectionClient,
  createJobInspectionClient,
} from "@damatjs/framework";

const jobs = createJobInspectionClient({
  cursorSigningKey: process.env.CURSOR_KEY!,
  visibility: "metadata",
  redaction: { keys: ["password", "token", "secret"] },
});
const events = createDurableEventInspectionClient({
  cursorSigningKey: process.env.CURSOR_KEY!,
  visibility: "metadata",
});

const failedJobs = await jobs.listRuns({ views: ["failed"], limit: 25 });
const failedEvents = await events.listEvents({ views: ["failed"], limit: 25 });
await jobs.retry(failedJobs.items[0]!.id, { type: "user", id: adminId });
```

Lists use signed cursors. Detail views include attempts, activity, progress,
errors, logs, worker/lease identity, and results according to visibility and
redaction. Summaries require bounded time ranges. Mutating controls require an
explicit actor and append audit history. No HTTP administration routes are
mounted by the framework.

## Select the process runtime

The same backend build can be an HTTP process, a dedicated worker, or both:

```ts
runtime: {
  mode: "worker", // "server" | "worker" | "all"
  workers: ["jobs", "events"],
  shutdownGraceMs: 30_000,
},
```

The default mode is `all`. The default workers are the durable capabilities
enabled by `services.jobs` and `services.events.durable`.

- `server` serves HTTP and never starts workers.
- `worker` serves no HTTP and requires at least one selected enabled capability.
- `all` serves HTTP and starts selected workers; it may run with none.

Environment overrides are independent, so one image can back several
deployments:

```bash
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=jobs,events bun run start
```

`DAMAT_RUNTIME_MODE` overrides `runtime.mode`; `DAMAT_WORKER_TYPES` overrides
`runtime.workers`. Unknown capabilities always fail startup. Known unavailable
capabilities fail in `worker` and `all`; `server` drops them because it never
executes workers. Shutdown stops HTTP, claims/wakeups, drains work, stops
heartbeat/reconciliation, then closes Redis, PostgreSQL, and the logger.
Handler failures are logged without skipping later phases.

Semantics worth knowing:

- **Retries** — a failing job re-queues with exponential backoff
  (`backoffMs * multiplier^(attempt-1)`) until `maxAttempts`, then dead-letters
  as a durable run with its final status, attempt history, and error preserved.
- **At-least-once** — expired fenced leases recover jobs a crashed worker had
  claimed, so handlers should be idempotent.
- **Redis loss** — enqueue/publish remain committed and replacement workers
  continue through PostgreSQL fallback. Redis ready indexes rebuild from
  PostgreSQL after recovery; no visual history is lost.
- **Redis ACLs** — authenticated users need channel access for `&damat:*` and,
  when ephemeral broadcast is enabled, `&damat-events`.
- **Unknown jobs** (enqueued but not `defineJob`'d in the worker process)
  dead-letter immediately with a clear error.
- **Inspection** — `getJobRun`, `listJobRuns`, `listJobAttempts`,
  `listJobActivity`, and `listJobLogs` expose durable headless records.

The framework root also re-exports the jobs and durable-event inspection and
control clients. They are headless: no administration routes are mounted
automatically, so the application owns authentication and authorization.
The in-process invalidation subscription carries identity and revision only;
visual clients refetch complete inspection records from PostgreSQL.

For retry-safe database effects inside a handler, call
`context.withIdempotency` with a stable scope/key. A killed process can leave a
completed effect and an expired work lease; the replacement attempt replays the
completed idempotency result instead of executing that effect twice. External
side effects still need the provider to honor a stable idempotency key.

## Jobs vs workflows (and where events fit)

- A **job** is one unit of deferred work: send an email, resize an image,
  re-index a record. Fire and forget, retried on failure.
- A **workflow** ([ch. 9](./09-workflows.md)) is a _multi-step_ process where
  failures must undo earlier steps (compensation). A job handler is a fine
  place to `execute()` a workflow.
- An **event** is a fact, not a task — emit it when something happened; any
  number of subscribers (including none) may react, e.g. by enqueueing jobs.
- A **pipeline** is the durable outer graph when a process must wait, branch,
  survive restarts, expose each stage, or compose jobs, events, and workflows.

Full API surfaces: the [`@damatjs/events`](../../packages/core/events/README.md)
and [`@damatjs/jobs`](../../packages/core/jobs/README.md) READMEs.

---

Prev: [← Redis](./10-redis.md) · [Guide home](../GUIDE.md) ·
Next: [Durable pipelines →](./10c-pipelines.md)
