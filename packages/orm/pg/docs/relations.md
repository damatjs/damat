# Relations (`with` eager loading)

Sources: [`src/query/relations/**`](../src/query/relations),
[`src/query/select/lateral/**`](../src/query/select/lateral),
[`src/query/select/json.ts`](../src/query/select/json.ts), and the relation paths in
[`src/query/select/builder.ts`](../src/query/select/builder.ts).

`SelectBuilder.with(...)` eager-loads related rows by compiling each relation into a
`LEFT JOIN LATERAL` subquery that returns the related data as JSON. Relations are resolved from the
model's relation builders (`BelongsTo` / `HasMany` / `HasOne` from `@damatjs/orm-model`).

## Option shape

```ts
interface RelationIncludeMap { [relationName: string]: RelationIncludeOptions | boolean }

interface RelationIncludeOptions<Cols> {
  select?: Cols[];
  where?: WhereClause<Cols>;
  whereRaw?: RawWhereClause | RawWhereClause[];
  orderBy?: Array<{ column: Cols; direction?: "ASC"|"DESC"; nulls?: "NULLS FIRST"|"NULLS LAST" }>;
  limit?: number;
  offset?: number;
  with?: RelationIncludeMap;   // nesting is supported (recursively)
}
```

Usage:

```ts
user.findMany({
  select: ["id", "email"],
  with: {
    posts: { select: ["id", "title"], where: { published: true }, orderBy: [{ column: "createdAt", direction: "DESC" }], limit: 5 },
    profile: true,            // include with defaults (all columns)
    bannedFlag: false,        // explicitly excluded (skipped)
  },
});
```

`true` includes the relation with default options; `false` skips it.

## The relation guard

`SelectBuilder.with()` calls `assertValidRelationMap(model, relations)` before storing anything. Every
key must name a real relation property on the model, or it throws `RelationGuardError`:

```
[query:with] Unknown relation "postz" on model "user".
  Available relations: posts, profile
```

`getModelRelationNames(model)` ([relations/resolver.ts](../src/query/relations/resolver.ts)) finds
relations by scanning `model._properties` for `BelongsToBuilder` / `HasManyBuilder` / `HasOneBuilder`
instances.

## Relation resolution

`resolveModelRelations(model): Map<string, ResolvedRelation>`:

```ts
interface ResolvedRelation {
  name: string;
  type: "belongsTo" | "hasMany" | "hasOne";
  target: ModelDefinition;
  foreignKey: string[];
  references: string[];
}
```

- **belongsTo**: `foreignKey = builder.getForeignKey().map(fk => fk.name)`, `references = builder.getReference()`.
- **hasMany / hasOne**: if `getMappedBy()` names a `BelongsToBuilder` on the target, its `foreignKey`
  and `reference` are reused; otherwise `references` defaults to `["id"]` and, if no FK was found,
  `foreignKey` falls back to `["<parentTable>_id"]`.

## SQL generation (`SelectBuilder.generateSql` with relations)

When `_withRelations.size > 0`, the parent table is aliased `"_p"` and the select list combines parent
columns (`"_p"."col"`) with one synthesized column per relation (`"_rel_<name>"."<name>"`). For an empty
`select`, it becomes `"_p".*` plus the relation columns.

Each relation appends a join via `buildLateralJoin` ([lateral/join.ts](../src/query/select/lateral/join.ts)):

```
LEFT JOIN LATERAL (<lateralBody>) "_rel_<name>" ON TRUE
```

### `buildLateralJoin` step by step

1. Resolve the target table ref (`buildTableRef`) and aliases — outer `"_rel_<name>"`, inner `"_t"`.
2. Inner column list: `opts.select` (quoted) or `*`.
3. **Join condition** from the FK/reference pairs:
   - `belongsTo`: `"_t"."<refCol>" = "_p"."<fkCol>"`
   - `hasMany`/`hasOne`: `"_t"."<fkCol>" = "_p"."<refCol>"`
4. **User WHERE** (`opts.where`): each key that exists on the target table is compiled via
   `compileRelCondition("_t"."<col>", val, params)` (same operator set as the main WHERE — see below).
   Keys not on the target are silently ignored.
5. **Raw WHERE** (`opts.whereRaw`): placeholders renumbered by the current `params.length` offset (same
   scheme as the main builder), params pushed.
6. ORDER BY / LIMIT / OFFSET from the options.
7. Wrap by relation type:
   - **hasMany** ⇒ `SELECT COALESCE(json_agg("_t"), '[]'::json) AS "<name>" FROM (<inner>) "_t"` — a JSON array.
   - **belongsTo / hasOne** ⇒ `SELECT row_to_json("_t") AS "<name>" FROM (<inner> LIMIT 1) "_t"` — a single JSON object (`LIMIT 1` is added automatically unless the caller set an explicit `limit`).

So a `hasMany` relation comes back as a JSON array column and a `belongsTo`/`hasOne` as a JSON object
column, both already shaped — no client-side stitching needed.

### `compileRelCondition` (lateral/condition.ts)

A standalone copy of the WHERE operator compiler scoped to relation subqueries. It supports the same
operators as `compileCondition` (eq/neq/gt/gte/lt/lte/like/ilike/in/notIn/isNull/isNotNull/between),
with the same empty-`in`/`notIn` semantics (`FALSE` / `TRUE`) and `null` handling. It shares the parent
query's `params` array so placeholder numbering stays consistent across parent + all lateral joins.

> **Maintenance note:** `compileRelCondition` and `helpers/where/condition.ts` are intentional
> duplicates. Adding an operator means editing **both**.

## JSON descriptor (`buildSelectJson` / `buildRelationDescriptor`)

[`select/json.ts`](../src/query/select/json.ts). The `SelectDescriptor` mirrors the SQL: it carries the
relation tree under `with: RelationDescriptor[]`, each entry recording `relation`, `table`, `type`,
`foreignKey`, `references`, `columns`, `where`, `whereRaw`, `orderBy`, `limit`, `offset`, and nested
`with`. `buildRelationDescriptor` recurses through nested relations, re-running `assertValidRelationMap`
on each level's target model.

## Nesting

Both the SQL (`buildLateralJoin` is invoked per top-level relation; nesting is expressed in the
descriptor) and the descriptor support nested `with`. In the descriptor, nested relations are validated
and resolved against the **target** model at each level.

## Edge cases & gotchas

- **Unknown relation** ⇒ `RelationGuardError` (thrown from `with()`); **unknown relation column** in
  `opts.where` ⇒ silently ignored (filtered against the target's columns), unlike the main WHERE which
  throws on unknown columns.
- **belongsTo/hasOne auto-`LIMIT 1`** unless you set `limit` explicitly — setting `limit` opts out of
  the automatic single-row wrapping behaviour.
- **hasMany empty ⇒ `[]`** (via `COALESCE(json_agg(...), '[]'::json)`), never SQL `NULL`.
- Composite keys are supported (FK/reference are arrays; each pair becomes a join-condition AND term).

## Extending safely

- Keep `compileRelCondition` in sync with the main `compileCondition`.
- New relation kinds must be handled in `resolveModelRelations`, `getModelRelationNames`,
  `buildLateralJoin` (join condition + JSON wrapping), and `buildRelationDescriptor`.
- Preserve the shared-`params` discipline: the lateral subqueries append to the same array, so never
  reset or re-base placeholder numbers inside a join.
