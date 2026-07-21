[Damat Guide](../GUIDE.md) › Querying & the CRUD service

# 7b. Querying & the CRUD service

Every model registered in a module's service gets a full CRUD accessor —
`service.<model>.find(...)`, `service.<model>.create(...)`, and so on (see
[Modules & services](./07-modules-and-services.md) for how accessors are
generated). This chapter is the reference for those methods and their options.

## The methods

| Method                                                           | Returns     | Notes                                                  |
| ---------------------------------------------------------------- | ----------- | ------------------------------------------------------ |
| `find(options)`                                                  | `T \| null` | first match                                            |
| `findMany(options)`                                              | `T[]`       | list with paging/sorting                               |
| `findById(id, options?)`                                         | `T \| null` | shorthand for a primary-key lookup                     |
| `findOne(where, options?)`                                       | `T \| null` | shorthand for `find({ where })`                        |
| `create({ data, returning? })`                                   | `T`         | validates against the generated zod schema             |
| `createMany({ data: [...], returning? })`                        | `T[]`       | bulk insert                                            |
| `upsert({ data, onConflict, updateColumns?, set?, returning? })` | `T`         | insert-or-update on a conflict target                  |
| `upsertMany({ data: [...], onConflict, ... })`                   | `T[]`       | bulk upsert                                            |
| `update({ where, data, returning? })`                            | `T[]`       | updates **all** matches                                |
| `updateOne({ where, data, returning? })`                         | `T \| null` | updates the first match                                |
| `delete({ where, returning?, cascade? })`                        | `number`    | hard delete; returns row count                         |
| `softDelete({ where, returning?, cascade? })`                    | `T[]`       | sets `deleted_at` (needs `.softDelete()` on the model) |
| `restore({ where, returning? })`                                 | `T[]`       | clears `deleted_at`                                    |
| `count({ where?, withDeleted? })`                                | `number`    |                                                        |
| `exists({ where, withDeleted? })`                                | `boolean`   |                                                        |

## Find options

```ts
interface FindOptions {
  select?: string[]; // project specific columns
  where?: WhereClause; // filters (see below)
  orderBy?: Array<{
    column: string;
    direction?: "ASC" | "DESC";
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;
  skip?: number; // offset
  take?: number; // limit — capped at 1000 (MAX_PAGE_SIZE)
  include?: string[]; // eager-load relations declared on the model
  withDeleted?: boolean; // include soft-deleted rows
}
```

```ts
const admins = await users.user.findMany({
  where: { role: "admin", createdAt: { gte: since } },
  orderBy: [{ column: "createdAt", direction: "DESC" }],
  select: ["id", "email"],
  take: 50,
});
```

## Where clauses

A `where` value is either a plain value (equality) or an operator object:

| Operator                           | Meaning                                 |
| ---------------------------------- | --------------------------------------- |
| `eq` / `neq`                       | equals / not equals                     |
| `gt` / `gte` / `lt` / `lte`        | comparisons                             |
| `like` / `ilike`                   | SQL LIKE (case-sensitive / insensitive) |
| `in` / `notIn`                     | value in list                           |
| `isNull: true` / `isNotNull: true` | null checks                             |
| `between: [a, b]`                  | inclusive range                         |

```ts
await posts.post.findMany({
  where: {
    title: { ilike: "%damat%" },
    status: { in: ["published", "featured"] },
    deletedBy: { isNull: true },
  },
});
```

## Returning and projections

Writes accept `returning: [...]` to control which columns come back — you saw
this in [Workflows](./09-workflows.md), where a step returns only what the next
step needs:

```ts
const user = await users.user.create({
  data: { email },
  returning: ["id", "email"],
});
```

## Soft deletes

If a model declares `.softDelete()`, every read automatically filters
`deleted_at IS NULL`. Pass `withDeleted: true` to see through it, and use
`restore()` to bring rows back. `cascade: true` on `delete`/`softDelete`
follows the model's relations.

## Transactions

Any sequence of service calls can run atomically:

```ts
await this.transaction(
  async () => {
    const user = await this.user.create({ data: { email } });
    await this.account.create({ data: { userId: user.id, provider } });
    return user;
  },
  { isolationLevel: "SERIALIZABLE" },
); // options are optional
```

`TransactionOptions` supports `isolationLevel` (`"READ UNCOMMITTED"`,
`"READ COMMITTED"`, `"REPEATABLE READ"`, `"SERIALIZABLE"`), `readOnly`, and
`deferrable`. The callback's throw rolls the whole transaction back.

## Validation

`create`, `update`, and `upsert` validate `data` against the zod schemas
generated from your models (`damat codegen`) before touching the database —
invalid payloads throw a validation error instead of producing a DB error.

## Opt-in read caching, events & query logging

Three service-level features are off by default; you enable each on the service
config (and, for caching, per call). Full detail in the
[`@damatjs/services` README](../../packages/service/README.md).

```ts
class UserService extends ModuleService({
  models,
  cache: { defaultTtl: 60, prefix: "user" }, // enable the read-cache machinery
  events: true, // emit model CRUD events
  logQueries: true, // debug-log each CRUD call's duration
}) {}
```

- **Read caching (Redis-backed, Next.js `fetch`-cache model).** Nothing is
  cached until a read opts in: `findMany({ where, cache: true })` uses the
  service's `defaultTtl`; `cache: { ttl: 300, tags: ["homepage"] }` sets a
  time-based TTL plus custom invalidation tags. Every write
  (`create`/`update`/`delete`/…) then **invalidates the model's cached reads
  automatically**, and `invalidateCacheTags(["homepage"])` (from
  `@damatjs/redis`, re-exported by `@damatjs/framework`) is the manual reset.
  Fail-open: if Redis is missing or down the read just hits the database;
  reads inside a `transaction()` always hit the database; `null` results are
  never cached.
- **Model events (`events: true`).** After each successful write the service
  emits `<model>.created|updated|deleted` on the `@damatjs/events` bus with
  `{ model, method, result }` — see [Events & background jobs](./10b-events-and-jobs.md).
- **Query logging (`logQueries: true`).** One debug-level `query` log per CRUD
  call (`{ model, method, durationMs }`) — never SQL text or parameter values.

---

Prev: [← Modules & services](./07-modules-and-services.md) · [Guide home](../GUIDE.md) · Next: [Building HTTP APIs →](./08-http-apis.md)
