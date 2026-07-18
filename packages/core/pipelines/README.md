# @damatjs/pipelines

Durable, inspectable orchestration across Damat jobs, events, workflows, child
pipelines, waits, branches, joins, and bounded iteration.

PostgreSQL owns every definition version, run, node execution, transition,
signal, trigger receipt, control, and activity record. Redis contains only a
rebuildable ready projection, wake-ups, worker liveness, and identity-only
inspection invalidations. A Redis outage reduces responsiveness to the shared
PostgreSQL fallback interval; it never loses pipeline state.

Part of the [Damat](../../../README.md) monorepo ·
[Guide](../../../docs/guide/10c-pipelines.md) · [Internals](./docs/README.md)

## Install and migrate

```bash
bun add @damatjs/pipelines
damat-orm migrate:up
```

Framework apps enable `services.pipelines`. Import pipeline definitions and
capability registrations before startup, just as job and event definitions are
registered before their workers start.

Direct `job` nodes require `services.jobs`; event publish/wait nodes and event
triggers require `services.events.durable`. Workflow/action nodes use the
pipeline package's internal durable queue and do not require a separate job
service configuration.

## Pipelines and workflows are different layers

`@damatjs/workflow-engine` remains the in-process saga engine. It is ideal for a
tightly coupled sequence whose completed steps compensate in reverse order
while that process remains alive.

A pipeline is the durable outer process. It persists progress across process
restarts and can wait minutes or days, branch, join, start jobs, publish or wait
for events, pause for an external signal, invoke a workflow as one node, or
start child pipelines. A workflow node therefore gives one durable pipeline
stage a rich in-process saga implementation without turning every workflow step
into a separately scheduled job.

## Register capabilities

Code and web-authored graphs may only refer to registered capabilities.
Registration supplies the safe catalog and optional JSON schemas used by a
visual editor and by runtime input/output validation.

```ts
import {
  registerPipelineEvent,
  registerPipelineJob,
  registerPipelineWorkflow,
} from "@damatjs/pipelines";
import { provisionTenant } from "../workflows/provisionTenant";

registerPipelineWorkflow(provisionTenant, {
  inputSchema: { type: "object", required: ["tenantId"] },
  outputSchema: { type: "object", required: ["ready"] },
});
registerPipelineJob({ name: "billing.invoice" });
registerPipelineEvent({ name: "tenant.ready" });
```

`definePipelineAction` registers a directly implemented action. Actions and
workflow nodes execute through the package's internal durable job queue; a
process crash causes the fenced job to be recovered and retried.

## Define a code pipeline

```ts
import { definePipeline } from "@damatjs/pipelines";

export const tenantSetup = definePipeline("tenant.setup", {
  version: 1,
  start: "provision",
  inputSchema: { type: "object", required: ["tenantId"] },
  nodes: [
    {
      id: "provision",
      kind: "workflow",
      name: "tenant.provision",
      input: { tenantId: { $ref: "input.tenantId" } },
    },
    {
      id: "paid",
      kind: "condition",
      expression: { op: "eq", left: { $ref: "input.plan" }, right: "paid" },
    },
    { id: "invoice", kind: "job", name: "billing.invoice" },
    { id: "announce", kind: "event.publish", event: "tenant.ready" },
  ],
  edges: [
    { from: "provision", to: "paid" },
    {
      from: "paid",
      to: "invoice",
      when: { op: "eq", left: { $ref: "nodes.paid.output" }, right: true },
    },
    {
      from: "paid",
      to: "announce",
      when: { op: "eq", left: { $ref: "nodes.paid.output" }, right: false },
    },
    { from: "invoice", to: "announce" },
  ],
  output: {
    tenantId: { $ref: "input.tenantId" },
    announcement: { $ref: "nodes.announce.output" },
  },
});
```

