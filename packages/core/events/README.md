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
the event becomes available. Publishing and inspection do not execute named
handlers by themselves; no implicit bridge exists from `EventBus.emit` or CRUD
events to durable delivery.

Database atomicity cannot make an arbitrary external side effect exactly once.
When a handler calls a provider, pass a stable idempotency key to that provider
and use the context's shared `withIdempotency` operation for database work.

Enable `services.events.durable` and run `bun damat-orm migrate:up`. The ORM CLI
applies shared durability migrations followed by `@damatjs/events` migrations.
Standalone migration tooling can import `eventsSystemMigrations` from
`@damatjs/events/migrations`.

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
| `getDurableEvent` / `listDurableEvents` / `listDurableEventActivity`                             | function  | Inspect durable outbox records and immutable publish activity.                                                    |
| `DurableEventMap`, `DurableEventRecord`, `PublishDurableEventOptions`                            | types     | Typed durable payload, stored record, and publishing contract.                                                    |

## How it fits

**Depends on**: `@damatjs/logger` (subscriber-failure logging), `@damatjs/redis`
(broadcast transport only), and `@damatjs/durability` (PostgreSQL transactions
and shared idempotency). **Used by**: `@damatjs/services` (ephemeral model CRUD
events), `@damatjs/framework` (config wiring + re-export), and `@damatjs/orm-cli`
(system migration selection).

## License

MIT
