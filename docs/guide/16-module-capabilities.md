[Damat Guide](../GUIDE.md) › Module capabilities

# 16. Module capabilities

This is the full capability surface of a **single Damat module** — everything one
module can do "to the fullest", for an author (human or AI) building one. A module
is a self-contained vertical slice of a backend: its own models, migrations,
service, config, optional workflows, and optional HTTP routes, packaged behind a
[`module.json`](../../MODULES.md) manifest so it can be developed in isolation and
installed into any app.

A module imports each symbol from its **real** package, so the code fits
unchanged when an app installs it. [`@damatjs/module`](../../packages/module/README.md)
itself carries only the contract/config/runtime/tooling.

```ts
import { defineModule, ModuleService } from "@damatjs/services";
import { getModule } from "@damatjs/framework";
import { model, columns } from "@damatjs/orm-model";
import {
  createStep, createWorkflow, executeStep, RetryPolicies, Effect,
} from "@damatjs/workflow-engine";
import type { RouteHandler, RouteValidator } from "@damatjs/framework/router";
import { z } from "@damatjs/deps/zod";
```

> **Scope of this chapter.** Everything here lives *inside one module*. What a
> module deliberately **cannot** do — cross-module links, importing other modules,
> declaring what it plugs into — is covered in
> ["Out of scope for a module"](#out-of-scope-for-a-module) and in
> [Composing & linking modules](./17-composing-and-linking-modules.md).

## Standard layout

```
my-module/
├── package.json          # depends on @damatjs/module only
├── module.config.ts      # optional standalone-app overrides
└── src/
    ├── module.json       # the manifest (the portability contract)
    ├── index.ts          # default-exports defineModule(...)
    ├── models/           # ORM model definitions
    ├── migrations/       # SQL migrations the module owns
    ├── workflows/        # workflow definitions (optional)
    ├── types/            # generated row types + zod schemas
    └── api/routes/       # file-based HTTP routes (optional)
```

The manifest's [`paths`](#packaging-modulejson) can override any of these; omit it
for the standard layout above.

---

## 16.1 Models — the orm-model DSL

Models are defined with `model(tableName, properties, options?)` from
[`@damatjs/orm-model`](../../packages/orm/model/README.md). A model is **pure
metadata** — a `ModelDefinition` that serializes to a `TableSchema`; it executes no
SQL. Every model self-registers in a process-global table-name registry on
construction (this is what makes string relation targets resolvable).

```ts
import { model, columns } from "@damatjs/orm-model";

export const UserModel = model(
  "users",
  {
    id: columns.id({ prefix: "usr" }).primaryKey(),
    email: columns.text().unique(),
    emailVerified: columns.boolean().default(false),
    name: columns.text().nullable(),
    accounts: columns.hasMany("accounts"),     // intra-module inverse
  },
  { schema: "public", name: "User" },          // options (both optional)
).indexes([columns.indexes().columns(["email"]).unique()]);
```

`model()` options: `schema` (PG schema for the table) and `name` (logical name;
defaults to the table name). Property values may be a `ColumnBuilder`, a
`belongsTo`, `hasMany`, or `hasOne` — nothing else.

### Column groups and builders

Every method on the `columns` factory returns a fresh builder. The full set:

| Builder | Factory | SQL type / behavior |
| --- | --- | --- |
| Id | `columns.id({ prefix })` | `text` PK, **not null** by default; with a prefix emits a `generate_id('<prefix>')` DB default |
| Boolean | `columns.boolean()` | `boolean` |
| Integer | `columns.integer()` | `integer`; chain `.bigInt()` / `.smallInt()` / `.serial()` / `.bigSerial()` / `.smallSerial()` |
| Numeric | `columns.numeric(p?, s?)` | decimal; `p`→length, `s`→scale; also `.precision(p)` / `.scale(s)` |
| Real | `columns.real()` | `real` |
| Double precision | `columns.doublePrecision()` | `double precision` |
| Money | `columns.money()` | `money` (driver returns it as a `string`) |
| Text | `columns.text()` | `text` |
| Varchar | `columns.varchar(n?)` | `character varying`; passing `n` applies `.length(n)` |
| Char | `columns.char(n?)` | `character`; passing `n` applies `.length(n)` |
| Timestamp | `columns.timestamp({ withTimezone? })` | `timestamp`; `.withTimezone()` / `.withoutTimezone()` / `.defaultNow()` → `now()` |
| Date | `columns.date()` | `date`; `.defaultNow()` → `CURRENT_DATE` |
| Time | `columns.time()` | `time`; tz toggle |
| Interval | `columns.interval()` | `interval` |
| JSON | `columns.json({ binary? })` | `json`; `.binary()` switches to `jsonb` |
| JSONB | `columns.jsonb()` | `jsonb` |
| UUID | `columns.uuid()` | `uuid`; `.defaultGenerate()` → `gen_random_uuid()` |
| Bytea | `columns.bytea()` | `bytea` (driver returns a `Buffer`) |
| Enum | `columns.enum(EnumBuilder)` | references a named PG enum (see below) |
| Vector | `columns.vector(dims)` | `real[]` with fixed dimensions for embeddings; `.dimensions(d)` resizes |

> There is no first-class geometric / network / range column factory even though
> the underlying `ColumnType` supports those SQL types — most apps never need them.

### Column modifiers

Every column builder shares the base modifier set:

| Modifier | Effect |
| --- | --- |
| `.primaryKey()` | mark column as primary key |
| `.unique()` | UNIQUE column |
| `.nullable()` | allow NULL (columns are NOT NULL by default) |
| `.default(value)` | literal default; **strings are auto single-quoted**, numbers/booleans bare |
| `.defaultRaw(expr)` | raw SQL default, no quoting (e.g. `now()`, `gen_random_uuid()`) |
| `.array()` | wrap as an array column |
| `.fieldName(name)` | DB column name when it differs from the property name |

Type-specific helpers extend these: `.defaultNow()` (timestamp/date),
`.defaultGenerate()` (uuid), `.length(n)` (varchar/char), `.precision()`/`.scale()`
(numeric), the integer width/serial chain, and `.dimensions(d)` (vector). Use
`.defaultRaw()` (or the typed `.defaultNow()` / `.defaultGenerate()`) for SQL
expression defaults — `.default()` would single-quote a string and produce
`'now()'`.

### Enums

Declare a named PG enum once with `EnumBuilder`, then reference it by name from
columns. Register the enum at module level so its `CREATE TYPE` is described:

```ts
import { EnumBuilder } from "@damatjs/orm-model";

const OrderStatus = new EnumBuilder(["pending", "shipped", "delivered"]).name("order_status");

const Order = model("orders", {
  id: columns.id({ prefix: "ord" }).primaryKey(),
  status: columns.enum(OrderStatus),
});
```

`columns.enum(...)` keeps only the enum's **name** on the column (like a real PG
column pointing at a `CREATE TYPE`); the enum **values** live on the module-level
`EnumSchema`. If you forget to register the enum at module level, the type name
still appears on the column but no `CREATE TYPE` is emitted.

