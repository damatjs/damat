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
  console.log(user.email, ctx.source);   // "local" | "remote"
});
bus.once("user.created", (user) => sendWelcomeEmail(user));
bus.on("*", (payload, ctx) => audit(ctx.event, payload));  // wildcard: everything

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

Self-published messages are deduped, and a broken broadcast is logged only
after local subscribers already ran. The framework connects and disconnects the
transport for you.

## Background jobs

Jobs are named units of work executed by a worker, built on
[`RedisQueue`](./10-redis.md#job-queue). You get retries with exponential
backoff, dead-lettering, delayed delivery, and crash redelivery without writing
queue code.

```ts
import { defineJob, enqueueJob } from "@damatjs/framework";

// Type your jobs once (declaration merging):
declare module "@damatjs/jobs" {
  interface JobMap {
    "send-welcome-email": { userId: string };
  }
}

// 1. Define — in code the worker process imports (a module is a good home):
defineJob("send-welcome-email", async ({ userId }) => {
  await mailer.sendWelcome(userId);
}, { maxAttempts: 5, backoffMs: 2000 });

// 2. Enqueue — from any process: a route, a workflow step, a cron:
await enqueueJob("send-welcome-email", { userId: "u1" });
await enqueueJob("send-welcome-email", { userId: "u2" }, {
  priority: "high",
  delayMs: 60_000,        // deliver in a minute
});
```

To execute jobs, a process needs a worker. In a framework app, enable it in
`damat.config.ts` — it starts **after module init** (so every module's
`defineJob` is registered) and stops gracefully on shutdown:

```ts
services: {
  jobs: { worker: true, concurrency: 4 },   // also: queueName, pollIntervalMs
},
```

Semantics worth knowing:

- **Retries** — a failing job re-queues with exponential backoff
  (`backoffMs * multiplier^(attempt-1)`) until `maxAttempts`, then dead-letters
  into the queue's `failed` set with the error preserved.
- **At-least-once** — a visibility timeout redelivers jobs a crashed worker had
  claimed, so handlers should be idempotent.
- **Unknown jobs** (enqueued but not `defineJob`'d in the worker process)
  dead-letter immediately with a clear error.
- **Inspection** — `getJobQueue().getStats()` / `.getJob(id)` / `.cancelJob(id)`
  expose the raw queue underneath.

## Jobs vs workflows (and where events fit)

- A **job** is one unit of deferred work: send an email, resize an image,
  re-index a record. Fire and forget, retried on failure.
- A **workflow** ([ch. 9](./09-workflows.md)) is a *multi-step* process where
  failures must undo earlier steps (compensation). A job handler is a fine
  place to `execute()` a workflow.
- An **event** is a fact, not a task — emit it when something happened; any
  number of subscribers (including none) may react, e.g. by enqueueing jobs.

Full API surfaces: the [`@damatjs/events`](../../packages/core/events/README.md)
and [`@damatjs/jobs`](../../packages/core/jobs/README.md) READMEs.

---

Prev: [← Redis](./10-redis.md) · [Guide home](../GUIDE.md) · Next: [Logging →](./11-logging.md)
