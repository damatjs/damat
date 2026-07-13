# @damatjs/events

> Typed subscription/event bus for Damat apps — local by default, Redis
> pub/sub broadcast opt-in.

Subscribe anywhere, emit anywhere. Handlers are async and error-isolated (one
failing subscriber never blocks the others or the emitter), delivery order is
subscription order, and `"*"` subscribes to everything. Cross-process delivery
is an opt-in transport, not a different API.

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

## How it fits

**Depends on**: `@damatjs/logger` (subscriber-failure logging), `@damatjs/redis`
(broadcast transport only). **Used by**: `@damatjs/services` (model CRUD
events), `@damatjs/framework` (config wiring + re-export).

## License

MIT
