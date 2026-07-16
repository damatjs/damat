# Phase 7 Durable Events and Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build PostgreSQL-backed durable jobs and explicitly durable events
with fenced workers, idempotency, complete operational history, selectable
server/worker runtime modes, and headless inspection APIs.

**Architecture:** `@damatjs/durability` owns shared PostgreSQL contracts,
transactions, system migrations, idempotency, worker registration, controls,
redaction, and query primitives. `@damatjs/jobs` and `@damatjs/events` own their
domain tables, repositories, workers, activity, logs, and inspection surfaces.
The framework composes enabled capabilities and runtime modes; Redis only wakes
workers early.

**Tech Stack:** Bun, strict TypeScript ESM, PostgreSQL through
`@damatjs/deps/pg`, optional Redis through `@damatjs/redis`, Turborepo, Oxlint,
Biome, Prettier.

## Global Constraints

- Complete one numbered task, report its diff and verification, and wait for
  explicit user approval before starting the next task.
- Start each task from a clean worktree. Stage only that task's listed files,
  inspect `git diff --cached`, commit locally, and never push.
- Before every checkpoint commit, verify `git status --short` contains only the
  task's files, run `git add -A`, then run `git diff --cached --check` and inspect
  `git diff --cached --stat`.
- Use Bun commands only.
- Follow red-green-refactor for every behavior change.
- Keep every code, test, script, fixture, and generated-code file at 100
  physical lines or fewer.
- Split by responsibility before a file reaches 100 lines.
- Do not add heavy dependencies.
- PostgreSQL is the source of truth; Redis is never canonical.
- System migrations are explicit. Framework startup checks readiness and never
  creates or alters durability tables.
- Delivery is at least once. Exactly-once claims are forbidden.
- No package version changes during implementation; use `releases/*/next.md`.
- Update current living docs and release records in the same task as observable
  package behavior.
- Preserve ordinary `EventBus.emit()` and model CRUD events as ephemeral.
- Never expose automatic unauthenticated administration routes.

---

## Planned File Structure

### New shared package

`packages/core/durability/src/`:

```text
client/
  create.ts             default client and transaction runner
  global.ts             process-wide client state
  types.ts              executor, pool, client interfaces
controls/
  repository.ts         pause/resume/current control state
  types.ts
idempotency/
  begin.ts
  complete.ts
  types.ts
  with.ts
inspection/
  cursor.ts
  filters.ts
  redaction.ts
  summary.ts
  types.ts
leases/
  token.ts
  types.ts
logs/
  limits.ts
  redact.ts
  types.ts
migrations/
  catalog.ts
  readiness.ts
  shared-001.ts
  shared-002.ts
  types.ts
workers/
  heartbeat.ts
  register.ts
  repository.ts
  types.ts
errors.ts
index.ts
```

### Jobs package

`packages/core/jobs/src/`:

```text
activity/
client/
context/
definitions/
inspection/
migrations/
repositories/
schedules/
worker/
wakeup/
index.ts
types.ts
```

Each directory contains focused files for one query, state transition, or public
type. No Redis queue compatibility implementation remains in the v1 surface.

### Events package

The existing ephemeral files remain. Durable additions live under:

```text
src/durable/
  activity/
  client/
  context/
  definitions/
  inspection/
  migrations/
  repositories/
  router/
  worker/
  wakeup/
```

### Framework

Runtime resolution lives under `packages/framework/src/runtime/`. Durable
service initialization lives in focused files under
`packages/framework/src/services/initialize/`. Shutdown phases live under
`packages/framework/src/shutdown/`.

---

### Task 1: Repair Repository Formatting and Lint Ownership

**Files:**

- Create: `.prettierignore`
- Create: `scripts/check-changed-code-lines.ts`
- Create: `scripts/tests/check-changed-code-lines.test.ts`
- Modify: `backend/default/package.json`
- Format: `apps/docs/**`, `apps/web/**`, `apps/registry/**` with each app's
  Biome configuration
- Format: remaining Prettier-owned tracked source and documentation

**Interfaces:**

- Produces a clean repository baseline for all later tasks.
- Does not change runtime behavior.
- Current preflight found 154 formatter-different tracked paths and zero overlap
  with tracked code files above 100 lines. Recheck before applying; split any
  new overlap instead of exempting it.

- [ ] **Step 1: Capture the failing baseline**

Run:

```bash
bun run lint
bunx prettier --check .
```

Expected: failures include Biome-owned app files, the unavailable
`backend/default` ESLint command, and Prettier-owned formatting debt.

- [ ] **Step 2: Add formatter ownership boundaries**

Create `.prettierignore`:

```text
apps/docs
apps/web
apps/registry
**/dist
**/.damat
**/.next
**/coverage
**/.turbo
**/node_modules
**/logs
```

- [ ] **Step 3: Use the installed linter for the sample backend**

Change the scripts to:

```json
"lint": "oxlint src tests damat.config.ts",
"lint:fix": "oxlint --fix src tests damat.config.ts",
"check-types": "tsc --noEmit"
```

Remove the old `typecheck` spelling so Turborepo can discover the task.

- [ ] **Step 4: Apply owned formatters**

Run:

```bash
bun run --cwd apps/docs format
bun run --cwd apps/web format
bun run --cwd apps/registry format
bunx prettier --write .
```

- [ ] **Step 5: Verify the cleanup**

Run:

```bash
bun run lint
bunx prettier --check .
bun run check-types
git diff --check
```

Expected: all pass.

- [ ] **Step 6: Add the changed-file line gate**

`check-changed-code-lines.ts` accepts a required base revision, unions paths
from `git diff --name-only --diff-filter=ACMR <base>` with untracked paths from
`git ls-files --others --exclude-standard`, passes existing code files to
`findLineViolations`, and exits non-zero on any violation. Unit tests cover path
parsing, untracked files, deleted files, non-code files, and spaces in paths.

Run:

```bash
bun test scripts/tests/check-changed-code-lines.test.ts
bun scripts/check-changed-code-lines.ts e8dcd90
```

