# @damatjs/events — Internals

Maintainer-facing documentation. For usage see the [package README](../README.md).

This package has two intentionally separate paths: an in-process `EventBus` with
optional Redis fan-out, and PostgreSQL-backed durable event publishing. Ephemeral
emits never enter the durable outbox. Durable definitions use stable named consumers
and reject wildcards.

## Module map

| File                        | Responsibility                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`              | Barrel re-exporting everything below.                                                                               |
| `src/types.ts`              | `EventMap` (declaration-merge target), `EventName`, `EventPayload`, `EventContext`, `EventHandler`, `Unsubscribe`.  |
| `src/bus.ts`                | `EventBus` class + the `Broadcaster` function type. All delivery semantics live here.                               |
| `src/global.ts`             | The `globalThis` singleton: `getEventBus` / `setEventBus` / `resetEventBus`.                                        |
| `src/broadcast.ts`          | Redis pub/sub transport: `connectEventBroadcast` / `disconnectEventBroadcast` / `isEventBroadcastConnected`.        |
| `src/durable/definitions/`  | Declaration-merged durable payloads, policy defaults, named consumer registry, and validation.                      |
| `src/durable/migrations/`   | Ordered outbox, delivery, attempt, activity, and log catalogs; exported by `@damatjs/events/migrations`.            |
| `src/durable/repositories/` | SQL writes, reads, row mapping, and public durable record types.                                                    |
| `src/durable/client/`       | Transactional publish plus outbox/activity inspection.                                                              |
| `src/durable/inspection/`   | Headless event queries, visibility/redaction, summaries, and audited operations.                                    |
| `src/durable/router/`       | Transactional `SKIP LOCKED` outbox claims, consumer snapshots, fan-out, routing activity, and polling.              |
| `src/durable/worker/`       | Pair-scoped delivery claims, fenced execution, reconciliation, retention, registry state, and shutdown.             |
| `src/durable/wakeup/`       | Strict optional router/exact-consumer wake messages; PostgreSQL polling remains authoritative.                      |
| `tests/`                    | `bun:test` suites — `bus.test.ts` and `global.test.ts` are pure in-process; `broadcast.test.ts` needs a live Redis. |

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
  a process that is down misses broadcasts. Call `publishDurableEvent` explicitly
  when persistence is required; `emit` never creates an outbox row.

## Durable event architecture

`defineDurableEvent` stores a resolved event policy in the process-wide registry.
`defineDurableEventHandler` stores a unique consumer name per event and only allows
retry overrides. A handler registered first creates an implicit default event; one
later explicit definition upgrades its event policy and preserves the handlers.

`publishDurableEvent` validates the event and options before SQL. Without an
executor it opens a transaction on the global durability client. With an executor it
requires the active marker created by `DurabilityClient.transaction`. The insert and
immutable `published` activity entry share that transaction. A unique constraint on
`(name, idempotency_key)` makes concurrent duplicates return the original row without
duplicating activity.

The outbox owns event identity, payload, metadata, lineage, availability, routing,
retention, and a full retry-policy snapshot. Deliveries are separate rows keyed by
event plus consumer. Attempts, activity, and logs use foreign keys that prevent
attempt or consumer history from pointing at a different delivery. Retention starts
at availability, so delayed events cannot expire before becoming eligible.

The catalog owns outbox, history, retention-integrity, and inspection-index
migrations, ordered after shared durability and jobs. `@damatjs/orm-cli` selects shared plus events for
`services.events.durable`, or shared plus jobs plus events when both features are
enabled. Run migrations before publishing.

The router claims bounded due outbox batches with `FOR UPDATE SKIP LOCKED`.
Consumer rows, one event-scoped `routed` activity, and `routed_at` commit together;
zero-consumer events still become routed. Fan-out resolves explicit consumer retry
overrides against the policy copied onto the outbox row, not the registry's current
defaults. Delivery retention is repaired and constrained so it cannot precede
availability.

### Inspection boundary

`createDurableEventInspectionClient` is transport-free. Frameworks may expose it
through HTTP, RPC, MCP, or an internal dashboard without coupling the durable
core to authorization or routing. Construction requires a cursor signing key
and accepts a durability client, visibility, redaction, and worker-staleness
threshold.

List queries aggregate by outbox event and apply delivery-aware predicates with
`EXISTS`, avoiding duplicate events when several consumers match. Operational
views are derived from stored state: upcoming, processing, retrying, failed, and
completed. Recovery is a separate activity-derived flag. Pagination orders by a
millisecond timestamp and UUID and signs both values.

Detail reads run in one repeatable-read transaction. They combine the immutable
event, current deliveries, attempt history, logs, activity, referenced workers,
and consumer-control history. Payload/result visibility is independent from
operational evidence: errors, progress, attempts, logs, activity, workers, and
controls stay inspectable and are recursively redacted.

Control history is fetched in global activity-ID order with one fixed 501-row
query across all consumers,
returns at most 500 entries, and sets `controlHistoryTruncated` when the extra
row exists. Summary worker records are also redacted. Active and stale workers
remain diagnostic records, but only active workers contribute capacity;
stopping and stopped workers are excluded.

Summary windows and bucket counts are bounded before SQL runs. Current state,
history throughput, processing duration, waiting duration, lease health, worker
load, oldest/next work, and dead-letter groups are merged into one response.
Dead-letter status totals cover the full range while the ordered group list is
capped at 20 entries.

Each new claim snapshots its effective availability and wait duration into the
attempt row. Waiting distributions use these immutable values and exclude
legacy attempts whose wait is unknown. Retry activity also retains the effective
schedule, so later delivery updates do not erase earlier timing evidence.

Administrative changes validate an explicit actor before querying. Delivery
transitions lock the delivery row before its parent event; retention locks
candidate deliveries in deterministic order before revalidating their parents.
Consumer controls use a transaction advisory lock. Retry is limited to dead letters, preserves
history, clears current execution fields, and never shortens retention.
Cancellation, controls, and retention append correlated audit rows. Exact
retry/resume wake-ups publish only after the database transaction commits.

Delivery workers select exact `(event, consumer)` pairs using JSON-encoded stable
scopes. A claim moves one delivery to `running`, creates its attempt, and appends
activity atomically. Every heartbeat, progress, log, success, retry, dead letter,
cancellation, and attempt close matches the delivery identity, worker, token, and
unexpired lease. Context logs are ordered, bounded, and redacted; progress keeps a
current snapshot plus sampled activity; results must be JSON-safe.

Inline claims and reconciliation share one expired-lease transition. It closes the
old attempt as `lost`, retains its worker/token in activity, and returns the delivery
to pending or settles cancellation/exhaustion. Retry promotion and retention use
bounded overlapping-safe batches. Retention deletes only routed events whose
deliveries are terminal, and its completed maintenance audit shares the deletion
transaction.

`DurableEventRouter` and `DurableEventWorker` use adaptive PostgreSQL polling.
Healthy framework acceleration safety-scans every 30 seconds; degraded mode scans
within five seconds. Owned publishing wakes the router after commit, while
caller-owned transactions commit a relayable acceleration signal atomically.
Router fan-out wakes exact consumers after
commit. Worker shutdown stops polling/subscriptions, drains or aborts handlers, then
stops heartbeat/reconciliation before persisting `stopped`; ordinary idle leaves
maintenance active.

Durable publishing guarantees atomicity only for database effects executed with the
same transaction executor. External providers remain outside the database
transaction; handlers must pass stable provider idempotency keys. Definitions and
publishing do not execute consumers on their own.

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

`tests/bus.test.ts` and `tests/global.test.ts` are pure unit tests.
`tests/broadcast.test.ts` exercises a mocked Redis boundary. `tests/durable/`,
`tests/durable-worker/`, and `tests/inspection/` need an isolated PostgreSQL database and cover schema
integrity, transactions, routing overlap, fencing, recovery, retention, wake-ups,
shutdown, registry behavior, inspection, administration, and the no-bridge
ephemeral invariant.

## Related docs

- [Package README](../README.md)
- [@damatjs/redis internals](../../redis/docs/README.md) — the client/singleton the transport rides on.
- [@damatjs/jobs internals](../../jobs/docs/README.md) — the durable counterpart to fire-and-forget events.
