[Damat Guide](../GUIDE.md) › Durable pipelines

# 10c. Durable pipelines

[`@damatjs/pipelines`](../../packages/core/pipelines/README.md) coordinates
long-running application processes as persisted graphs. A graph can invoke a
job, use an in-process workflow as one durable node, publish or wait for a
durable event, pause for an external signal, delay, branch, join, or start
bounded child pipelines.

## Choosing the right primitive

- Use an **event** for a fact that any number of consumers may observe.
- Use a **job** for one deferred, retryable unit of work.
- Use a **workflow** for a tightly coupled in-process saga whose completed steps
  compensate in reverse order on a handled failure.
- Use a **pipeline** when the outer process must survive restarts, wait, branch,
  expose every stage to operations, or compose several jobs, events, workflows,
  and child processes.

A pipeline does not replace workflows. It can invoke a workflow as one node.
The workflow implements a rich local saga; the pipeline records the durable
boundary before and after that saga and continues the larger process.

## Register and define

```ts
import {
  definePipeline,
  registerPipelineJob,
  registerPipelineWorkflow,
} from "@damatjs/framework";
import { provisionAccount } from "../workflows/provisionAccount";

registerPipelineWorkflow(provisionAccount, {
  inputSchema: { type: "object", required: ["accountId"] },
});
registerPipelineJob({ name: "reports.generate" });

export const onboarding = definePipeline("account.onboarding", {
  version: 1,
  start: "provision",
  nodes: [
    {
      id: "provision",
      kind: "workflow",
      name: provisionAccount.name,
      input: { accountId: { $ref: "input.accountId" } },
    },
    { id: "approval", kind: "signal.wait", signal: "approved" },
    { id: "report", kind: "job", name: "reports.generate" },
  ],
  edges: [
    { from: "provision", to: "approval" },
    { from: "approval", to: "report" },
  ],
  output: {
    accountId: { $ref: "input.accountId" },
    report: { $ref: "nodes.report.output" },
  },
});
```

References are a closed JSON value language (`$ref` paths), and branch
conditions use a closed expression AST. No user-authored JavaScript is evaluated.
Code definitions have stable version labels and checksums. Reusing a label with
a changed graph fails startup instead of rewriting history.

Graphs cannot contain ordinary cycles. Repetition uses explicit `loop` and
`foreach` nodes that call child pipelines and require `maxIterations` or
`maxItems`. `foreach.concurrency` limits how many children run together.
Branched and forked graphs should declare manifest `output` explicitly so the
result is derived from named node outputs rather than completion order. Use an
`any` join when mutually exclusive branches converge and an `all` join after a
fork whose branches must all finish.

## Start and signal

```ts
const run = await startPipeline("account.onboarding", input, {
  idempotencyKey: `account:${input.accountId}`,
  actor: { id: currentUser.id, type: "user" },
});

await signalPipelineRun(
  run.id,
  "approved",
  { approved: true },
  {
    actor: { id: currentUser.id, type: "user" },
    reason: "Manual review completed",
    idempotencyKey: requestId,
  },
);
```

Signals can arrive before their wait node and are buffered durably. Starts and
signals also accept a Damat durability transaction executor, so domain changes,
pipeline state, and the post-commit Redis signal are atomic.

## Configuration and deployment

```ts
export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
  },
  services: {
    jobs: { queue: "reports", concurrency: 4 },
    events: { durable: { concurrency: 4 } },
    pipelines: {
      queue: "damat-pipelines",
      concurrency: 2,
      routerBatchSize: 100,
      maxNodeActivationsPerRun: 10_000,
      maxFanOut: 1_000,
      retentionMs: 90 * 24 * 60 * 60 * 1_000,
    },
  },
  runtime: { mode: "all", workers: ["jobs", "events", "pipelines"] },
});
```

Run `damat-orm migrate:up` after enabling pipelines. The pipeline worker
selection starts one router plus the internal action/workflow job worker. A
direct job node still needs a job worker for that job's queue; an event node
needs the durable event definition and, for delivery, event workers.

All process roles share the same PostgreSQL pool. Redis provides only wake-ups
and a rebuildable ready projection. Healthy acceleration leaves a 30-second
PostgreSQL safety scan; an unavailable or unauthorized Redis falls back within
five seconds by default. Redis channel ACLs must cover `&damat:*`.

## Visual authoring and operations

The authoring and inspection clients are headless. This lets the same package
support source-controlled TypeScript pipelines and an authenticated web editor
without embedding an HTTP policy or UI in the runtime.

The authoring client supplies capability discovery, validation, optimistic
draft revisions, immutable publication, activation/rollback, layout revisions,
and trigger controls. Code-owned and web-owned names cannot overwrite one
another.

The inspection client returns the pinned graph/layout, run and node states,
transitions, signals, activity, child lineage, and backing-job attempts/logs.
Controls require actor, reason, and idempotency. Identity-only invalidations tell
a live UI when to refetch PostgreSQL; Redis never becomes the visual data store.

---

Prev: [← Events & background jobs](./10b-events-and-jobs.md) ·
[Guide home](../GUIDE.md) · Next: [Logging →](./11-logging.md)