- [ ] **Step 7: Commit the baseline**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "chore: align repository lint and format ownership"
```

---

### Task 2: Add Durability Contracts and System Migration Execution

**Files:**

- Create: `packages/core/durability/package.json`
- Create: `packages/core/durability/tsconfig.json`
- Create: `packages/core/durability/bunfig.toml`
- Create: `packages/core/durability/src/client/types.ts`
- Create: `packages/core/durability/src/client/create.ts`
- Create: `packages/core/durability/src/client/global.ts`
- Create: `packages/core/durability/src/migrations/types.ts`
- Create: `packages/core/durability/src/migrations/catalog.ts`
- Create: `packages/core/durability/src/migrations/readiness.ts`
- Create: `packages/core/durability/src/migrations/shared-001.ts`
- Create: `packages/core/durability/src/migrations/shared-002.ts`
- Create: `packages/core/durability/src/errors.ts`
- Create: `packages/core/durability/src/index.ts`
- Create: `packages/core/durability/tests/client.test.ts`
- Create: `packages/core/durability/tests/catalog.test.ts`
- Create: `packages/core/durability/tests/readiness.test.ts`
- Modify: `packages/orm/migration/package.json`
- Create: `packages/orm/migration/src/system/run.ts`
- Create: `packages/orm/migration/src/system/status.ts`
- Create: `packages/orm/migration/src/system/index.ts`
- Create: `packages/orm/migration/src/__tests__/system.run.test.ts`
- Create: `packages/orm/migration/src/__tests__/system.status.test.ts`
- Modify: `packages/orm/migration/src/executor/run.ts`
- Modify: `packages/orm/migration/src/executor/status.ts`
- Modify: `packages/orm/migration/src/index.ts`
- Modify: `packages/orm/cli/package.json`
- Create: `packages/orm/cli/src/cli/utils/load/systemMigrations.ts`
- Modify: `packages/orm/cli/src/cli/commands/migrate/up.ts`
- Modify: `packages/orm/cli/src/cli/commands/migrate/status.ts`
- Delete: `packages/orm/cli/src/tests/migrate-handlers.test.ts`
- Create: `packages/orm/cli/src/tests/migrate/fixture.ts`
- Create: `packages/orm/cli/src/tests/migrate/up.test.ts`
- Create: `packages/orm/cli/src/tests/migrate/status.test.ts`
- Create: `packages/orm/cli/src/tests/migrate/list.test.ts`
- Create: `packages/orm/cli/src/tests/migrate/create.test.ts`
- Create: `packages/core/durability/README.md`
- Create: `packages/core/durability/docs/README.md`
- Modify: `packages/orm/migration/README.md`
- Modify: `packages/orm/migration/docs/executor.md`
- Modify: `packages/orm/cli/README.md`
- Modify: `packages/orm/cli/docs/migrate-commands.md`
- Create: `releases/durability/README.md`
- Create: `releases/durability/next.md`
- Modify: `releases/orm-migration/README.md`
- Modify: `releases/orm-migration/next.md`
- Modify: `releases/orm-cli/README.md`
- Modify: `releases/orm-cli/next.md`
- Modify: `releases/README.md`
- Modify: `bun.lock`

**Interfaces:**

- Imports `QueryResultRow` from `@damatjs/deps/pg` so the structural query
  signature accepts the existing PostgreSQL pool, pool client, and ORM
  transaction manager without casts.
- Produces:

```ts
interface DurabilityExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

interface DurabilityPool extends DurabilityExecutor {
  connect(): Promise<DurabilityPoolClient>;
}

interface DurabilityPoolClient extends DurabilityExecutor {
  release(): void;
}

interface SystemMigration {
  owner: string;
  id: string;
  order: number;
  sql: string;
}

interface SystemMigrationCatalog {
  owner: string;
  migrations: readonly SystemMigration[];
}
```

- Produces `createDurabilityClient`, `setDurabilityClient`,
  `getDurabilityClient`, `clearDurabilityClient`,
  `collectSystemMigrations`, and `assertSystemMigrationsApplied`.
- Extends `runMigrations` and `getMigrationStatus` with optional system
  migrations while retaining module behavior.

- [ ] **Step 1: Write failing client and catalog tests**

Create tests proving:

```ts
test("runs a callback in BEGIN and COMMIT", async () => {
  const client = createRecordingPool();
  const durability = createDurabilityClient({ pool: client.pool });
  await durability.transaction(async (tx) => tx.query("SELECT 1"));
  expect(client.sql).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
});

test("orders and rejects duplicate system migrations", () => {
  expect(
    collectSystemMigrations([catalogB, catalogA]).map((m) => m.id),
  ).toEqual(["001", "002"]);
  expect(() => collectSystemMigrations([catalogA, duplicate])).toThrow();
});
```

- [ ] **Step 2: Run the tests and confirm RED**

```bash
bun test packages/core/durability/tests/client.test.ts
bun test packages/core/durability/tests/catalog.test.ts
```

Expected: package or exports do not exist.

- [ ] **Step 3: Implement the client and global state**

Use `Symbol.for("damatjs.durability.client")` for the default client. The
transaction runner must acquire a pool client, issue `BEGIN`, call the callback,
issue `COMMIT`, rollback on error, and always release.

- [ ] **Step 4: Implement shared migration descriptors**

`shared-001.ts` creates `_damat_idempotency_keys` and `_damat_workers`.
`shared-002.ts` creates `_damat_work_controls`,
`_damat_work_control_activity`, `_damat_maintenance_activity`, and their lookup
indexes. Every constraint and index name must be explicit and
`_damat_`-prefixed.

- [ ] **Step 5: Write failing ORM system-migration tests**

Tests must prove:

- system migrations run before module migrations;
- tracker rows use their catalog owner;
- a second run skips applied system migrations;
- status includes system owners;
- failure stops later system and module migrations.

- [ ] **Step 6: Implement ORM system migration execution**

Add:

```ts
interface MigrationRunOptions {
  systemMigrations?: readonly SystemMigration[];
}
```

Execute inline SQL through the same advisory lock and
`_damat_migration_logs` tracker. Do not call `ensureTable` from framework
readiness.

- [ ] **Step 7: Add CLI catalog selection**

`loadSystemMigrations` loads `damat.config.ts` and returns the durability catalog
when jobs or durable events are enabled. It must use a dynamic import to avoid a
CLI startup cycle. Task 5 extends this selector with the jobs catalog after that
catalog exists; Task 8 does the same for events.

- [ ] **Step 8: Implement readiness errors**

`assertSystemMigrationsApplied(executor, migrations)` queries
`_damat_migration_logs`. Missing tracker/table errors become:

```text
Durable infrastructure is not migrated. Run: bun run db:migrate
```

Include missing owner and migration IDs in error metadata.

- [ ] **Step 9: Verify and document**

Run:

```bash
bun test packages/core/durability
bun test packages/orm/migration
bun test packages/orm/cli/src/tests
bun run build --filter=@damatjs/durability
bun run build --filter=@damatjs/orm-migration
bun run build --filter=@damatjs/orm-cli
bun scripts/check-changed-code-lines.ts e8dcd90
```

Update durability, ORM migration, and ORM CLI living docs and `next.md` release
records.

- [ ] **Step 10: Refresh workspace metadata**

Run:

```bash
bun install
```

Confirm the new workspace resolves without downloading a new heavy dependency.

- [ ] **Step 11: Commit**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add durability migrations and readiness"
```

---

### Task 3: Add Transactional Idempotency

**Files:**

- Create: `packages/core/durability/src/idempotency/types.ts`
- Create: `packages/core/durability/src/idempotency/begin.ts`
- Create: `packages/core/durability/src/idempotency/complete.ts`
- Create: `packages/core/durability/src/idempotency/with.ts`
- Create: `packages/core/durability/src/idempotency/index.ts`
- Modify: `packages/core/durability/src/index.ts`
- Create: `packages/core/durability/tests/idempotency/begin.test.ts`
- Create: `packages/core/durability/tests/idempotency/replay.test.ts`
- Create: `packages/core/durability/tests/idempotency/concurrency.test.ts`
- Create: `packages/core/durability/tests/idempotency/rollback.test.ts`
- Modify: `packages/service/package.json`
- Modify: `packages/service/src/service/module.ts`
- Create: `packages/service/src/service/transaction.ts`
- Create: `packages/service/src/service/modelAccessors.ts`
- Create: `packages/service/src/tests/service/transaction.test.ts`
- Modify: `packages/service/README.md`
- Modify: `packages/service/docs/module-service.md`
- Modify: `releases/services/README.md`
- Create: `releases/services/next.md`
- Modify: `bun.lock`

**Interfaces:**

```ts
interface IdempotencyOptions {
  scope: string;
  key: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  executor?: DurabilityExecutor;
}

async function withIdempotency<T extends JsonValue>(
  options: IdempotencyOptions,
  operation: (executor: DurabilityExecutor) => Promise<T>,
): Promise<{ value: T; replayed: boolean }>;
```

`ModuleService.transaction` becomes:

