# @damatjs/events

> Typed ephemeral subscriptions plus transactional PostgreSQL event publishing
> for Damat apps.

Subscribe anywhere, emit anywhere. Handlers are async and error-isolated (one
failing subscriber never blocks the others or the emitter), delivery order is
subscription order, and `"*"` subscribes to everything. Cross-process delivery
is an opt-in transport, not a different API.

Durable events are a separate API. They persist an outbox record in PostgreSQL,
snapshot delivery policy, and register stable named consumers. An ephemeral
`emit` never writes the outbox, and model CRUD events remain ephemeral.

Part of the [Damat](../../../README.md) monorepo.

## Install

```bash
bun add @damatjs/events   # re-exported by @damatjs/framework
```

## Quick start

```ts
import { getEventBus } from "@damatjs/events";

// Type your events once (declaration merging):
declare module "@damatjs/events" {
  interface EventMap {
    "user.created": { id: string; email: string };
  }
}

const bus = getEventBus();

// Subscribe (returns an unsubscribe fn):
const off = bus.on("user.created", async (user, ctx) => {
  console.log(user.email, ctx.source); // "local" | "remote"
});
bus.once("user.created", (user) => sendWelcomeEmail(user));
bus.on("*", (payload, ctx) => audit(ctx.event, payload));

// Emit (awaits every subscriber; failures are logged, never thrown):
await bus.emit("user.created", { id: "u1", email: "a@b.c" });
```

Model CRUD events for free: a service created with
`ModuleService({ models, events: true })` emits
`<model>.created|updated|deleted` (payload `{ model, method, result }`) after
every successful write.

## Durable publishing (PostgreSQL)

```ts
import {
  defineDurableEvent,
  defineDurableEventHandler,
  publishDurableEvent,
} from "@damatjs/events";

declare module "@damatjs/events" {
  interface DurableEventMap {
    "user.registered": { userId: string };
  }
}

defineDurableEvent("user.registered", {
  version: 1,
  maxAttempts: 5,
  retentionMs: 7 * 24 * 60 * 60 * 1_000,
});
defineDurableEventHandler("user.registered", "welcome-email", async (event) => {
  await sendWelcome(event.userId);
});

await publishDurableEvent(
  "user.registered",
  { userId: "u1" },
  { idempotencyKey: "signup:u1", correlationId: "request-1" },
);
```

Route and execute deliveries in worker processes:

```ts
import { DurableEventRouter, DurableEventWorker } from "@damatjs/events";

const router = new DurableEventRouter();
const worker = new DurableEventWorker({
  consumers: [{ event: "user.registered", consumer: "welcome-email" }],
  concurrency: 4,
});

router.start();
worker.start();

// Ordered shutdown: stop claims, drain handlers, stop maintenance, persist stopped.
await router.stop();
await worker.stop({ graceMs: 30_000 });
```

Consumer names are stable and unique per event. Durable names cannot be blank
or contain wildcard tokens. A handler may register before its event definition;
the later explicit definition upgrades the implicit defaults once without
dropping consumers. Consumer options override retry values only, never the
event policy version or retention policy.

`publishDurableEvent` uses the configured `@damatjs/durability` client and owns
a transaction by default. Pass an active transaction `executor` to commit a
domain write and its outbox event atomically. Structural, expired, and inactive
executors are rejected. A duplicate `(event name, idempotency key)` returns the
original event without adding another publish activity entry.

The outbox snapshots policy version, attempts, backoff, and retention values so
later definition edits do not reinterpret stored events. Retention begins when
the event becomes available. `DurableEventRouter` snapshots the consumers that
exist when it routes an event; later registrations are not backfilled.

`DurableEventWorker` claims only configured event/consumer pairs. Each delivery
has its own fenced lease, attempts, retry/dead-letter state, progress, result,
structured logs, cancellation, and activity timeline. A worker crash is recovered
from PostgreSQL; stale workers cannot heartbeat or finish a reclaimed delivery.
Redis wake-ups are optional latency hints. Router and worker polling always
remain backed by PostgreSQL. Framework processes safety-scan every 30 seconds
while Redis is healthy and fall back to discovery within five seconds when it
is unavailable or unauthorized. Subscriber connection errors are consumed and
reported through the structured logger during that fallback.

Publishing does not run handlers inside the caller's transaction. An owned
publish wakes the router after commit; a caller-supplied executor writes an
acceleration-outbox row in the same transaction so the framework relay wakes
the router only after the outer commit. There is no
implicit bridge from `EventBus.emit` or CRUD events to durable delivery.

Database atomicity cannot make an arbitrary external side effect exactly once.
When a handler calls a provider, pass a stable idempotency key to that provider
and use the context's shared `withIdempotency` operation for database work.

Framework apps enable and select durable event execution independently:

```ts
services: {
  events: { durable: { concurrency: 4 } },
},
runtime: {
  mode: "worker", // or "all" to serve HTTP too
  workers: ["events"],
},
```

`runtime.mode` defaults to `"all"` and workers default to enabled durable
capabilities. Dedicated deployments can set `DAMAT_RUNTIME_MODE=worker` and
`DAMAT_WORKER_TYPES=events`. Run `damat-orm migrate:up` before startup. The ORM
CLI applies shared durability migrations followed by `@damatjs/events`
migrations. Standalone migration tooling can import `eventsSystemMigrations`
from `@damatjs/events/migrations`.

Durable retention defaults to 90 days. `retentionMs: "forever"` stores nullable
retention/expiry values, and audited runtime overrides apply to remaining data.
PostgreSQL keeps payload metadata, deliveries, attempts, logs, results,
controls, and worker snapshots for inspection; Redis contains no sole copy of
that history.