### Auto columns: `.timestamps()` and `.softDelete()`

A `ModelDefinition` enables both by default (`_timestamps = true`,
`_softDelete = true`). They are fluent toggles:

```ts
model("orders", { ... })
  .timestamps(false)            // skip created_at / updated_at
  .softDelete(false)            // skip deleted_at
  .softDelete(true, "removed_at"); // custom soft-delete column name
```

When emitting the table schema:

- **Timestamps** append `created_at` (`date`, NOT NULL, default `now()`) and
  `updated_at` (`date`, nullable) — each only if a column of that name isn't
  already defined (the check tolerates camelCase `createdAt` / `updatedAt`).
- **Soft delete** appends the deleted-at column (default `deleted_at`, `date`,
  nullable) if absent.

If you define your own richer `createdAt`/`updatedAt`, your definition wins and the
auto column is skipped. The auto columns are typed `date`, not
`timestamp with time zone`.

### Indexes and constraints

Attach with `.indexes([...])` and `.constrain([...])`. Both **replace** the
model's array on each call (they do not append). Builders come from
`columns.indexes(name?)` / `columns.constrains(name?)`:

```ts
model("products", { ... })
  .indexes([
    columns.indexes("idx_products_total").columns(["total"]).type("btree"),
    columns.indexes().columns(["status", "createdAt"]),   // auto-named
    columns.indexes().columns(["sku"]).unique().where("deleted_at IS NULL"),
  ])
  .constrain([
    columns.constrains("products_total_pos").check("total > 0"),
    columns.constrains().columns(["sku"]).unique(),         // auto-named
    columns.constrains().primaryKey().columns(["a", "b"]),  // composite PK
  ]);
```