```ts
transaction<R>(
  callback: (executor: DurabilityExecutor) => Promise<R>,
  options?: TransactionOptions,
): Promise<R>;
```

Callbacks with zero parameters remain assignable and nested calls reuse the
active executor.

- [ ] **Step 1: Write failing idempotency tests**

Cover first execution, completed replay, concurrent duplicate serialization,
operation rollback, expired-key replacement, and non-JSON result rejection.

- [ ] **Step 2: Confirm RED against PostgreSQL**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/durability/tests/idempotency
```

- [ ] **Step 3: Implement idempotency**

Claim with `INSERT ... ON CONFLICT DO NOTHING`, lock the selected row with
`FOR UPDATE`, run the operation in the same transaction, and store the JSON
result before commit. A duplicate `running` row waits on the row lock and then
replays the completed result.

- [ ] **Step 4: Write failing ModuleService tests**

Prove the callback receives an executor with `query`, nested transactions
receive the same object, legacy zero-argument callbacks still work, and two
concurrent transactions on the same service instance never share an executor or
transaction-bound model methods.

- [ ] **Step 5: Extract service transaction state**

Move transaction executor state into `service/transaction.ts` and model-method
registration/accessor wiring into `service/modelAccessors.ts`. Bind CRUD methods
and the executor through `AsyncLocalStorage` for the same transaction lifetime
instead of mutable instance/global flags. Leave `module.ts` below 100 physical
lines.

- [ ] **Step 6: Verify and document**

```bash
bun install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/durability/tests/idempotency
bun test packages/service/src/tests/service/module.test.ts
bun test packages/service/src/tests/service/transaction.test.ts
bun run build --filter=@damatjs/durability
bun run build --filter=@damatjs/services
bun scripts/check-changed-code-lines.ts e8dcd90
```

Update durability and services docs/release records.

- [ ] **Step 7: Commit**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add transactional idempotency"
```

---

### Task 4: Add Worker Registry, Controls, Logs, and Query Primitives

**Files:**

- Create: `packages/core/durability/src/workers/register.ts`
- Create: `packages/core/durability/src/workers/heartbeat.ts`
- Create: `packages/core/durability/src/workers/repository.ts`
- Create: `packages/core/durability/src/workers/types.ts`
- Create: `packages/core/durability/src/workers/index.ts`
- Create: `packages/core/durability/src/controls/repository.ts`
- Create: `packages/core/durability/src/controls/types.ts`
- Create: `packages/core/durability/src/controls/index.ts`
- Create: `packages/core/durability/src/logs/limits.ts`
- Create: `packages/core/durability/src/logs/redact.ts`
- Create: `packages/core/durability/src/logs/types.ts`
- Create: `packages/core/durability/src/logs/index.ts`
- Create: `packages/core/durability/src/inspection/cursor.ts`
- Create: `packages/core/durability/src/inspection/filters.ts`
- Create: `packages/core/durability/src/inspection/progress.ts`
- Create: `packages/core/durability/src/inspection/redaction.ts`
- Create: `packages/core/durability/src/inspection/summary.ts`
- Create: `packages/core/durability/src/inspection/types.ts`
- Create: `packages/core/durability/src/inspection/index.ts`
- Create: `packages/core/durability/src/leases/token.ts`
- Create: `packages/core/durability/src/leases/types.ts`
- Create: `packages/core/durability/src/leases/index.ts`
- Create: `packages/core/durability/tests/workers/repository.test.ts`
- Create: `packages/core/durability/tests/controls/repository.test.ts`
- Create: `packages/core/durability/tests/logs/limits.test.ts`
- Create: `packages/core/durability/tests/logs/redact.test.ts`
- Create: `packages/core/durability/tests/inspection/cursor.test.ts`
- Create: `packages/core/durability/tests/inspection/progress.test.ts`
- Create: `packages/core/durability/tests/inspection/summary.test.ts`
- Create: `packages/core/durability/tests/leases/token.test.ts`
- Modify: `packages/core/durability/src/index.ts`
- Modify: `packages/core/durability/README.md`
- Modify: `packages/core/durability/docs/README.md`
- Modify: `releases/durability/next.md`

**Interfaces:**

```ts
type WorkKind = "job" | "event";
type WorkLogLevel = "debug" | "info" | "warn" | "error";
type InspectionVisibility = "full" | "metadata" | "hidden";

interface WorkActor {
  id: string;
  type: "user" | "service" | "system";
  metadata?: Record<string, unknown>;
}

interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}
```

Produce `registerWorker`, `heartbeatWorker`, `stopWorker`, `listWorkers`,
`pauseWork`, `resumeWork`, `getWorkControl`, `encodeCursor`, `decodeCursor`,
`redactValue`, `applyLogLimits`, `shouldRecordProgressActivity`,
`createLeaseToken`, `listWorkControlActivity`, `recordMaintenanceActivity`, and
time-bucket helpers.

- [ ] **Step 1: Write failing pure utility tests**

Cover cursor tamper rejection, stable cursor ordering, nested redacted paths,
key redaction, log count/byte limits, progress sampling, and time buckets.

- [ ] **Step 2: Implement pure primitives**

Keep redaction immutable. Cursors encode the sort timestamp plus UUID and reject
unknown versions.

- [ ] **Step 3: Write failing PostgreSQL repository tests**

Cover worker registration, heartbeat/load update, graceful stop, stale worker
calculation, durable pause/resume, immutable control activity, actor metadata,
maintenance activity, and control upsert races.

- [ ] **Step 4: Implement worker and control repositories**

Worker registry is observational only. Claims continue to depend on fenced work
leases. Pause state uses a unique `(kind, scope)` key.

- [ ] **Step 5: Verify**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/durability/tests/workers packages/core/durability/tests/controls
bun test packages/core/durability/tests/logs
bun test packages/core/durability/tests/inspection
bun test packages/core/durability/tests/leases
bun run build --filter=@damatjs/durability
bun scripts/check-changed-code-lines.ts e8dcd90
```

Update durability worker registry, control, redaction, log-limit, and inspection
primitive docs plus `releases/durability/next.md`.

- [ ] **Step 6: Commit**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add durable worker observability primitives"
```

---

### Task 5: Add the PostgreSQL Job Persistence Foundation

**Files:**

