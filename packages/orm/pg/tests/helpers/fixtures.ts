/**
 * Shared test fixtures and fakes for @damatjs/orm-pg unit tests.
 *
 * All models disable the auto-injected timestamp / soft-delete columns
 * (`.timestamps(false).softDelete(false)`) so that the set of "known columns"
 * is exactly the columns we declare — this keeps the generated-SQL assertions
 * deterministic.
 */
import { model, columns } from "@damatjs/orm-model";
import type { ModelDefinition } from "@damatjs/orm-model";

// ─── Models ──────────────────────────────────────────────────────────────────

/** A user model in the "app" schema. */
export const UserModel: ModelDefinition = model(
  "user",
  {
    id: columns.text().primaryKey(),
    email: columns.text().unique(),
    name: columns.text().nullable(),
    age: columns.integer().nullable(),
    verified: columns.boolean().default(false),
    // hasMany relation — resolved lazily to avoid circular init.
    posts: columns.hasMany(() => PostModel).mappedBy("author"),
  },
  { schema: "app" },
)
  .timestamps(false)
  .softDelete(false);

/** A post model in the "app" schema with a belongsTo back to user. */
export const PostModel: ModelDefinition = model(
  "post",
  {
    id: columns.text().primaryKey(),
    title: columns.text(),
    body: columns.text().nullable(),
    published: columns.boolean().default(false),
    // belongsTo author — explicit FK column "author_id" referencing user.id.
    author: columns
      .belongsTo(() => UserModel, { mappedBy: "posts" })
      .link({ foreignKey: "author_id", reference: "id" }),
  },
  { schema: "app" },
)
  .timestamps(false)
  .softDelete(false);

/** A schema-less model (no schema qualifier in generated SQL). */
export const NoSchemaModel: ModelDefinition = model("widget", {
  id: columns.text().primaryKey(),
  label: columns.text(),
})
  .timestamps(false)
  .softDelete(false);

/** A model whose table name contains a double quote — for identifier escaping. */
export const QuotedModel: ModelDefinition = model('we"ird', {
  id: columns.text().primaryKey(),
  'col"x': columns.text(),
})
  .timestamps(false)
  .softDelete(false);

// ─── Fake pg connection / pool ────────────────────────────────────────────────

export interface RecordedCall {
  sql: string;
  params: unknown[];
}

export interface FakeConnOptions {
  /**
   * Canned rows to return. Either a fixed array (used for every query) or a
   * function deciding the response per-call.
   */
  rows?:
    | Record<string, unknown>[]
    | ((sql: string, params: unknown[]) => Record<string, unknown>[]);
  /** When set, `query` throws this error instead of returning. */
  throwOn?: (sql: string) => Error | undefined;
  /** Override rowCount; defaults to rows.length. */
  rowCount?: number | null;
}

/**
 * A fake `Pool | PoolClient` that records every `query()` it receives and
 * returns canned rows. Use `.calls` to assert the SQL + params produced.
 */
export class FakeConn {
  readonly calls: RecordedCall[] = [];
  private opts: FakeConnOptions;

  constructor(opts: FakeConnOptions = {}) {
    this.opts = opts;
  }

  /** Last recorded call (convenience). */
  get last(): RecordedCall {
    return this.calls[this.calls.length - 1]!;
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    this.calls.push({ sql, params });
    const err = this.opts.throwOn?.(sql);
    if (err) throw err;
    const rows =
      typeof this.opts.rows === "function"
        ? this.opts.rows(sql, params)
        : (this.opts.rows ?? []);
    const rowCount =
      this.opts.rowCount !== undefined ? this.opts.rowCount : rows.length;
    return { rows: rows as T[], rowCount };
  }
}

/**
 * A fake `Pool` that hands out a fake `PoolClient` (also a {@link FakeConn})
 * via `connect()`, and records `release()` calls on the client. The pool also
 * supports direct `query()` (used by EntityManager.raw / repository.count).
 */
export class FakePool extends FakeConn {
  readonly client: FakePoolClient;

  constructor(opts: FakeConnOptions = {}) {
    super(opts);
    this.client = new FakePoolClient(opts);
  }

  async connect(): Promise<FakePoolClient> {
    return this.client;
  }
}

export class FakePoolClient extends FakeConn {
  released = 0;
  release(): void {
    this.released += 1;
    this.calls.push({ sql: "<<RELEASE>>", params: [] });
  }
  /** The ordered list of SQL strings issued (excluding the release marker). */
  get sqlLog(): string[] {
    return this.calls.filter((c) => c.sql !== "<<RELEASE>>").map((c) => c.sql);
  }
}

/** A no-op logger satisfying the ILogger shape used by the package. */
export const noopLogger: any = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  log() {},
};

/**
 * A no-op logger satisfying the `QueryLogger` shape expected by the executor /
 * transaction functions (`logQuery`, `logSlowQuery`, `logQueryError`,
 * `logTransaction`). Use this for `pgExecuteRaw` / `pgTransaction`.
 */
export const noopQueryLogger: any = {
  logQuery() {},
  logSlowQuery() {},
  logQueryError() {},
  logTransaction() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
};