`IndexBuilder`: `.columns()`, `.unique()`, `.type(indexType)` (default `btree`),
`.where(condition)` (partial index), `.concurrently()`. `ConstraintBuilder` picks
its kind by method — `.unique()`, `.primaryKey()`, `.check(condition)`,
`.exclude(expressions)` (with `.indexType()`, default `gist`) — plus
`.columns()`, `.where()`, and `.deferrable(initiallyDeferred?)`. A constraint with
no declared kind throws at schema time; `primaryKey()` appends a `_pkey` suffix to
the resolved name, so pass the base name.

### Relations — **intra-module only, by table name**

A relation has two sides:

- **Owning side — `belongsTo(target)`.** The only relation that creates DB
  artifacts: it adds the FK column(s) and a foreign-key constraint to *this* table.
- **Inverse side — `hasMany(target)` (1:N) / `hasOne(target)` (1:1).** Pure ORM
  metadata; no column, no FK.

```ts
const Category = model("categories", {
  id: columns.id({ prefix: "cat" }).primaryKey(),
  products: columns.hasMany("products").mappedBy("category"),  // inverse, no column
});

const Product = model("products", {
  id: columns.id({ prefix: "prd" }).primaryKey(),
  // owning side — creates the `category_id` FK column on `products`
  category: columns.belongsTo("categories").onDelete("CASCADE").indexed(),
});
```

Targets are **table-name strings** within the same module. The FK column defaults
to `<targetTable>_id` referencing `id`; no import of the target model is needed,
and circular references between tables are a non-issue. (A direct model reference or
a `() => Model` thunk also work and resolve identically, but the string form is the
normal one.)

`belongsTo` fluent API: `.link({ name?, foreignKey?, reference? })`, `.nullable()`
(also defaults `ON DELETE SET NULL`), `.unique()` (makes it 1:1), `.indexed()`
(btree index per FK column), `.onDelete(action)`, `.onUpdate(action)`,
`.match(type)`, `.deferrable(initially?)`, `.constraint({ ... })`. `hasMany` /
`hasOne` expose `.mappedBy(prop)`.

Validate wiring early — broken relations surface as a single readable error with
copy-pasteable fixes:

```ts
import { assertValidRelations } from "@damatjs/orm-model";
assertValidRelations([Category, Product]);  // throws RelationValidationError on a bad graph
```

> **Relations stay within one module.** A module models its own tables and the
> relationships among them. It does **not** reference another module's tables to
> form a real, validated relationship — that is a cross-module *link*, which is the
> backend owner's job (ch. 17). The authoring surface does not even expose link
> helpers.

### Generated types