- Create: `packages/core/jobs/src/definitions/types.ts`
- Create: `packages/core/jobs/src/definitions/defaults.ts`
- Create: `packages/core/jobs/src/definitions/registry.ts`
- Create: `packages/core/jobs/src/client/enqueue.ts`
- Create: `packages/core/jobs/src/client/get.ts`
- Create: `packages/core/jobs/src/client/list.ts`
- Create: `packages/core/jobs/src/client/attempts.ts`
- Create: `packages/core/jobs/src/client/activity.ts`
- Create: `packages/core/jobs/src/client/logs.ts`
- Create: `packages/core/jobs/src/client/cancel.ts`
- Create: `packages/core/jobs/src/client/retry.ts`
- Create: `packages/core/jobs/src/client/index.ts`
- Create: `packages/core/jobs/src/migrations/jobs-001.ts`
- Create: `packages/core/jobs/src/migrations/jobs-002.ts`
- Create: `packages/core/jobs/src/migrations/catalog.ts`
- Create: `packages/core/jobs/src/repositories/runs.ts`
- Create: `packages/core/jobs/src/repositories/attempts.ts`
- Create: `packages/core/jobs/src/repositories/activity.ts`
- Create: `packages/core/jobs/src/repositories/logs.ts`
- Create: `packages/core/jobs/src/repositories/schedules.ts`
- Create: `packages/core/jobs/src/repositories/deduplication.ts`
- Create: `packages/core/jobs/src/repositories/mappers.ts`
- Create: `packages/core/jobs/src/repositories/index.ts`
- Modify: `packages/orm/cli/package.json`
- Modify: `packages/orm/cli/src/cli/utils/load/systemMigrations.ts`
- Modify: `packages/orm/cli/src/tests/migrate/up.test.ts`
- Modify: `packages/orm/cli/src/tests/migrate/status.test.ts`
- Create: `packages/core/jobs/tests/storage/migrations.test.ts`
- Create: `packages/core/jobs/tests/storage/enqueue.test.ts`
- Create: `packages/core/jobs/tests/storage/read.test.ts`
- Create: `packages/core/jobs/tests/storage/deduplication.test.ts`
- Create: `packages/core/jobs/tests/storage/definitions.test.ts`
- Modify: `packages/core/jobs/package.json`
- Modify: `packages/core/jobs/README.md`
- Modify: `packages/core/jobs/docs/README.md`
- Modify: `packages/orm/cli/README.md`
- Modify: `packages/orm/cli/docs/migrate-commands.md`
- Create: `releases/jobs/README.md`
- Create: `releases/jobs/next.md`
- Modify: `releases/orm-cli/next.md`
- Modify: `releases/README.md`
- Modify: `bun.lock`

**Interfaces:**

```ts
interface JobRun {
  id: string;
  name: string;
  queue: string;
  status: JobRunStatus;
  payload: unknown;
  metadata: Record<string, unknown>;
  progress?: JsonValue;
  result?: JsonValue;
  availableAt: Date;
  attemptCount: number;
  maxAttempts: number;
}

interface EnqueueJobOptions {
  queue?: string;
  priority?: number;
  delayMs?: number;
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  deduplication?: { key: string; expiresAt?: Date };
  metadata?: Record<string, unknown>;
  correlationId?: string;
  executor?: DurabilityExecutor;
}
```

- [ ] **Step 1: Write failing migration-catalog tests**

Assert the jobs catalog creates run, attempt, activity, log, schedule,
schedule-activity, and deduplication tables with required constraints and
due-work indexes.

- [ ] **Step 2: Write failing enqueue tests**

Cover immediate, delayed, priority, definition defaults, override persistence,
transaction executor use, deduplication replay, and immutable enqueue activity.

- [ ] **Step 3: Implement job migrations and repositories**

Use native PostgreSQL JSONB and TIMESTAMPTZ. Numeric priority sorts ascending.
All mutations return normalized domain objects from repository row mappers.

- [ ] **Step 4: Implement internal job clients**

The internal `client/` entrypoint produces `enqueueJob`, `getJobRun`,
`listJobRuns`, `listJobAttempts`, `listJobActivity`, and `listJobLogs`, but the
package root keeps its current Redis-backed exports until Task 6 replaces the
worker in the same commit.

- [ ] **Step 5: Register the jobs migration catalog**

Extend `loadSystemMigrations` so `services.jobs` includes the jobs catalog after
the shared durability catalog. Add an ORM CLI test proving both catalogs are
selected in stable order.

- [ ] **Step 6: Verify**

```bash
bun install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/jobs/tests/storage
bun run build --filter=@damatjs/jobs
bun run build --filter=@damatjs/orm-cli
bun scripts/check-changed-code-lines.ts e8dcd90
```

Update the jobs migration internals docs and `releases/jobs/next.md` without
documenting the new client as public yet.

- [ ] **Step 7: Commit**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add PostgreSQL job persistence"
```

---

### Task 6: Build the Fenced Job Worker

**Files:**

- Create: `packages/core/jobs/src/worker/claim.ts`
- Create: `packages/core/jobs/src/worker/heartbeat.ts`
- Create: `packages/core/jobs/src/worker/loop.ts`
- Create: `packages/core/jobs/src/worker/execute.ts`
- Create: `packages/core/jobs/src/worker/succeed.ts`
- Create: `packages/core/jobs/src/worker/fail.ts`
- Create: `packages/core/jobs/src/worker/cancel.ts`
- Create: `packages/core/jobs/src/worker/stop.ts`
- Create: `packages/core/jobs/src/worker/types.ts`
- Create: `packages/core/jobs/src/worker/index.ts`
- Create: `packages/core/jobs/src/context/create.ts`
- Create: `packages/core/jobs/src/context/progress.ts`
- Create: `packages/core/jobs/src/context/log.ts`
- Create: `packages/core/jobs/src/context/result.ts`
- Create: `packages/core/jobs/src/context/types.ts`
- Create: `packages/core/jobs/src/context/index.ts`
- Delete: `packages/core/jobs/src/worker.ts`
- Delete: `packages/core/jobs/src/enqueue.ts`
- Delete: `packages/core/jobs/src/registry.ts`
- Delete: `packages/core/jobs/tests/enqueue.test.ts`
- Delete: `packages/core/jobs/tests/registry.test.ts`
- Delete: `packages/core/jobs/tests/worker.test.ts`
- Modify: `packages/core/jobs/src/index.ts`
- Modify: `packages/core/jobs/src/types.ts`
- Modify: `packages/core/jobs/package.json`
- Modify: `packages/framework/src/services/initialize/jobs.ts`
- Delete: `packages/framework/src/tests/services/initializeServices-events-jobs.test.ts`
- Create: `packages/framework/src/tests/services/initializeEvents.test.ts`
- Create: `packages/framework/src/tests/services/initializeJobs.test.ts`
- Create: `packages/framework/src/tests/services/initializeEventsJobs.test.ts`
- Create: `packages/core/jobs/tests/public-api.test.ts`
- Modify: `packages/core/jobs/README.md`
- Modify: `packages/core/jobs/docs/README.md`
- Modify: `releases/jobs/next.md`
- Create: `packages/core/jobs/tests/worker/claim.test.ts`
- Create: `packages/core/jobs/tests/worker/fencing.test.ts`
- Create: `packages/core/jobs/tests/worker/context.test.ts`
- Create: `packages/core/jobs/tests/worker/outcome.test.ts`
- Create: `packages/core/jobs/tests/worker/stop.test.ts`

**Interfaces:**

```ts
interface JobRunContext {
  runId: string;
  attempt: number;
  maxAttempts: number;
  queue: string;
  metadata: Record<string, unknown>;
  signal: AbortSignal;
  progress(
    value: number | Record<string, unknown>,
    metadata?: object,
  ): Promise<void>;
  log(level: WorkLogLevel, message: string, context?: object): Promise<void>;
  withIdempotency: typeof withIdempotency;
}
```

`JobWorker.start()` remains idempotent and `stop({ graceMs })` stops claims,
waits for active work, and leaves unfinished leases recoverable.

- [ ] **Step 1: Write failing concurrent-claim tests**

Two workers claiming the same queue must receive disjoint rows. Due time sorts
before priority. Paused queues produce no claims.

- [ ] **Step 2: Implement claim transaction**

Use `FOR UPDATE SKIP LOCKED`, create a UUID lease token, increment attempts,
insert an attempt and activity row, and return claimed runs in one transaction.

- [ ] **Step 3: Write failing fencing tests**

Cover valid heartbeat, stale heartbeat rejection, stale success rejection,
expired lease recovery, and cancellation signal propagation.

- [ ] **Step 4: Implement heartbeat and execution contexts**

Progress and logs require matching run, worker, and lease token. Progress writes
update the snapshot and sampled activity. Logs enforce redaction and limits.

- [ ] **Step 5: Write failing outcome tests**

Cover JSON result, retry backoff, dead letter, unknown definition, cancellation,
log persistence failure, non-serializable result, and immutable attempt history.

- [ ] **Step 6: Implement terminal transitions atomically**

Each success, retry, cancellation, or dead letter update must close the attempt,
update the run, and append activity in one transaction.

- [ ] **Step 7: Switch the public API atomically**

Export the PostgreSQL `enqueueJob`, inspection clients, and new `JobWorker`.
Delete `getJobQueue` and `clearJobQueues` from exports while preserving
`JobMap`, `defineJob`, and definition-registry semantics. Update the framework
initializer in the same commit so no workspace checkpoint imports the removed
Redis queue surface.

- [ ] **Step 8: Verify**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/jobs/tests/worker
bun test packages/framework/src/tests/services/initializeEvents.test.ts
bun test packages/framework/src/tests/services/initializeJobs.test.ts
bun test packages/framework/src/tests/services/initializeEventsJobs.test.ts
bun run build --filter=@damatjs/jobs
bun run build --filter=@damatjs/framework
bun scripts/check-changed-code-lines.ts e8dcd90
```