Graphs are acyclic. Repetition is explicit through `loop` and `foreach` nodes,
each with a mandatory upper bound. `foreach.concurrency` limits simultaneously
active child runs. `child`, `foreach`, and `loop` pin each child run to the
published version selected when it starts. Every parent/child relationship is
stored for inspection and retention.

Set manifest `output` to an explicit JSON mapping for branched or forked graphs.
Without it, a linear pipeline returns its most recently completed successful
node output; explicit mapping avoids completion-order-dependent results.

## Start, signal, and control runs

```ts
import { startPipeline, signalPipelineRun } from "@damatjs/pipelines";

const run = await startPipeline("tenant.setup", input, {
  idempotencyKey: `tenant:${input.tenantId}`,
  correlationId: input.tenantId,
  actor: { id: user.id, type: "user" },
});

await signalPipelineRun(
  run.id,
  "approved",
  { approved: true },
  {
    actor: { id: user.id, type: "user" },
    reason: "Owner approved provisioning",
    idempotencyKey: request.id,
  },
);
```

Starts and signals accept an active durability transaction executor. Their run
row, initial node or buffered signal, and acceleration outbox record then commit
atomically with the caller's domain writes. Commit requests one coalesced relay
flush after the transaction completes; rollback emits no wake-up. Replayed
idempotency keys do not create duplicate runs or signals.

Signals may arrive before their wait node becomes active. They are validated
against the pinned manifest, stored in PostgreSQL, and consumed once. Delays,
event waits, interval triggers, and five-field UTC cron triggers are also
durable. Trigger receipts prevent an event from starting the same version twice.

## Headless visual authoring

`createPipelineAuthoringClient()` is transport-neutral. It exposes:

- a safe capability catalog and manifest validation;
- definition/version lists and optimistic-revision draft reads, saves, deletes,
  and version cloning;
- immutable draft publication, activation, and rollback by activating an older
  version;
- version-pinned layout revisions; and
- actor/reason/idempotency-audited trigger controls.

Code-owned and web-owned pipeline names cannot overwrite each other. Published
versions are immutable and every web publication receives a distinct durable
version identity, including publication after an older draft was deleted. A code
version cannot reuse its version label with a different checksum, and each
running instance remains pinned to the version it started with.

No HTTP routes or dashboard are mounted. Applications add their own authenticated
HTTP, SSE, WebSocket, or RPC adapter around these contracts.

## Inspection and visualization

`createPipelineInspectionClient({ cursorSigningKey })` provides signed-cursor
run lists, operational summaries, and repeatable-read run detail. Detail includes
the pinned manifest and layout, node executions, transitions, buffered/consumed
signals, activity, child lineage, and the attempts/logs/activity of backing jobs.
Pause, resume, cancel, node retry, and retention operations require an actor,
reason, and idempotency key.

Inspection defaults to `metadata`; `full` exposes redacted values and `hidden`
keeps graph shape and operational state while suppressing manifests' value
expressions, runtime content, error messages, logs, and activity details. Subscribe with
`subscribePipelineInvalidations`. Invalidations contain only resource identity,
scope, and revision; a visual client refetches canonical PostgreSQL detail.

## Runtime and delivery semantics

- Node scheduling and state transitions commit transactionally.
- Job and workflow nodes inherit fenced, at-least-once job delivery; handlers
  and external side effects must be idempotent.
- Redis can wake a router or worker but cannot grant ownership or decide a run.
- Healthy Redis leaves a 30-second PostgreSQL safety scan. Degraded mode uses
  the configured shared fallback, at most five seconds by default.
- Pipeline history defaults to 90 days after terminal completion. `"forever"`
  is stored as a nullable expiry. Pipeline retention deletes the complete child
  tree and its pipeline-owned internal jobs together.
- Administrative controls never erase immutable activity or prior attempts.

Redis acceleration requires the authenticated user to have command/key access
and channel patterns covering `&damat:*` and `&damat-events`. The framework
probes publish and subscribe capability, warns once when unavailable, retries
with bounded backoff, and rebuilds the ready projection from PostgreSQL after
recovery.