## Durable inspection and operations

The inspection client is a headless API for an admin UI, CLI, or automation. It
does not register HTTP routes. Lists are event-level, while each detail includes
delivery attempts, progress, errors, results, ordered logs, activity, workers,
and pause/resume history. Control history is capped at 500 entries and exposes
`controlHistoryTruncated` when more records exist.

```ts
import { createDurableEventInspectionClient } from "@damatjs/events";

const operations = createDurableEventInspectionClient({
  cursorSigningKey: process.env.INSPECTION_CURSOR_KEY!,
  visibility: "metadata",
  redaction: { keys: ["token", "secret"] },
});

const page = await operations.listEvents({
  views: ["processing", "failed"],
  consumers: ["welcome-email"],
  limit: 50,
});
const detail = await operations.getEvent(page.items[0]!.id);
const summary = await operations.getSummary({
  from: new Date(Date.now() - 3_600_000),
  to: new Date(),
  intervalMs: 60_000,
});
```

Signed cursors use the event timestamp plus UUID for stable pagination. Filters
cover names, consumers, delivery states, operational views, recovery, workers,
lease state, lineage identifiers, and lifecycle time ranges. Summaries expose
current counts, throughput buckets, processing and waiting distributions, lease
health, worker capacity, and grouped dead letters.
Waiting distributions use immutable per-attempt wait measurements; attempts
without a known measurement are excluded rather than treated as zero.
Only active workers contribute usable capacity; stale workers remain visible
for diagnosis, while stopping and stopped workers are omitted.
Dead-letter totals remain complete in status counts; the ranked group list is
deterministically capped at 20 entries.

Visibility defaults to `"metadata"`. `"full"` includes payloads and results;
`"hidden"` removes payloads, event metadata, and worker application/deployment
metadata. Operational progress, errors,
attempts, activity, and logs remain visible at every level and always pass
through the configured redaction rules.

Administrative methods require an explicit actor. They cancel waiting work or
request cancellation of running work, retry dead letters, pause/resume an exact
event-consumer pair, and run bounded retention. Changes and actor identity are
audited in PostgreSQL; successful retry/resume wake-ups occur after commit.

## Cross-process broadcast (opt-in)

```ts
// framework apps: damat.config.ts
services: {
  events: {
    broadcast: true;
  }
} // needs projectConfig.redisUrl

// standalone:
import {
  connectEventBroadcast,
  disconnectEventBroadcast,
} from "@damatjs/events";
await connectEventBroadcast(); // Redis pub/sub, one channel
```

Local delivery is unchanged; other processes receive the event with
`context.source === "remote"`. Self-published messages are deduped, a broken
broadcast is logged after local subscribers already ran, and the transport
uses a dedicated (duplicated) Redis connection — disconnect on shutdown (the
framework wires this automatically).

## API

| Export                                                                                           | Kind      | Summary                                                                                                           |
| ------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `EventBus`                                                                                       | class     | `on`, `once`, `off`, `emit`, `dispatch`, `removeAllListeners`, `listenerCount`, `setBroadcaster`, `broadcasting`. |
| `getEventBus()` / `setEventBus()` / `resetEventBus()`                                            | function  | The process-wide bus (state on `globalThis`, so duplicate package copies share it).                               |
| `connectEventBroadcast(options?)` / `disconnectEventBroadcast()` / `isEventBroadcastConnected()` | function  | The Redis pub/sub transport.                                                                                      |
| `EventMap`                                                                                       | interface | Augment to type your events; unregistered names still work (`unknown` payload).                                   |
| `EventHandler`, `EventContext`, `EventName`, `EventPayload`, `Unsubscribe`, `Broadcaster`        | types     | Handler and metadata shapes.                                                                                      |
| `defineDurableEvent` / `defineDurableEventHandler`                                               | function  | Register a typed event policy and stable named consumers.                                                         |
| `publishDurableEvent`                                                                            | function  | Transactionally persist an event, with idempotent replay support.                                                 |
| `DurableEventRouter` / `DurableEventWorker`                                                      | class     | Poll, route, claim, execute, reconcile, retain, and gracefully stop durable deliveries.                           |
| `getDurableEvent` / `listDurableEvents` / `listDurableEventActivity`                             | function  | Read durable outbox records and immutable event activity.                                                         |
| `getDurableEventDelivery` / `listDurableEventDeliveries`                                         | function  | Read current per-consumer delivery lifecycle state.                                                               |
| `listDurableEventDeliveryAttempts` / `listDurableEventLogs`                                      | function  | Read fenced attempt history and ordered structured work logs.                                                     |
| `createDurableEventInspectionClient`                                                             | function  | Create the headless list, detail, summary, cancel, retry, control, and retention API.                             |
| `configureEventWakeupPublisher` / `startEventWakeupSubscriber`                                   | function  | Optional strict Redis-compatible router and exact-consumer wake-up transport.                                     |
| `DurableEventMap`, `DurableEventRecord`, `PublishDurableEventOptions`                            | types     | Typed durable payload, stored record, and publishing contract.                                                    |

## How it fits

**Depends on**: `@damatjs/logger` (subscriber-failure logging), `@damatjs/redis`
(broadcast transport only), and `@damatjs/durability` (PostgreSQL transactions
and shared idempotency). **Used by**: `@damatjs/services` (ephemeral model CRUD
events), `@damatjs/framework` (config wiring + re-export), and `@damatjs/orm-cli`
(system migration selection).

## License

MIT