Update jobs storage/worker semantics, progress/logging docs, and the breaking
change in its unreleased note.

- [ ] **Step 9: Commit**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add fenced PostgreSQL job workers"
```

---

### Task 7: Add Schedules, Reconciliation, Retention, and Redis Wake-Ups

**Files:**

- Create: `packages/core/jobs/src/schedules/types.ts`
- Create: `packages/core/jobs/src/schedules/validate.ts`
- Create: `packages/core/jobs/src/schedules/create.ts`
- Create: `packages/core/jobs/src/schedules/update.ts`
- Create: `packages/core/jobs/src/schedules/list.ts`
- Create: `packages/core/jobs/src/schedules/occurrence.ts`
- Create: `packages/core/jobs/src/schedules/index.ts`
- Create: `packages/core/jobs/src/worker/reconcileLeases.ts`
- Create: `packages/core/jobs/src/worker/reconcileRetries.ts`
- Create: `packages/core/jobs/src/worker/reconcileSchedules.ts`
- Create: `packages/core/jobs/src/worker/retention.ts`
- Create: `packages/core/jobs/src/worker/reconciler.ts`
- Modify: `packages/core/jobs/src/worker/loop.ts`
- Modify: `packages/core/jobs/src/client/enqueue.ts`
- Modify: `packages/core/jobs/src/client/retry.ts`
- Create: `packages/core/durability/src/idempotency/cleanup.ts`
- Modify: `packages/core/durability/src/idempotency/index.ts`
- Modify: `packages/core/durability/src/index.ts`
- Create: `packages/core/jobs/src/wakeup/publisher.ts`
- Create: `packages/core/jobs/src/wakeup/subscriber.ts`
- Create: `packages/core/jobs/src/wakeup/types.ts`
- Create: `packages/core/jobs/src/wakeup/index.ts`
- Create: `packages/core/jobs/tests/schedules/validation.test.ts`
- Create: `packages/core/jobs/tests/schedules/reconcile.test.ts`
- Create: `packages/core/jobs/tests/reconcile/leases.test.ts`
- Create: `packages/core/jobs/tests/reconcile/retries.test.ts`
- Create: `packages/core/jobs/tests/reconcile/retention.test.ts`
- Create: `packages/core/jobs/tests/reconcile/wakeup.test.ts`
- Create: `packages/core/durability/tests/idempotency/cleanup.test.ts`
- Modify: `packages/core/jobs/src/index.ts`
- Modify: `packages/core/jobs/README.md`
- Modify: `packages/core/jobs/docs/README.md`
- Modify: `releases/jobs/next.md`

**Interfaces:**

```ts
type JobScheduleInput =
  | { kind: "once"; at: Date }
  | { kind: "interval"; everyMs: number; startsAt?: Date };

interface JobWakeup {
  kind: "jobs";
  queue: string;
}
```

- [ ] **Step 1: Write failing schedule tests**

Cover once, interval, disabled schedules, invalid cron rejection, next
occurrence, and overlapping reconcilers producing one run.

- [ ] **Step 2: Implement schedule APIs and occurrence reconciliation**

Use unique `(schedule_id, scheduled_for)` protection and advance
`next_run_at` in the same transaction as enqueue.

- [ ] **Step 3: Write failing recovery and retention tests**

Cover expired running leases, retry_wait promotion, deduplication expiration,
idempotency expiration, terminal history retention, bounded batches, and
active-row preservation.

- [ ] **Step 4: Implement reconciliation**

Record lease recovery activity. Never rely on worker-registry stale state for
correctness.

- [ ] **Step 5: Write failing wake-up tests**

PostgreSQL writes must succeed when Redis is absent or publish fails. Connected
workers should poll immediately on a valid wake-up and ignore malformed input.

- [ ] **Step 6: Implement optional Redis wake-ups**

Use a dedicated duplicated subscriber. Messages contain only kind and queue.
Keep periodic PostgreSQL polling enabled at all times. Successful enqueue,
retry, and schedule mutations publish after their PostgreSQL transaction
commits; publish failure only logs a warning. The worker loop starts and stops
the reconciler with the claim loop.

- [ ] **Step 7: Verify and commit**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  REDIS_URL=redis://localhost:6379 \
  bun test packages/core/jobs/tests/schedules packages/core/jobs/tests/reconcile
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/durability/tests/idempotency/cleanup.test.ts
bun run build --filter=@damatjs/durability
bun run build --filter=@damatjs/jobs
bun scripts/check-changed-code-lines.ts e8dcd90
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add durable job scheduling and recovery"
```

Update jobs schedule, recovery, retention, and Redis fallback docs before the
commit.

---

### Task 8: Add Durable Event Publishing and Named Consumers

**Files:**

- Preserve existing ephemeral event files
- Create: `packages/core/events/src/durable/definitions/types.ts`
- Create: `packages/core/events/src/durable/definitions/registry.ts`
- Create: `packages/core/events/src/durable/definitions/defaults.ts`
- Create: `packages/core/events/src/durable/migrations/events-001.ts`
- Create: `packages/core/events/src/durable/migrations/events-002.ts`
- Create: `packages/core/events/src/durable/migrations/catalog.ts`
- Create: `packages/core/events/src/durable/repositories/outbox.ts`
- Create: `packages/core/events/src/durable/repositories/deliveries.ts`
- Create: `packages/core/events/src/durable/repositories/attempts.ts`
- Create: `packages/core/events/src/durable/repositories/activity.ts`
- Create: `packages/core/events/src/durable/repositories/logs.ts`
- Create: `packages/core/events/src/durable/repositories/mappers.ts`
- Create: `packages/core/events/src/durable/client/publish.ts`
- Create: `packages/core/events/src/durable/client/get.ts`
- Create: `packages/core/events/src/durable/client/list.ts`
- Create: `packages/core/events/src/durable/client/index.ts`
- Create: `packages/core/events/src/durable/index.ts`
- Modify: `packages/orm/cli/package.json`
- Modify: `packages/orm/cli/src/cli/utils/load/systemMigrations.ts`
- Modify: `packages/orm/cli/src/tests/migrate/up.test.ts`
- Modify: `packages/orm/cli/src/tests/migrate/status.test.ts`
- Modify: `packages/core/events/package.json`
- Modify: `packages/core/events/src/index.ts`
- Create: `packages/core/events/tests/durable/compatibility.test.ts`
- Create: `packages/core/events/tests/durable/definitions.test.ts`
- Create: `packages/core/events/tests/durable/migrations.test.ts`
- Create: `packages/core/events/tests/durable/publish.test.ts`
- Modify: `packages/core/events/README.md`
- Modify: `packages/core/events/docs/README.md`
- Modify: `packages/orm/cli/README.md`
- Modify: `packages/orm/cli/docs/migrate-commands.md`
- Create: `releases/events/README.md`
- Create: `releases/events/next.md`
- Modify: `releases/orm-cli/next.md`
- Modify: `releases/README.md`
- Modify: `bun.lock`

