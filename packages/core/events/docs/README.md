# @damatjs/events — Internals

Maintainer-facing documentation. For usage see the [package README](../README.md).

This package is the typed subscription/event bus: an in-process `EventBus` with a
`globalThis` singleton, plus an opt-in Redis pub/sub transport that fans emits out to
every process sharing the Redis. Four small source files, one flat barrel — there are
no subpath exports.

## Module map

| File               | Responsibility                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`     | Barrel re-exporting everything below.                                                                               |
| `src/types.ts`     | `EventMap` (declaration-merge target), `EventName`, `EventPayload`, `EventContext`, `EventHandler`, `Unsubscribe`.  |
| `src/bus.ts`       | `EventBus` class + the `Broadcaster` function type. All delivery semantics live here.                               |
| `src/global.ts`    | The `globalThis` singleton: `getEventBus` / `setEventBus` / `resetEventBus`.                                        |
| `src/broadcast.ts` | Redis pub/sub transport: `connectEventBroadcast` / `disconnectEventBroadcast` / `isEventBroadcastConnected`.        |
| `tests/`           | `bun:test` suites — `bus.test.ts` and `global.test.ts` are pure in-process; `broadcast.test.ts` needs a live Redis. |

## Architecture overview

```
              on / once / off
   user code ─────────────────► EventBus (handlers: Map<string, Set<EventHandler>>)
              emit(event, p)         │
                                     ├── dispatch(event, p, "local")
                                     │     direct + "*" handlers → Promise.allSettled
                                     │
                                     └── broadcaster?(event, p)          ── opt-in ──┐
                                                                                     │
   other process ◄── subscriber.on("message") ◄── Redis pub/sub channel ◄── publish ─┘
        │                 (broadcast.ts)            "damat-events"
        └── getEventBus().dispatch(event, p, "remote")
```

### `EventBus` delivery semantics (`bus.ts`)

- **`emit` = local dispatch, then broadcast.** `emit()` awaits `dispatch(event, payload,
"local")` first, then (if a broadcaster is attached) awaits the broadcaster. It
  resolves after all local handlers settled and returns how many ran.
- **Error isolation via `Promise.allSettled`.** `dispatch()` runs every target handler
  and `allSettled`s the results; a rejecting handler never blocks the others and never
  throws back at the emitter. Rejections are logged through `getLogger().error(...)`
  with the event name. A broadcaster failure is likewise caught and logged (`"local
subscribers already ran"`) — `emit` itself never throws.
- **Delivery order is subscription order** per event: handlers live in a `Set` (insertion
  order), and `dispatch` builds its target list as `[...direct, ...wildcard]` — so all
  direct subscribers run "before" `"*"` subscribers in the array, though they are all
  awaited together in one `allSettled`.
- **`"*"` wildcard** subscribes to every event. `dispatch` adds the `"*"` set unless the
  event being emitted _is_ `"*"` (guarding against double delivery). `listenerCount(event)`
  counts direct + wildcard handlers.
- **`once` is a self-removing wrapper**: it registers a wrapped handler that calls
  `off(event, wrapped)` _before_ awaiting the real handler, so a re-emit from inside the
  handler cannot re-trigger it. Note the returned unsubscribe (and `off`) must target the
  wrapper — `on`'s returned closure does this for you; you cannot `off` a `once` by
  passing the original handler.
- **Explicit empty constructor**: bun coverage counts an implicit class constructor as a
  never-hit function, which would break the package's 100%-function-coverage gate.

### The `globalThis` singleton (`global.ts`)

The bus is stashed on `globalThis` under `Symbol.for("damatjs.events.bus")` — the same
pattern as the ORM's `PoolManager` and the jobs registry. Rationale: if two copies of
this package end up in one process (a linked dev copy next to an installed one), a
module-level variable would give each copy its own bus and subscriptions would silently
split; `Symbol.for` + `globalThis` guarantees one shared subscription table. The holder
is an object (`{ bus?: EventBus }`) so `setEventBus`/`resetEventBus` (tests, shutdown)
can swap or drop the bus without touching the key.

### Typing: declaration-merged `EventMap` (`types.ts`)

`EventMap` is intentionally **empty**; apps and modules add entries via declaration
merging (`declare module "@damatjs/events" { interface EventMap { ... } }`), which makes
`on`/`emit` fully typed for registered names. `EventName` is
`(keyof EventMap & string) | (string & {})` — the `(string & {})` trick keeps the union
from collapsing to plain `string`, so IDEs still autocomplete the registered names while
any ad-hoc string remains accepted (its payload types as `unknown` via `EventPayload`).

