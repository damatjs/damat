# Distributed locking

Source: `src/lock/*`, `src/types/lock.ts`. Backed by `@damatjs/redis`.

The lock layer prevents two workflow executions that share a `lockId` from
running at the same time — across processes/instances, since the lock lives in
Redis. It is a thin wrapper over `@damatjs/redis`'s lock primitives plus a key
scheme and config defaults.

## Setup

Locking uses the **global** Redis client from `@damatjs/redis`. Initialize it
once at startup (the framework does this when `redisUrl` is configured):

```ts
import { initRedis, connectRedis } from "@damatjs/redis";
initRedis({ url: process.env.REDIS_URL });
await connectRedis();
```

If Redis isn't connected, the underlying primitives throw — `acquireWorkflowLock`
will surface that.

## Lock keys

```ts
// src/lock/utils.ts + constants.ts
WORKFLOW_LOCK_PREFIX = "workflow-lock:";
getLockKey(workflowName, lockId) => `workflow-lock:${workflowName}:${lockId}`;
```

So locks are namespaced per workflow _and_ per business id. Two different
workflows with the same `lockId` do not contend. (`getLockKey`, `delay`,
`WORKFLOW_LOCK_PREFIX`, and the `DEFAULT_*` constants are exported from the lock
barrel but are **not** re-exported from the package root — only the four
functions below are public.)

## Constants

```ts
// src/lock/constants.ts
DEFAULT_LOCK_TTL_MS = 300_000; // 5 min
DEFAULT_RETRY_DELAY_MS = 100;
DEFAULT_MAX_RETRIES = 0; // fail immediately if locked
DEFAULT_AUTO_EXTEND = true; // heartbeat the TTL while the workflow runs
```

## `WorkflowLockConfig`

```ts
interface WorkflowLockConfig {
  lockId?: string; // business id (orderId, userId). Default: random nanoid (unique per run)
  ttlMs?: number; // lock TTL (default 300000)
  maxRetries?: number; // acquisition retries (default 0)
  retryDelayMs?: number; // delay between acquisition retries (default 100)
  autoExtend?: boolean; // heartbeat-extend the TTL every ttlMs/2 while running (default true)
}
```

## `WorkflowLockResult`

```ts
interface WorkflowLockResult {
  acquired: boolean;
  lockId: string; // the id used (provided or generated)
  lockValue?: string; // fencing token, only when acquired — required to release/extend
  lockKey: string; // full Redis key
}
```

## Primitives

```ts
acquireWorkflowLock(workflowName, config?): Promise<WorkflowLockResult>;
releaseWorkflowLock(workflowName, lockId, lockValue): Promise<boolean>;
extendWorkflowLock(workflowName, lockId, lockValue, ttlMs): Promise<boolean>;
isWorkflowLocked(workflowName, lockId): Promise<boolean>;
```

### `acquireWorkflowLock` (`src/lock/acquire.ts`)

Loops up to `maxRetries + 1` times calling `@damatjs/redis`'s `acquireLock(lockKey, ttlMs)`:

- On success → `{ acquired: true, lockId, lockValue, lockKey }`.
- On failure → wait `retryDelayMs` and retry; after exhausting retries →
  `{ acquired: false, lockId, lockKey }` (no `lockValue`).

`acquireLock` returns a fencing `lockValue` (string) on success or null on
contention. That value is what `release`/`extend` require — they are no-ops if
the value doesn't match (lock not held / expired), returning `false`.

### `releaseWorkflowLock` / `extendWorkflowLock` / `isWorkflowLocked`

Thin wrappers over `releaseLock`, `extendLock`, `isLocked` from `@damatjs/redis`,
with structured logging. `isWorkflowLocked` only checks presence (no value
needed).

## How `executeWithLock` uses them

`createWorkflow().executeWithLock` (see [workflows.md](./workflows.md)) acquires
on entry, starts the auto-extend heartbeat (default ON), runs the workflow, and
always releases in `finally` — a throwing release is logged and swallowed so it
never discards the workflow result:

```ts
const lock = await acquireWorkflowLock(name, lockConfig);
if (!lock.acquired) return; /* WorkflowFailure with WorkflowLockError */

let heartbeat;
if ((lockConfig.autoExtend ?? DEFAULT_AUTO_EXTEND) && lock.lockValue) {
  heartbeat = setInterval(
    () =>
      extendWorkflowLock(name, lock.lockId, lock.lockValue!, ttlMs).then(
        /* warn if !extended */
      ),
    Math.max(1000, Math.floor(ttlMs / 2)),
  );
}
try {
  return await executeWorkflowInternal(
    name,
    definition,
    mergedConfig,
    input,
    { ...metadata, lockId: lock.lockId },
    executionId,
  );
} finally {
  if (heartbeat) clearInterval(heartbeat);
  if (lock.lockValue) {
    try {
      await releaseWorkflowLock(name, lock.lockId, lock.lockValue);
    } catch (e) {
      // e.g. Redis outage: log; the lock expires via TTL. Never mask the result.
    }
  }
}
```

## Manual locking outside a workflow

```ts
const lock = await acquireWorkflowLock("process-order", {
  lockId: orderId,
  ttlMs: 60_000,
});
if (!lock.acquired) throw new Error("already running");
try {
  // ...work...
  await extendWorkflowLock(
    "process-order",
    lock.lockId,
    lock.lockValue!,
    120_000,
  );
} finally {
  await releaseWorkflowLock("process-order", lock.lockId, lock.lockValue!);
}
```

## Gotchas

- **Auto-extend is ON by default**, so runs longer than `ttlMs` keep mutual
  exclusion. If you pass `autoExtend: false`, the TTL must outlast the workflow
  or another runner can acquire the lock mid-execution.
- The heartbeat interval is `max(1000, floor(ttlMs/2))` — i.e. never tighter than
  1s. With a very small `ttlMs` the floor means it could lapse; keep `ttlMs`
  comfortably above 2s.
- A **failed release** (e.g. Redis outage) inside `executeWithLock` is logged
  and swallowed — the workflow result is still returned and the lock expires
  via its TTL. Manual `releaseWorkflowLock` calls still throw; wrap them
  yourself.
- Always pass `lock.lockValue` to release/extend. Without the matching value the
  operation is a no-op (`false`) — this is the fencing-token safety that stops you
  releasing someone else's lock.
- A process crash holds the lock until its TTL expires — there is no automatic
  cleanup beyond Redis expiry.
- `WorkflowLockError` (`code: "WORKFLOW_LOCKED"`) is what `executeWithLock`
  returns on contention; it does not throw.