**Interfaces:**

```ts
interface DurableEventMap {}

function defineDurableEvent<K extends DurableEventName>(
  name: K,
  policy?: DurableEventPolicy,
): DurableEventDefinition;

function defineDurableEventHandler<K extends DurableEventName>(
  name: K,
  consumer: string,
  handler: DurableEventHandler<DurableEventPayload<K>>,
  options?: DurableConsumerOptions,
): void;

function publishDurableEvent<K extends DurableEventName>(
  name: K,
  payload: DurableEventPayload<K>,
  options?: PublishDurableEventOptions,
): Promise<DurableEventRecord>;
```

- [ ] **Step 1: Write failing compatibility tests**

Prove `EventBus.emit`, wildcard handlers, Redis broadcast, and automatic model
CRUD events remain unchanged and do not create outbox rows.

- [ ] **Step 2: Write failing durable definition tests**

Cover declaration merging, stable consumer uniqueness, wildcard rejection,
policy defaults, and registry reset.

- [ ] **Step 3: Write failing transactional publish tests**

Cover standalone publish, supplied executor atomicity, metadata/correlation,
idempotency, delay, and immutable publish activity.

- [ ] **Step 4: Implement event migrations and public clients**

Outbox and consumer-delivery storage must remain separate. Export the events
system migration catalog for ORM CLI selection.

- [ ] **Step 5: Register the events migration catalog**

Extend `loadSystemMigrations` so `services.events.durable` includes the events
catalog after shared durability migrations. Add an ORM CLI test covering event
selection without jobs and combined jobs/events ordering.

- [ ] **Step 6: Verify and commit**

```bash
bun install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/events/tests
bun run build --filter=@damatjs/events
bun run build --filter=@damatjs/orm-cli
bun scripts/check-changed-code-lines.ts e8dcd90
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add transactional durable events"
```

Update events README/docs and `releases/events/next.md` before the commit.

---

### Task 9: Build Durable Event Routing and Delivery Workers

**Files:**

- Create: `packages/core/events/src/durable/router/claim.ts`
- Create: `packages/core/events/src/durable/router/fanout.ts`
- Create: `packages/core/events/src/durable/router/complete.ts`
- Create: `packages/core/events/src/durable/router/loop.ts`
- Create: `packages/core/events/src/durable/router/index.ts`
- Create: `packages/core/events/src/durable/worker/claim.ts`
- Create: `packages/core/events/src/durable/worker/heartbeat.ts`
- Create: `packages/core/events/src/durable/worker/context.ts`
- Create: `packages/core/events/src/durable/worker/execute.ts`
- Create: `packages/core/events/src/durable/worker/outcome.ts`
- Create: `packages/core/events/src/durable/worker/loop.ts`
- Create: `packages/core/events/src/durable/worker/index.ts`
- Create: `packages/core/events/src/durable/worker/reconcileLeases.ts`
- Create: `packages/core/events/src/durable/worker/reconcileRetries.ts`
- Create: `packages/core/events/src/durable/worker/retention.ts`
- Create: `packages/core/events/src/durable/worker/reconciler.ts`
- Modify: `packages/core/events/src/durable/client/publish.ts`
- Create: `packages/core/events/src/durable/wakeup/publisher.ts`
- Create: `packages/core/events/src/durable/wakeup/subscriber.ts`
- Create: `packages/core/events/src/durable/wakeup/index.ts`
- Modify: `packages/core/events/src/durable/index.ts`
- Create: `packages/core/events/tests/durable-worker/routing.test.ts`
- Create: `packages/core/events/tests/durable-worker/claims.test.ts`
- Create: `packages/core/events/tests/durable-worker/fencing.test.ts`
- Create: `packages/core/events/tests/durable-worker/outcomes.test.ts`
- Create: `packages/core/events/tests/durable-worker/recovery.test.ts`
- Create: `packages/core/events/tests/durable-worker/reconcile.test.ts`
- Create: `packages/core/events/tests/durable-worker/retention.test.ts`
- Create: `packages/core/events/tests/durable-worker/wakeup.test.ts`
- Modify: `packages/core/events/README.md`
- Modify: `packages/core/events/docs/README.md`
- Modify: `releases/events/next.md`

**Interfaces:**

- `DurableEventRouter` claims unrouted outbox rows and creates one delivery per
  currently registered stable consumer.
- `DurableEventWorker` executes selected consumers with fenced leases.

- [ ] **Step 1: Write failing routing tests**

Cover one delivery per consumer, no-consumer routing, duplicate router overlap,
consumer snapshot behavior, and one routing activity timeline.

- [ ] **Step 2: Implement transactional routing**

Claim with `SKIP LOCKED`, insert deliveries with unique
`(event_id, consumer)`, and mark the outbox row routed in one transaction.

- [ ] **Step 3: Write failing delivery tests**

Cover independent consumer success/failure, retries, dead letters, progress,
logs, cancellation, JSON result, stale lease rejection, and recovery.

- [ ] **Step 4: Implement delivery worker**

Reuse durability lease, log, redaction, and idempotency primitives without
importing jobs.

- [ ] **Step 5: Write failing reconciliation and wake-up tests**

Cover expired delivery leases, retry promotion, bounded retention, active-row
preservation, PostgreSQL success while Redis is unavailable, router fan-out
wake-ups, and malformed wake-up rejection.

- [ ] **Step 6: Implement event recovery, retention, and wake-ups**

Start the reconciler with the delivery worker. Successful publish and router
fan-out notify the relevant wake-up channel only after commit. PostgreSQL
polling remains active, and Redis failure only logs a warning.

