# @damatjs/pipelines — internals

Maintainer map for the durable graph runtime. The package README defines the
public contract.

| Area            | Responsibility                                                                           |
| --------------- | ---------------------------------------------------------------------------------------- |
| `definitions/`  | Manifest AST, immutable checksums, registries, schema and limit validation.              |
| `client/`       | Transactional version sync, starts, signals, and idempotency.                            |
| `repositories/` | PostgreSQL rows, mapping, terminal updates, activity, and outbox signals.                |
| `router/`       | Claims, job projection, graph advancement, waits, branching, children, and compensation. |
| `runtime/`      | Internal executor job, workflow observation, adaptive router loop.                       |
| `triggers/`     | UTC cron/interval scheduling, durable-event receipts, control synchronization.           |
| `authoring/`    | Headless drafts, immutable publication, layouts, capabilities, and controls.             |
| `inspection/`   | Signed lists, repeatable-read detail, redaction, and actor-audited administration.       |
| `retention/`    | Root-owned child-tree and internal-job deletion.                                         |
| `migrations/`   | Ordered system catalog loaded by the framework and ORM CLI.                              |

## Core invariants

1. PostgreSQL is canonical. Every runnable or observable change and its
   acceleration outbox row share a transaction.
2. A run stores `version_id`; the router always reads that immutable manifest.
3. Redis contains no payload, result, attempt, log, or control history.
4. A job terminal transition writes the pipeline wake-up outbox row before the
   job transaction commits. The pipeline router then projects that outcome once.
5. Graph cycles are rejected. Iteration occurs only through bounded child-run
   loop/foreach nodes.
6. Parent retention owns the entire descendant tree. Jobs marked with
   `_damatPipeline` are excluded from ordinary job retention and deleted only
   after their pipeline node records are removed.
7. Web manifests can reference only cataloged capabilities; code manifests must
   resolve registered jobs, durable events, workflows, and actions at startup.
8. Composite PostgreSQL constraints keep active/run versions, parent executions,
   transitions, consumed signals, and node activity inside their owning graph.
9. Action and workflow capability results are JSON values. Application adapters
   must serialize domain objects such as `Date` before the internal job returns.

## Router transaction

One bounded router pass processes trigger receipts, projects terminal backing
jobs, claims due nodes with `FOR UPDATE SKIP LOCKED`, advances graph edges,
settles idle runs, and performs due retention. The process durability coordinator
coalesces Redis wakes and adaptive safety polls so `runtime.mode: "all"` does not
introduce another independent one-second loop.

Each ready node transition either creates durable downstream work or becomes a
durable wait. Redis publication occurs later through the shared acceleration
relay. A crash after PostgreSQL commit but before Redis publication is replayed
from the outbox; duplicate wake-ups only cause another fenced state check.
Router claims lock both the execution and its owning run, which serializes graph
advancement with pause, cancellation, and retry controls across processes.
Successful compensation preserves the originating run failure; a compensation
error is added only when the compensating task itself fails.

## Inspection snapshot

Run detail uses a repeatable-read, read-only transaction and executes its reads
sequentially on that transaction's PostgreSQL client, so manifest, layout,
nodes, transitions, signals, activity, and backing-job records describe one
coherent snapshot without overlapping queries on one connection. The package
intentionally has no HTTP or authorization layer. Adapters must authorize before
invoking authoring or administration and must preserve actor, reason, and
idempotency fields.
