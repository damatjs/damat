# Connection and query types (`src/connection/`, `src/query/`)

Two type groups that have nothing to do with schema _definition_ and everything
to do with talking to the database: how a connection/pool is described, and how a
query is represented as JSON before it is compiled to SQL.

## Connection types (`src/connection/`)

Exported from `connection/index.ts` (`main.ts` + `config.ts`).

### `DbConnection` (`main.ts`)

The connection abstraction every driver implements:

```ts
import type { Pool, PoolClient } from "@damatjs/deps/pg";

export interface DbConnection {
  pool: Pool;
  close: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  getClient: () => Promise<PoolClient>;
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  transaction: <R>(callback: (client: PoolClient) => Promise<R>) => Promise<R>;
  getStats: () => PoolStats;
}
```

`transaction` is the canonical "run this callback inside BEGIN/COMMIT, rolling
back on throw" shape — the driver owns the transaction lifecycle, the caller just
provides the body.

### Pool & status config (`config.ts`)

```ts
export interface DbPoolConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | object;
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export type DbPoolConfigWithExtras = DbPoolConfig & {
  allowExitOnIdle?: boolean;
};

export interface DbConnectionConfig {
  database: string | DbPoolConfig;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}
export interface ConnectionStatus {
  connected: boolean;
  poolStats: PoolStats;
  lastChecked: Date;
}
```

`DbConnectionConfig.database` is a union: pass a connection string _or_ a full
pool config object.

### Transactions & context (`config.ts`)

```ts
export type TransactionIsolationLevel =
  "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";

export interface TransactionOptions {
  isolationLevel?: TransactionIsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
}

export type EntityConstructor<T> = new () => T;

export interface QueryContext {
  schema?: string; // override the target PG schema for one query
  timezone?: string;
  debug?: boolean;
}
```

## Query types (`src/query/`)

Exported from `query/index.ts` (`clauses.ts` + `descriptors.ts`). These describe
a query as data; the query-builder/executor package turns them into SQL.

### Clauses (`clauses.ts`)

```ts
export type WhereOperators =
  | { eq: unknown }
  | { neq: unknown }
  | { gt: unknown }
  | { gte: unknown }
  | { lt: unknown }
  | { lte: unknown }
  | { like: string }
  | { ilike: string }
  | { in: unknown[] }
  | { notIn: unknown[] }
  | { isNull: true }
  | { isNotNull: true }
  | { between: [unknown, unknown] };

export type WhereConditionValue = unknown | WhereOperators;
export type WhereClause<Cols extends string = string> = {
  [K in Cols]?: WhereConditionValue;
};

export interface RawWhereClause {
  sql: string;
  params?: unknown[];
}

export type OrderDirection = "ASC" | "DESC";
export interface OrderByClause {
  column: string;
  direction?: OrderDirection;
  nulls?: "NULLS FIRST" | "NULLS LAST";
}

export interface BuiltQuery {
  sql: string;
  params: unknown[];
}
```

`WhereClause` is generic over the allowed column names so a typed builder can
constrain keys. A condition value is either a bare value (implicit `eq`) or one
of the `WhereOperators` objects. `RawWhereClause` is the parameterised escape
hatch. `BuiltQuery` is the final `{ sql, params }` a builder hands to the driver.

### Descriptors (`descriptors.ts`)

JSON-serializable, discriminated-by-`type` representations of each operation:

```ts
export interface SelectDescriptor {
  type: "select";
  table: string;
  schema?: string;
  columns: string[];
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  limit?: number;
  offset?: number;
  distinct: boolean;
  with?: RelationDescriptor[]; // nested relation loads
}

export interface RelationDescriptor {
  relation: string;
  table: string;
  schema?: string;
  type: "belongsTo" | "hasMany" | "hasOne";
  foreignKey: string[];
  references: string[];
  columns: string[];
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  limit?: number;
  offset?: number;
  with: RelationDescriptor[]; // recursive — eager-load trees
}

export interface InsertDescriptor {
  type: "insert";
  table: string;
  schema?: string;
  rows: Record<string, unknown>[];
  onConflict?: {
    conflictColumns?: string[];
    action: "nothing" | "update";
    set?: Record<string, unknown>;
  };
  returning: string[];
}

export interface UpdateDescriptor {
  type: "update";
  table: string;
  schema?: string;
  set: Record<string, unknown>;
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  orderBy: OrderByJson[];
  returning: string[];
}

export interface DeleteDescriptor {
  type: "delete";
  table: string;
  schema?: string;
  where: WhereConditionJson[];
  whereRaw: RawWhereClause[];
  returning: string[];
}

export interface UpsertDescriptor {
  type: "upsert";
  table: string;
  schema?: string;
  rows: Record<string, unknown>[];
  conflictColumns: string[];
  updateColumns?: string[];
  set?: Record<string, unknown>;
  returning: string[];
}

export type QueryDescriptor =
  | SelectDescriptor
  | InsertDescriptor
  | UpdateDescriptor
  | DeleteDescriptor
  | UpsertDescriptor;

// Serializable counterparts of the clause types
export type WhereConditionJson = { [column: string]: WhereConditionValue };
export interface OrderByJson {
  column: string;
  direction?: OrderDirection;
  nulls?: "NULLS FIRST" | "NULLS LAST";
}
```

Notes:

- `RelationDescriptor.with` is recursive — it models an eager-load tree of nested
  relations. `SelectDescriptor.with` is the root of that tree.
- There are two upsert paths: `InsertDescriptor.onConflict` (insert-with-conflict)
  and the dedicated `UpsertDescriptor`. Both exist; pick based on the builder API
  you are wiring.
- `WhereConditionJson` / `OrderByJson` are the descriptor-embedded (plain object)
  forms; `WhereClause` / `OrderByClause` in `clauses.ts` are the builder-facing
  forms. Keep them aligned when adding operators or order options.

## Editing checklist

- New where operator → add to `WhereOperators` (clauses) _and_ ensure
  `WhereConditionJson`/`WhereConditionValue` still cover it, then implement
  compilation in the query builder.
- New query operation → add a `*Descriptor` interface and add it to the
  `QueryDescriptor` union, then handle the new `type` in the executor.
- New connection capability → extend `DbConnection` and update every driver
  implementation (`@damatjs/orm-pg`, `@damatjs/orm-connector`).