`ModelDefinition.toTsType()` emits the base row interface (columns + `belongsTo` FK
columns; inverse relations omitted). The richer per-table files — `NewX` insert
types, `UpdateX` patch types, and zod schemas — are produced by the module codegen
step (see [16.4](#164-migrations-and-codegen)). Type mapping follows what the `pg`
driver actually returns at runtime: `bigint`→`bigint`, `money`→`string`,
`bytea`→`Buffer`, `timestamp`/`date`→`Date`, `json`/`jsonb`→`unknown`, etc.

Full detail:
[column builders](../../packages/orm/model/docs/column-builders.md),
[relations](../../packages/orm/model/docs/relations.md),
[indexes & constraints](../../packages/orm/model/docs/indexes-and-constraints.md),
[schema & model](../../packages/orm/model/docs/schema-and-model.md),
[type inference](../../packages/orm/model/docs/type-inference.md).

---

## 16.2 Service — auto-CRUD, domain methods, transactions, credentials

`ModuleService({ models, credentialsSchema? })` from
[`@damatjs/services`](../../packages/service/README.md) is a **class factory**.
Given a map of model key → `ModelDefinition`, it returns an abstract base class
with one camelCased accessor per model, plus `transaction()`, `em`, and
`getModels`. You subclass it.

```ts
import { ModuleService } from "@damatjs/services";
import { z } from "@damatjs/deps/zod";
import { UserModel, AccountModel } from "./models";

const models = { user: UserModel, account: AccountModel };

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: z.object({ apiKey: z.string() }),
}) {
  // domain methods on top of the generated accessors:
  async createWithAccount(email: string) {
    return this.transaction(async () => {
      const user = await this.user.create({ data: { email } });
      await this.account.create({ data: { user_id: user.id } });
      return user;
    });
  }
}
```

Accessor names are camelCased from the model key (`account` → `service.account`,
`Verification` → `service.verification`). Note: `toCamelCase` only lowercases the
**first** character — it does not fully convert snake_case/kebab-case. Choose model
keys that read as JS identifiers (`account`, `apiKey`).

### Generated CRUD per model (`ModelMethods`)

Each accessor exposes the full surface:

| Method | Signature (abridged) | Behavior |
| --- | --- | --- |
| `create` | `({ data, returning? }) => Promise<T>` | insert one row |
| `createMany` | `({ data: T[], returning? }) => Promise<T[]>` | insert many |
| `find` | `(opts?) => Promise<T \| null>` | one row (`select`, `where`, `orderBy`, `include`) |
| `findMany` | `(opts?) => Promise<T[]>` | many rows (+ `skip`, `take`, `include`) |
| `update` | `({ where, data, returning? }) => Promise<T[]>` | update matching rows |
| `delete` | `({ where, returning? }) => Promise<number>` | hard delete; returns count |
| `softDelete` | `({ where, returning? }) => Promise<T[]>` | set the model's deleted-at column to `now` |
| `restore` | `({ where, returning? }) => Promise<T[]>` | clear the deleted-at column (set to `null`) |
| `count` | `({ where? }) => Promise<number>` | row count |
| `exists` | `({ where }) => Promise<boolean>` | existence check |
| `getModelDefinition` | `() => ModelDefinition` | introspection |

`FindOptions` carries `select`, `where`, `orderBy` (`[{ column, direction }]`),
`skip`, `take`, and `include` (relation names to eager-load). Relation loading
matches `include` names against the model's relation metadata:

- `belongsTo` — reads the FK column off the record and fetches the related row by id.
- `hasMany` / `hasOne` — fetches related rows by the conventional `<name>_id` link
  (collection for `hasMany`, single row for `hasOne`).

> **Writes are validated.** `create` / `createMany` / `update` build (and cache) a
> zod schema from the model's columns and `.parse` the payload — they **throw**
> `ZodError` on type-mismatched data. Auto-generated, defaulted, and nullable
> columns are optional; updates validate in partial mode. Columns with no single JS
> representation (json/jsonb, bytea, ranges, …) map to `z.any()` and are effectively
> unchecked.

### Transactions

`this.transaction(cb, options?)` runs `cb` inside one DB transaction. It rebinds
**every** model's methods to the transactional entity manager for the duration of
the callback, so all CRUD inside is atomic. A nested `transaction()` joins the
outer one rather than opening a new transaction. Always wrap multi-row invariants
(create user + account, decrement stock + write ledger) in a transaction.

### Adding domain methods

Subclass and add methods freely; use the generated accessors, `this.transaction`,
and — for raw work — `this.em` (the `PgEntityManager`) or
`service.<model>.getModelDefinition()` for introspection. Adding a model to the
`models` map makes a new accessor and registration appear automatically.

### Credentials schema and the config loader

`credentialsSchema` is an optional zod object validated in the service
constructor. The module loads its credentials from `process.env` with a loader
function; `defineModule` wires the two together. A common pattern keeps the schema
and loader in `config/`:

```ts
// config/schema.ts
export const schema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url().optional(),
});

// config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({
  apiKey: env.MY_API_KEY ?? "",
  baseUrl: env.MY_BASE_URL,
});
```

Inside the service, read validated credentials via `this.credentials`.

Detail: [`ModuleService` & CRUD](../../packages/service/docs/module-service.md),
[`defineModule`](../../packages/service/docs/define-module.md).

---

## 16.3 `defineModule` — the module entry point

`index.ts` default-exports `defineModule(name, { service, credentials })`. This is
the object the harness, runtime, and framework consume.

```ts
import { defineModule } from "@damatjs/module";
import { UserModuleService } from "./service";
import { load } from "./config/load";

export default defineModule("user", {
  service: UserModuleService,
  credentials: load,           // (env) => creds
});
```

- **Credentials are parsed eagerly** at `defineModule` time (so a validating loader
  throws at import time, not first use — keep it pure).
- **The service is constructed lazily** on first property access (or via `init()`),
  because the service constructor requires the pool to be initialized first.
- `init()` always rebuilds the instance against the current pool — that is how the
  harness/framework rebind after pool setup.

---

## 16.4 Migrations and codegen (module-local)

A module **owns its schema**. Migrations live in the module's `migrations/` dir and
are diffed from the models, not hand-written. Codegen produces row types and zod
schemas into `types/`. Both run on the standalone package, no `damat.config.ts`
required:

```bash
damat module migration:create   # diff models -> a new SQL migration (only if changed)
damat module codegen             # generate row types + zod schemas into types/
```

Under the hood:

- `createModuleMigration(packageDir)` locates the module dir, reads the manifest,
  and diffs the models against the last schema snapshot. It returns
  `{ hasChanges, filePath? }`; nothing is written when models already match.
- `generateModuleTypes(packageDir, logger)` builds the module schema, generates a
  file map (row types + `New*`/`Update*` + zod), and writes it into the manifest's
  `paths.types` dir (default `./types`). Re-running overwrites — treat `types/` as
  generated output, never hand-edit it.

Neither touches the database; they diff against the snapshot and read model files.
**Applying** migrations is the harness/runtime's job (below) or `bun damat-orm
migrate:up` once the module is installed into an app.

Detail: [module tooling](../../packages/module/docs/tooling.md).

---

## 16.5 Workflows inside a module

A module may include workflows when a process spans multiple side-effecting steps
that must succeed as a unit or **roll back** cleanly (saga / compensating
transactions), needs per-step retries with backoff and per-attempt timeouts, or
needs mutual exclusion across instances. They build on
[`@damatjs/workflow-engine`](../../packages/workflow-engine/README.md), re-exported
from the authoring surface. The engine is **in-process** (no persisted journal, no
resume-after-crash) — skip workflows when a single function with `try/catch` covers
the need.

```ts
import { createStep, createWorkflow, executeStep, RetryPolicies, Effect } from "@damatjs/module";

const createOrder = createStep(
  "create-order",
  async (input: { items: string[] }, ctx, signal) => orderService.create(input, { signal }),
  async (input, output) => { await orderService.cancel(output.id); },  // compensation (undo)
  { retry: RetryPolicies.standard, timeoutMs: 10_000 },
);

const placeOrder = createWorkflow(
  "place-order",
  (input: { items: string[] }, ctx) =>
    Effect.gen(function* () {
      const order = yield* executeStep(createOrder, input, ctx);
      const payment = yield* executeStep(chargeCard, { orderId: order.id }, ctx);
      return { order, payment };
    }),
  { timeoutMs: 60_000 },
);

const result = await placeOrder.execute({ items: ["sku-1"] });
if (result.success) { /* result.result, result.durationMs */ }
else { /* result.error.code, result.compensated */ }
```

### Steps

`createStep(name, invoke, compensate?, config?)`. `invoke` is
`(input, ctx, signal?) => Promise<output>`; forward `signal` into `fetch`/db calls
so timeouts actually cancel work. `compensate` is `(input, output, ctx) => Promise<void>`,
registered **after** the step succeeds and run (in reverse order) only if a *later*
step fails. `StepConfig`: `timeoutMs` (per-attempt, default 30s), `retry` (a
`RetryPolicy`), `idempotent` (intent metadata only), `description`.

### Retry

`maxAttempts` counts **retries** on top of the first try (so `maxAttempts: 2` runs
3 times). Default is **no retries**. Presets: `RetryPolicies.none` / `once` /
`standard` / `aggressive` / `patient`, or a custom policy with `initialDelayMs`,
`maxDelayMs`, `backoffMultiplier`, and an `isRetryable(error)` predicate (receives
the *original* error). By default everything retries except errors named
`ValidationError`.

### Workflows, results, control flow

`createWorkflow(name, definition, config?)` returns `{ name, config, execute,
executeWithLock }`. `WorkflowConfig`: `timeoutMs` (whole-workflow, default 5 min)
and `defaultStepConfig` (layered under each step). `execute` / `executeWithLock`
**never reject** for ordinary failures — they resolve to a `WorkflowResult`
discriminated union; branch on `result.success`. A failure carries `error` (always
a `WorkflowError`), `compensated`, and `compensationsFailed`. Errors carry a
programmatic `code`: `WORKFLOW_TIMEOUT`, `WORKFLOW_FAILED`, `STEP_EXECUTION_FAILED`,
`STEP_TIMEOUT`, `MAX_RETRIES_EXCEEDED`, `WORKFLOW_LOCKED`.

Control-flow helpers compose inside the generator: `runStep` (alias of
`executeStep`), `skipStep(value)`, `parallel(...effects)` (unbounded concurrency),
`when(cond, step, input, ctx, default)`, `ifElse(cond, ifTrue, ifFalse, input, ctx)`.

### Locking

`executeWithLock(input, lockConfig?, metadata?)` acquires a Redis-backed
distributed lock so two runs sharing a `lockId` cannot run concurrently across
processes. `WorkflowLockConfig`: `lockId`, `ttlMs` (default 5 min), `maxRetries`,
`retryDelayMs`, `autoExtend` (heartbeat-extends the TTL while running). On
contention it returns a `WorkflowFailure` with code `WORKFLOW_LOCKED` (it does not
throw). Locking requires Redis to be initialized (the framework does this when
`redisUrl` is configured; the module runtime does it when `REDIS_URL` is set).

Keep workflows inside the module (`workflows/`) so the module stays self-contained.

Detail: [steps](../../packages/workflow-engine/docs/steps.md),
[workflows](../../packages/workflow-engine/docs/workflows.md),
[retry](../../packages/workflow-engine/docs/retry.md),
[locking](../../packages/workflow-engine/docs/locking.md),
[control flow](../../packages/workflow-engine/docs/control-flow.md),
[errors](../../packages/workflow-engine/docs/errors.md).

---

## 16.6 HTTP routes inside a module

A module may serve its own HTTP routes from `api/routes/` using the framework's
[file-based router](../../packages/framework/docs/router.md). The folder structure
maps to URL paths; each route lives in a `route.ts`:

```
src/api/routes/
  users/route.ts             ->  /users          (mounted at /api/users)
  users/[userId]/route.ts    ->  /users/:userId
  auth/[...auth]/route.ts    ->  /auth/*
```

Dynamic segments use `[userId]` → `:userId`; catch-all uses `[...rest]` → Hono `*`.
A `route.ts` may export any of `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (each a
`RouteHandler`), plus optional `middleware`, `validators`, `config`, and `configs`.

```ts
import type { RouteHandler } from "@damatjs/module";
// (defineRoute / response live in @damatjs/framework/router)

export const GET: RouteHandler = async (c) => {
  return c.json({ success: true, data: { users: [] } });
};

export const POST: RouteHandler = async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, data: { id: "1", ...body } }, 201);
};
```

`RouteHandler` is `(c) => Promise<Response> | Response`. `defineRoute<P>(handler)`
wraps a handler to receive typed route params as a second argument. Per-route you
can attach `middleware` (applied to all methods), `validators` (per-method zod for
`body`/`query`/`params`/`json`), and `config`/`configs` for per-method `rateLimit`
and `auth` (`session` / `apiKey` / `flexible` / `none`). Only the five verbs above
are wired; `OPTIONS`/`HEAD` are handled at the middleware layer. If `api/routes`
is absent the module still boots — it just serves no routes.

In handlers, reach the module's service through the framework registry
(`getModule(...)`) once installed in an app, or directly under the standalone
runtime.

Detail: [router](../../packages/framework/docs/router.md).

---

## 16.7 The standalone harness — dev & tests

A module is developed and tested **on its own**, before any app exists. Two modes,
both from `@damatjs/module`.

### `withModule` / `bootModule` — service-level (no HTTP)

`bootModule(module, options?)` wires the same infrastructure the framework uses
(`ConnectionManager` + `PoolManager`), applies the module's own migrations, calls
`module.init()`, and hands back the live `service`. `withModule(module, options,
fn)` boots, runs `fn(booted)`, and always tears down — the convenience wrapper for
tests:

```ts
import { withModule } from "@damatjs/module";
import userModule from "./index";

await withModule(userModule, { moduleDir: import.meta.dir }, async ({ service }) => {
  const user = await service.user.create({ data: { email: "a@b.co" } });
  expect(await service.user.exists({ where: { email: "a@b.co" } })).toBe(true);
});
```

`BootModuleOptions`: `databaseUrl` (default `process.env.DATABASE_URL`), `database`
(full pool config, takes precedence), `moduleDir` (abs path to the dir with
`module.json` + migrations — required to apply migrations), `migrate` (default
`true` when `moduleDir` is set), `logger`. `BootedModule` exposes `service`, `pool`,
`connection`, `manifest`, and `teardown()` — always call teardown (or use
`withModule`). The harness requires a real Postgres; gate tests with
`describe.skipIf(!process.env.DATABASE_URL)`. It owns the process (one module at a
time), so boot/teardown sequentially.

### `startModuleApp` — run the module as a live HTTP app

`startModuleApp(options?)` runs **one module package as a full HTTP app** — the
framework stack (middleware, file-based routes from `api/routes`, health checks)
with just this module registered. This is what `damat module dev` boots, and what
in-process API tests start with `port: 0`:

```ts
import { startModuleApp } from "@damatjs/module";

const app = await startModuleApp({ port: 0 });  // ephemeral port for tests
// app.app (Hono), app.server, app.port, app.manifest
await app.stop();                                // stop server + run shutdown handlers
```

It reads `module.json` (from `src/` or the package root) and the author's
`module.config.ts`, builds a full `AppConfig`, initializes services, applies
migrations when `DATABASE_URL` is set, and serves over `api/routes`. Port
precedence: `options.port` → `PORT` env → `module.config.ts` `http.port` → `7654`
default.

Detail: [harness](../../packages/module/docs/harness.md),
[runtime](../../packages/module/docs/runtime.md).

---

## 16.8 Packaging — `module.json`

The manifest is the portability contract `damat module add` reads to copy the
module in, register it, sync env vars, and install npm packages. It sits next to
`index.ts`.

```jsonc
{
  "name": "user",                 // required: module id, registry key, default dir name (kebab-case)
  "version": "0.2.0",             // semver (required to publish)
  "description": "Auth, sessions and accounts.",
  "author": "Abel <a@b.co>",      // string OR { name, email?, url? } — declared, not the verified owner

  "env": [                        // env vars the credentials loader reads; drives .env.example sync
    { "name": "BETTER_AUTH_SECRET", "required": true,
      "description": "Min 32-char secret", "example": "change-me-min-32-characters-long" }
  ],
  "packages": { "better-auth": "^1.4.18" },   // npm deps the host app installs (name -> semver range)

  "pairsWith": ["organization"],  // NON-BINDING hint: modules this pairs well with (never enforced)
  // "modules": ["organization"], // RARE: a hard dependency — prefer pairsWith

  "paths": {                      // layout overrides (omit for the standard layout)
    "entry": "./index.ts", "models": "./models", "migrations": "./migrations",
    "workflows": "./workflows", "types": "./types"
  },
  "registry": {                   // publishing metadata (optional today)
    "namespace": "damatjs", "keywords": ["auth", "users"],
    "license": "MIT", "repository": "…", "homepage": "…"
  }
}
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | ✅ | Module id; registry key, default install dir, **and** migration namespace; kebab-case (`/^[a-z][a-z0-9-]*$/`) |
| `version` | string | — | Semver; required to publish |
| `description` | string | — | Shown on install and in the registry |
| `author` | string \| object | — | `"Name <email> (url)"` or `{ name, email?, url? }`; declared provenance, not the verified owner |
| `env` | `ModuleEnvVar[]` | — | Each `{ name, required?, description?, example? }`; drives `.env.example` |
| `packages` | `Record<string,string>` | — | npm deps → semver range, installed into the host app on `add` |
| `pairsWith` | `string[]` | — | **Non-binding** hint — a comment to the backend owner; never enforced or installed. **Prefer this** to express relationships |
| `modules` | `string[]` | — | **Rare.** Hard dependency on other modules (install only *warns* if missing). Reach for `pairsWith` instead |
| `paths` | object | — | Overrides for `entry`/`models`/`migrations`/`workflows`/`types` |
| `registry` | object | — | `namespace`, `keywords`, `license`, `repository`, `homepage` |

Validation is hand-rolled (CLI-friendly errors) and permissive about unknown keys.
`damat module validate` runs both tiers: **errors** block installing (missing
entry, broken manifest, declared-but-missing dirs); **warnings** block publishing
(missing version/description/author/license/namespace; models without migrations).
Author your module warning-free so it's registry-ready before the hosted registry
ships.

Full field reference: [MODULES.md](../../MODULES.md),
[manifest internals](../../packages/module/docs/manifest.md).

---

## Out of scope for a module

A module is a **single-purpose unit; it does not decide what it is plugged into.**
The following are deliberately *not* a module's job — they belong to the backend
owner (see [Composing & linking modules](./17-composing-and-linking-modules.md)):

- **No cross-module links.** A module never forms a real, validated relationship to
  another module's tables. Relations are intra-module only, by table name. The
  authoring surface from `@damatjs/module` **intentionally omits** link helpers —
  links are authored with `@damatjs/framework` at the app level.
- **No importing other modules.** A module stays self-contained; it does not import
  or reach into a sibling module's models, service, or internals.
- **No declaring what's needed or plugged in.** A module does not wire itself into
  an app, mount its own routes globally, or assert what surrounds it. Installation
  and composition (`damat.config.ts`, links, route mounting) are the app's work.

The one thing a module may do to suggest a relationship is leave a **`pairsWith`**
hint in its manifest (or describe it in `description`). That is a comment for the
backend owner — never enforced, never auto-installed. Use it instead of a hard
`modules` dependency wherever possible.

---

Prev: [← Installing modules with AI](./15-installing-modules-with-ai.md) · [Guide home](../GUIDE.md) · Next: [Composing & linking modules →](./17-composing-and-linking-modules.md)