### Broadcast transport (`broadcast.ts`)

- **Single channel, self-describing envelope.** Every event rides one pub/sub channel
  (default `"damat-events"`, overridable via `BroadcastOptions.channel`) as a JSON
  envelope `{ instanceId, event, payload, emittedAt }` — the envelope names the event, so
  no per-event channels are needed.
- **Duplicated subscriber connection.** A subscribed ioredis connection cannot run other
  commands, so the transport keeps the singleton client (`getRedisClient().client`) as
  the _publisher_ and `duplicate()`s it for the dedicated _subscriber_ connection.
- **Self-message dedupe.** Redis delivers your own publishes back to you; since local
  subscribers already ran in `emit`, incoming envelopes whose `instanceId` matches this
  process's random UUID are skipped — otherwise every event would double-deliver.
- **Remote delivery is local-only dispatch.** Incoming messages call
  `getEventBus().dispatch(event, payload, "remote")` — never `emit` — so a remote event
  can't be re-broadcast (no loops). Subscribers see `context.source === "remote"`.
  Malformed JSON is logged (`warn`) and dropped.
- **Idempotent connect, module-level state.** `connectEventBroadcast()` returns
  immediately if already connected (`state !== null`). `disconnectEventBroadcast()`
  detaches the broadcaster first (so no new publishes), then unsubscribes and `quit()`s
  the subscriber, swallowing close errors at `debug` level. Note this connection state is
  module-level, _not_ on `globalThis` — duplicate package copies would each hold their
  own transport (acceptable: each still dedupes its own `instanceId`).

### Framework wiring

`@damatjs/framework` re-exports the package and, when `services.events.broadcast` is set
in `damat.config.ts` (and `projectConfig.redisUrl` exists), calls
`connectEventBroadcast()` during service init and registers a shutdown hook that
disconnects it. `@damatjs/services` emits model CRUD events on this bus when
`ModuleService({ events: true })`.

## Invariants & design decisions

- **The bus has no Redis knowledge.** `Broadcaster` is a narrow `(event, payload) =>
Promise<void>` function type; `bus.ts` imports nothing from `@damatjs/redis`. Any
  transport that can implement that function (and call `dispatch` for inbound messages)
  can replace the Redis one.
- **Emitters can't be broken by subscribers.** All failure paths (handler rejection,
  broadcaster failure, malformed inbound message) log and continue.
- **Unregistered events are first-class.** The type system nudges toward `EventMap`
  registration but never blocks an ad-hoc string event.
- **At-most-once locally, fire-and-forget remotely.** Redis pub/sub has no persistence:
  a process that is down misses broadcasts. Durable processing belongs in
  `@damatjs/jobs`, not here.

## Safe extension (quick reference)

**Add delivery metadata:** extend `EventContext` in `types.ts` and populate it in
`EventBus.dispatch()` — both local and remote paths flow through there.

**Add a transport:** implement a `Broadcaster` for outbound and call
`getEventBus().dispatch(event, payload, "remote")` for inbound; attach with
`bus.setBroadcaster(...)`. Keep the self-dedupe idea if the transport echoes publishes.

**Gotchas:**

- `dispatch` is public (the transport needs it) but skips the broadcaster — calling it
  instead of `emit` means no cross-process delivery.
- `resetEventBus()` drops all subscriptions but does **not** detach a connected
  broadcast transport; `broadcast.ts`'s `state` still points at the old bus's world.
  Disconnect broadcast before resetting the bus in tests.
- `listenerCount` includes `"*"` handlers, so it is a "how many will run" count, not a
  "direct subscribers" count.
- Payloads must be JSON-serializable to broadcast — `Date`s arrive as strings, class
  instances as plain objects. Local-only emits have no such limit, which can mask the
  problem until broadcast is enabled.

## Tests

`tests/bus.test.ts` and `tests/global.test.ts` are pure unit tests. `tests/broadcast.test.ts`
is an integration test needing a reachable Redis (`REDIS_URL` or `localhost:6379`), like
the `@damatjs/redis` suites.

## Related docs

- [Package README](../README.md)
- [@damatjs/redis internals](../../redis/docs/README.md) — the client/singleton the transport rides on.
- [@damatjs/jobs internals](../../jobs/docs/README.md) — the durable counterpart to fire-and-forget events.