- [ ] **Step 7: Verify and commit**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/events/tests/durable-worker
bun run build --filter=@damatjs/events
bun scripts/check-changed-code-lines.ts e8dcd90
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add durable event delivery workers"
```

Update durable event routing, worker, recovery, progress, and log docs before
the commit.

---

### Task 10: Add Operational Inspection, Summaries, and Administration

**Files:**

- Create: `packages/core/jobs/src/inspection/types.ts`
- Create: `packages/core/jobs/src/inspection/list.ts`
- Create: `packages/core/jobs/src/inspection/detail.ts`
- Create: `packages/core/jobs/src/inspection/summary.ts`
- Create: `packages/core/jobs/src/inspection/admin.ts`
- Create: `packages/core/jobs/src/inspection/index.ts`
- Modify: `packages/core/jobs/src/index.ts`
- Create: `packages/core/events/src/durable/inspection/types.ts`
- Create: `packages/core/events/src/durable/inspection/list.ts`
- Create: `packages/core/events/src/durable/inspection/detail.ts`
- Create: `packages/core/events/src/durable/inspection/summary.ts`
- Create: `packages/core/events/src/durable/inspection/admin.ts`
- Create: `packages/core/events/src/durable/inspection/index.ts`
- Modify: `packages/core/events/src/durable/index.ts`
- Modify: `packages/core/events/src/index.ts`
- Create: `packages/core/jobs/tests/inspection/list.test.ts`
- Create: `packages/core/jobs/tests/inspection/detail.test.ts`
- Create: `packages/core/jobs/tests/inspection/summary.test.ts`
- Create: `packages/core/jobs/tests/inspection/admin.test.ts`
- Create: `packages/core/events/tests/inspection/list.test.ts`
- Create: `packages/core/events/tests/inspection/detail.test.ts`
- Create: `packages/core/events/tests/inspection/summary.test.ts`
- Create: `packages/core/events/tests/inspection/admin.test.ts`
- Create: `packages/framework/src/tests/runtime/no-admin-routes.test.ts`
- Modify: `packages/core/jobs/README.md`
- Modify: `packages/core/jobs/docs/README.md`
- Modify: `packages/core/events/README.md`
- Modify: `packages/core/events/docs/README.md`
- Modify: `releases/jobs/next.md`
- Modify: `releases/events/next.md`

**Interfaces:**

```ts
interface JobInspectionClient {
  listRuns(filter: JobRunFilter): Promise<CursorPage<JobRunSummary>>;
  getRun(id: string): Promise<JobRunDetail | null>;
  getSummary(filter: WorkSummaryFilter): Promise<JobOperationalSummary>;
  cancel(id: string, actor: WorkActor, reason?: string): Promise<JobRun>;
  retry(id: string, actor: WorkActor): Promise<JobRun>;
  pauseQueue(queue: string, actor: WorkActor, reason?: string): Promise<void>;
  resumeQueue(queue: string, actor: WorkActor): Promise<void>;
  enableSchedule(id: string, actor: WorkActor): Promise<JobSchedule>;
  disableSchedule(
    id: string,
    actor: WorkActor,
    reason?: string,
  ): Promise<JobSchedule>;
  runRetention(
    request: BoundedRetentionRequest,
    actor: WorkActor,
  ): Promise<RetentionResult>;
}
```

```ts
interface DurableEventInspectionClient {
  listEvents(filter: DurableEventFilter): Promise<CursorPage<EventSummary>>;
  getEvent(id: string): Promise<DurableEventDetail | null>;
  getSummary(filter: WorkSummaryFilter): Promise<EventOperationalSummary>;
  cancelDelivery(
    id: string,
    actor: WorkActor,
    reason?: string,
  ): Promise<EventDelivery>;
  retryDelivery(id: string, actor: WorkActor): Promise<EventDelivery>;
  pauseConsumer(
    event: string,
    consumer: string,
    actor: WorkActor,
    reason?: string,
  ): Promise<void>;
  resumeConsumer(
    event: string,
    consumer: string,
    actor: WorkActor,
  ): Promise<void>;
  runRetention(
    request: BoundedRetentionRequest,
    actor: WorkActor,
  ): Promise<RetentionResult>;
}
```

- [ ] **Step 1: Write failing list/detail tests**

Cover upcoming, processing, retrying, failed, completed, and recovered views;
cursor pagination; every filter; payload visibility; redaction; attempts; logs;
activity; and lease history.

- [ ] **Step 2: Implement list and detail queries**

Use parameterized SQL only. Stable sort uses timestamp plus UUID. Native
statuses remain stored; UI group names are derived in result mappers.

- [ ] **Step 3: Write failing summary tests**

Cover status counts, throughput buckets, duration distributions, oldest wait,
next scheduled work, dead-letter grouping, active/stale leases, and worker load.

- [ ] **Step 4: Implement summaries**

Use bounded time ranges and validated bucket sizes. Do not add OpenTelemetry.

- [ ] **Step 5: Write failing administration tests**

Cover actor-required cancel/retry/pause/resume, invalid transitions, schedule
enable/disable, and complete audit history.

- [ ] **Step 6: Implement headless administration**

Export typed clients only. Add a negative framework test proving no admin route
is mounted automatically.

- [ ] **Step 7: Verify and commit**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
  bun test packages/core/jobs/tests/inspection packages/core/events/tests/inspection
bun test packages/framework/src/tests/runtime/no-admin-routes.test.ts
bun run build --filter=@damatjs/jobs
bun run build --filter=@damatjs/events
bun run build --filter=@damatjs/framework
bun scripts/check-changed-code-lines.ts e8dcd90
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add durable work inspection APIs"
```

Update jobs/events inspection and administration docs and both unreleased notes
before the commit.

---

### Task 11: Add Selectable Framework Runtime Modes and Ordered Shutdown

**Files:**

- Create: `packages/framework/src/config/types/runtime.ts`
- Create: `packages/framework/src/config/types/durability.ts`
- Create: `packages/framework/src/config/types/jobs.ts`
- Create: `packages/framework/src/config/types/events.ts`
- Modify: `packages/framework/src/config/types/app.ts`
- Modify: `packages/framework/src/config/types/services.ts`
- Modify: `packages/framework/src/config/types/index.ts`
- Modify: `packages/framework/package.json`
- Create: `packages/framework/src/runtime/types.ts`
- Create: `packages/framework/src/runtime/resolve.ts`
- Create: `packages/framework/src/runtime/environment.ts`
- Create: `packages/framework/src/runtime/startWorkers.ts`
- Create: `packages/framework/src/runtime/index.ts`
- Create: `packages/framework/src/services/initialize/durability.ts`
- Modify: `packages/framework/src/services/initialize/jobs.ts`
- Modify: `packages/framework/src/services/initialize/events.ts`
- Modify: `packages/framework/src/services/index.ts`
- Modify: `packages/framework/src/entry.ts`
- Create: `packages/framework/src/server/start.ts`
- Create: `packages/framework/src/server/types.ts`
- Modify: `packages/framework/src/server/index.ts`
- Create: `packages/framework/src/shutdown/registry.ts`
- Create: `packages/framework/src/shutdown/runner.ts`
- Create: `packages/framework/src/shutdown/signals.ts`
- Create: `packages/framework/src/shutdown/types.ts`
- Modify: `packages/framework/src/shutdown/index.ts`
- Modify: `packages/framework/src/index.ts`
- Create: `packages/framework/src/tests/runtime/resolve.test.ts`
- Create: `packages/framework/src/tests/runtime/environment.test.ts`
- Create: `packages/framework/src/tests/runtime/startup.test.ts`
- Create: `packages/framework/src/tests/services/durability.test.ts`
- Modify: `packages/framework/src/tests/services/initializeEvents.test.ts`
- Modify: `packages/framework/src/tests/services/initializeJobs.test.ts`
- Modify: `packages/framework/src/tests/services/initializeEventsJobs.test.ts`
- Create: `packages/framework/src/tests/services/events-runtime.test.ts`
- Create: `packages/framework/src/tests/services/jobs-runtime.test.ts`
- Create: `packages/framework/src/tests/services/combined-runtime.test.ts`
- Delete: `packages/framework/src/tests/shutdown.test.ts`
- Create: `packages/framework/src/tests/shutdown/runner.test.ts`
- Create: `packages/framework/src/tests/shutdown/signals.test.ts`
- Modify: `packages/framework/README.md`
- Modify: `packages/framework/docs/config.md`
- Modify: `packages/framework/docs/services.md`
- Modify: `packages/framework/docs/server-and-shutdown.md`
- Modify: `releases/framework/README.md`
- Modify: `releases/framework/next.md`
- Modify: `bun.lock`

**Interfaces:**

```ts
type RuntimeMode = "server" | "worker" | "all";
type WorkerCapability = "jobs" | "events";

interface RuntimeConfig {
  mode?: RuntimeMode;
  workers?: WorkerCapability[];
  shutdownGraceMs?: number;
}

interface ResolvedRuntime {
  mode: RuntimeMode;
  workers: WorkerCapability[];
  servesHttp: boolean;
}
```

