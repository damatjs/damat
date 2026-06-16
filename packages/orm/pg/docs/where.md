# WHERE compilation

Sources: [`src/query/helpers/where/builder.ts`](../src/query/helpers/where/builder.ts),
[`src/query/helpers/where/condition.ts`](../src/query/helpers/where/condition.ts).
Relation-scoped WHERE compilation (`compileRelCondition`) lives in
[`src/query/select/lateral/condition.ts`](../src/query/select/lateral/condition.ts) and is covered in
[relations.md](./relations.md).

This is where object-style conditions become parameterised SQL. Two kinds of clause exist: **object**
clauses (`WhereClause`) and **raw** clauses (`RawWhereClause`).

## Types

```ts
type WhereOperators =
  | { eq: unknown } | { neq: unknown }
  | { gt: unknown } | { gte: unknown } | { lt: unknown } | { lte: unknown }
  | { like: string } | { ilike: string }
  | { in: unknown[] } | { notIn: unknown[] }
  | { isNull: true } | { isNotNull: true }
  | { between: [unknown, unknown] };

type WhereConditionValue = unknown | WhereOperators;
type WhereClause<Cols> = { [K in Cols]?: WhereConditionValue };

interface RawWhereClause { sql: string; params?: unknown[] }
```

A column maps either to a plain value (equality) or to an operator object.

## `buildWhereClause`

```ts
function buildWhereClause(
  whereClauses: WhereClause[],   // object-style (each may carry multiple columns)
  rawClauses: RawWhereClause[],  // raw SQL fragments
  params: unknown[],             // mutated in place — placeholders appended
  known: Set<string>,            // model's known column names
): string
```

Behaviour:

1. For each object clause: `assertKnownColumns(clause, known, "where")` (throws on unknown columns),
   then compile each `[col, val]` entry via `compileCondition(quoteIdent(col), val, params)`.
2. For each raw clause: renumber its `$N` placeholders by the current `params.length` offset, push its
   params, and append the (renumbered) SQL.
3. Join all fragments with `" AND "`; return `""` if there are none, else `WHERE <fragments>`.

**Combining is always AND.** Multiple columns in one clause, multiple clauses, and raw clauses are all
AND-ed together. There is no OR combinator at this layer — express OR via a `whereRaw` fragment.

### Raw clause placeholder renumbering

```ts
const offset = params.length;
const renumbered = raw.sql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + offset}`);
if (raw.params) params.push(...raw.params);
```

A raw fragment writes its placeholders as if it started at `$1`; the builder shifts them by however
many params already exist so they line up with the shared `params` array. Example:

```ts
b.where({ verified: true });                          // → $1
b.whereRaw({ sql: "age > $1", params: [18] });        // → renumbered to "age > $2"
// WHERE "verified" = $1 AND age > $2     params: [true, 18]
```

> **Gotcha:** placeholder counts in a raw clause must match the length of its `params`, and they must
> be written `$1..$n` from one (the renumberer assumes a per-fragment base). Mismatches produce
> malformed SQL or wrong parameter binding.

## `compileCondition` — operator → SQL

```ts
function compileCondition(col: string, val: WhereConditionValue, params: unknown[]): string
```

`col` is already quoted by the caller. Logic:

- **Not an operator object** (`isOperatorObject` is false): `null` ⇒ `<col> IS NULL`; otherwise push
  the value and emit `<col> = $N` (plain equality).
- **Operator object**: each recognised key contributes a fragment, AND-ed together.

| Operator | SQL | Notes |
| --- | --- | --- |
| `eq` | `= $N` (or `IS NULL` if value is `null`) | |
| `neq` | `<> $N` (or `IS NOT NULL` if value is `null`) | |
| `gt` / `gte` / `lt` / `lte` | `> / >= / < / <= $N` | |
| `like` / `ilike` | `LIKE / ILIKE $N` | |
| `in` | `IN ($N, …)`; empty array ⇒ `FALSE` | empty `in` matches nothing |
| `notIn` | `NOT IN ($N, …)`; empty array ⇒ `TRUE` | empty `notIn` matches everything |
| `isNull` | `IS NULL` | value ignored |
| `isNotNull` | `IS NOT NULL` | value ignored |
| `between` | `BETWEEN $lo AND $hi` | two params |

`isOperatorObject` (condition.ts) returns true only when the value is a non-null, non-array object
whose keys are **all** in the known-operator set and non-empty. This means an object that mixes a valid
operator with an unknown key is treated as a **plain value** (full equality against the object), not an
operator object — a subtle footgun.

### Multiple operators on one column

```ts
where: { age: { gte: 18, lt: 65 } }
// "age" >= $1 AND "age" < $2
```

All operator keys present on the object are emitted and AND-ed in a fixed order
(eq, neq, gt, gte, lt, lte, like, ilike, in, notIn, isNull, isNotNull, between).

## Worked examples

```ts
where: { email: "a@b.com" }
// "email" = $1                                params: ["a@b.com"]

where: { name: null }
// "name" IS NULL                              params: []

where: { verified: true, role: { in: ["admin", "owner"] } }
// "verified" = $1 AND "role" IN ($2, $3)      params: [true, "admin", "owner"]

where: { id: { notIn: [] } }
// TRUE                                        params: []   (empty notIn matches all)

where: { score: { between: [10, 20] } }
// "score" BETWEEN $1 AND $2                   params: [10, 20]
```

## Edge cases & gotchas

- **Empty `in` ⇒ `FALSE`; empty `notIn` ⇒ `TRUE`.** Intentional and SQL-safe (avoids `IN ()`).
- **`null` is special.** Plain `null` and `{ eq: null }` / `{ neq: null }` map to `IS [NOT] NULL`.
  To match a column literally against a JSON `null` value you'd need a raw clause.
- **Only AND.** Combine via multiple keys/clauses; use `whereRaw` for OR / complex predicates.
- **Object-as-value pitfall:** a value object with any non-operator key is treated as plain equality
  against the whole object, not as operators.

## Extending safely

- To add an operator: add its key to the `validOps` set in `isOperatorObject` and add a matching
  branch in `compileCondition` (and in `compileRelCondition` for relation WHEREs). Always push values
  to `params` and emit `$${params.length}`.
- Keep `condition.ts` and the relation `condition.ts` in sync — they intentionally mirror each other.
- Update `WhereOperators` in `@damatjs/orm-type` so the public type reflects the new operator.