`ServicesConfig` gains focused `durability`, `jobs`, and `events` types. The
durability block owns polling, leases, heartbeat, retention, wake-ups, progress
sampling, log limits, redaction, and inspection visibility. Jobs owns worker and
schedule policy. Events preserves ephemeral broadcast config and adds a
`durable` block for router and delivery-worker policy.

The legacy `services.jobs.worker` process-selection flag is removed in this v1
contract. `services.jobs` enables the capability; `runtime.mode` or
`DAMAT_RUNTIME_MODE` selects whether the process executes it. Release notes give
the exact migration from `worker: false` to `runtime.mode: "server"`.

Environment precedence:

```text
DAMAT_RUNTIME_MODE > runtime.mode > "all"
DAMAT_WORKER_TYPES > runtime.workers > enabled service capabilities
```

- [ ] **Step 1: Write failing runtime resolution tests**

Cover config defaults, environment precedence, whitespace/deduplication,
unknown values, server dropping workers, worker requiring capabilities, and all
with zero enabled durable services.

- [ ] **Step 2: Implement pure runtime resolution**

Read environment through an injected record in tests. Do not read
`process.env` inside the parser.

- [ ] **Step 3: Write failing startup tests**

Prove:

- server initializes publishers and HTTP but no worker;
- jobs worker starts no router/server;
- events worker starts no job worker;
- combined worker starts both;
- all starts HTTP and selected workers;
- explicit unavailable capability fails;
- missing database or migrations fails with migration command.

- [ ] **Step 4: Refactor service initialization**

Order: logger, database, Redis, modules, auth/publishers, readiness, selected
workers. Configure the default durability client from `PoolManager.getPool()`.
Re-export the app-facing durability, jobs, and durable-event client types from
the framework root without exposing automatic routes.

- [ ] **Step 5: Write failing ordered shutdown tests**

Expected order:

```text
http -> claims/wakeups -> grace drain -> heartbeat/reconcile
-> redis -> postgres -> logger
```

Failures log and later phases continue. Grace timeout leaves leases to expire.

- [ ] **Step 6: Implement phased shutdown**

Replace concurrent `Promise.all` with phase ordering and per-phase
`Promise.allSettled`. Add registry reset for tests. `startServer` returns a
promise-based close handle.

- [ ] **Step 7: Verify and document**

```bash
bun install
bun test packages/framework/src/tests/runtime
bun test packages/framework/src/tests/services
bun test packages/framework/src/tests/shutdown
bun run build --filter=@damatjs/framework
bun scripts/check-changed-code-lines.ts e8dcd90
```

Update framework configuration, services, bootstrap, server/shutdown docs and
release records.

- [ ] **Step 8: Commit**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add selectable durable worker runtimes"
```

---

### Task 12: Complete Reference Deployment, Docs, and Full Recovery Verification

**Files:**

- Create: `backend/default/src/jobs/generateReport.ts`
- Create: `backend/default/src/jobs/index.ts`
- Create: `backend/default/src/events/userCreated.ts`
- Create: `backend/default/src/events/consumers/auditUser.ts`
- Create: `backend/default/src/events/consumers/notifyUser.ts`
- Create: `backend/default/src/events/index.ts`
- Create: `backend/default/src/examples/transactionalWork.ts`
- Create: `backend/default/src/examples/inspectWork.ts`
- Modify: `backend/default/damat.config.ts`
- Modify: `backend/default/Dockerfile`
- Modify: `backend/default/docker-compose.yml`
- Create: `backend/default/tests/jobs.test.ts`
- Create: `backend/default/tests/durable-events.test.ts`
- Create: `backend/default/tests/runtime-modes.test.ts`
- Create: `backend/default/tests/recovery.test.ts`
- Modify package READMEs/docs and the guide files named in Step 5
- Create or modify the release files named in Step 6
- Update `releases/README.md`

**Interfaces:**

The sample contains:

- one job that reports progress and structured logs;
- one durable event with two independent named consumers;
- transactional enqueue and publish examples;
- inspection examples;
- one migration container that runs `bun run db:migrate`;
- one API container, one jobs container, and one events container built from
  the same image with different environment variables.

- [ ] **Step 1: Write failing sample tests**

Prove the sample registers jobs/consumers, uses transactional publishing, and
resolves each runtime mode from its Docker environment.

- [ ] **Step 2: Add the sample capabilities**

Keep each file under 100 lines. Do not add a dashboard or unauthenticated admin
routes.

- [ ] **Step 3: Update Docker deployment**

Compose services use:

```yaml
api:
  environment:
    DAMAT_RUNTIME_MODE: server
jobs:
  environment:
    DAMAT_RUNTIME_MODE: worker
    DAMAT_WORKER_TYPES: jobs
events:
  environment:
    DAMAT_RUNTIME_MODE: worker
    DAMAT_WORKER_TYPES: events
```

All three build the same image and share PostgreSQL/optional Redis.
The one-shot migration service uses the same image, and API/workers wait for its
successful completion rather than creating tables during startup.

- [ ] **Step 4: Run crash and Redis-loss tests**

Against PostgreSQL and Redis:

1. enqueue/publish work;
2. claim it;
3. terminate the worker without completion;
4. wait past lease expiry;
5. start a replacement worker;
6. prove recovery activity and completion;
7. repeat with Redis stopped;
8. prove idempotent database effects execute once.

Use test-only short lease and poll intervals so recovery verification does not
depend on long sleeps.

- [ ] **Step 5: Update all living docs**

Update exactly these living-doc surfaces:

- `packages/core/durability/README.md`
- `packages/core/durability/docs/README.md`
- jobs and events README/docs
- services transaction docs
- ORM migration and CLI docs
- framework config/services/server docs
- `docs/guide/04-configuration.md`
- `docs/guide/06-migrations.md`
- `docs/guide/10b-events-and-jobs.md`
- `docs/guide/12-default-backend.md`
- `docs/guide/19-deployment.md`
- `docs/guide/20-package-reference.md`
- `docs/guide/21-troubleshooting.md`
- `docs/GUIDE.md`

- [ ] **Step 6: Complete release records**

Review and finalize every affected `next.md` and package release index, then
update `releases/README.md`. Keep living docs free of version history.

- [ ] **Step 7: Run focused verification**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/damatjs \
REDIS_URL=redis://localhost:6379 \
  bun test packages/core/durability packages/core/jobs packages/core/events
bun test packages/service packages/orm/migration packages/orm/cli packages/framework
bun test backend/default
```

- [ ] **Step 8: Run repository verification**

```bash
bun run build
bun run check-types
bun run lint
bun test
bunx prettier --check .
bun scripts/check-changed-code-lines.ts e8dcd90
git diff --check
git status --short
```

Expected: every command passes and the line checker reports zero violations for
all new/touched code. Any long legacy file touched by this phase must be split.
The roadmap's Phase 12 remains responsible for untouched legacy decomposition
and enabling the repository-wide `bun run check:lines` gate.

- [ ] **Step 9: Commit the phase completion**

```bash
git status --short
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat: complete durable events and jobs phase"
```

- [ ] **Step 10: Report the phase**

Report:

- commits and files changed;
- migrations added and the command users must run;
- public API changes;
- runtime/Docker modes;
- recovery/idempotency evidence;
- inspection and observability coverage;
- full test/build/lint/type/format/line results;
- any explicitly deferred Phase 8 dashboard or pipeline work.
