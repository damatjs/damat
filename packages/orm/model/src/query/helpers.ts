import { ColumnSchema } from "@/types";
import {
  BuiltQuery,
  OrderByClause,
  RawWhereClause,
  WhereClause,
  WhereConditionValue,
  WhereOperators,
} from "./types";

// ─── Table reference ──────────────────────────────────────────────────────────

/**
 * Resolved table + optional schema identifier, used internally by SQL builders.
 */
export interface TableRef {
  /** PostgreSQL schema name (e.g. `"store"`). Omitted → default search_path. */
  schema?: string;
  /** Table name (e.g. `"user"`). */
  name: string;
}

// ─── Identifier quoting ───────────────────────────────────────────────────────

/**
 * Double-quote a single SQL identifier, escaping embedded double-quotes.
 * e.g.  `user` → `"user"`,  `my"col` → `"my""col"`
 */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Build the fully-qualified table reference string.
 * e.g.  `{ schema: "store", name: "user" }` → `"store"."user"`
 */
export function buildTableRef(ref: TableRef): string {
  return ref.schema
    ? `${quoteIdent(ref.schema)}.${quoteIdent(ref.name)}`
    : quoteIdent(ref.name);
}

// ─── Column validation ────────────────────────────────────────────────────────

/** Build a `Set<string>` of every column name from a `ColumnSchema[]`. */
export function columnNameSet(columns: ColumnSchema[]): Set<string> {
  return new Set(columns.map((c) => c.name));
}

/**
 * Assert every key in `obj` is a known column — throws a descriptive error if
 * not.  The error message lists all valid column names.
 */
export function assertKnownColumns(
  obj: Record<string, unknown>,
  known: Set<string>,
  context: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) {
      throw new Error(
        `[query:${context}] Unknown column "${key}". ` +
          `Known columns: ${[...known].join(", ")}`,
      );
    }
  }
}

/** Assert every name in an array is a known column. */
export function assertKnownColumnList(
  names: string[],
  known: Set<string>,
  context: string,
): void {
  for (const name of names) {
    if (!known.has(name)) {
      throw new Error(
        `[query:${context}] Unknown column "${name}". ` +
          `Known columns: ${[...known].join(", ")}`,
      );
    }
  }
}

// ─── WHERE builder ────────────────────────────────────────────────────────────

/** Detect whether `v` is a WhereOperators object rather than a plain scalar. */
function isOperatorObject(v: WhereConditionValue): v is WhereOperators {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const validOps = new Set([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
    "between",
  ]);
  const keys = Object.keys(v as object);
  return keys.length > 0 && keys.every((k) => validOps.has(k));
}

/**
 * Compile one WHERE condition for a quoted column identifier + value.
 * Values are pushed onto `params`; the returned string uses `$N` placeholders.
 */
function compileCondition(
  col: string,
  val: WhereConditionValue,
  params: unknown[],
): string {
  if (!isOperatorObject(val)) {
    // Plain scalar — equality (null → IS NULL)
    if (val === null) return `${col} IS NULL`;
    params.push(val);
    return `${col} = $${params.length}`;
  }

  const op = val as Record<string, unknown>;
  const parts: string[] = [];

  if ("eq" in op) {
    if (op.eq === null) {
      parts.push(`${col} IS NULL`);
    } else {
      params.push(op.eq);
      parts.push(`${col} = $${params.length}`);
    }
  }
  if ("neq" in op) {
    if (op.neq === null) {
      parts.push(`${col} IS NOT NULL`);
    } else {
      params.push(op.neq);
      parts.push(`${col} <> $${params.length}`);
    }
  }
  if ("gt" in op) {
    params.push(op.gt);
    parts.push(`${col} > $${params.length}`);
  }
  if ("gte" in op) {
    params.push(op.gte);
    parts.push(`${col} >= $${params.length}`);
  }
  if ("lt" in op) {
    params.push(op.lt);
    parts.push(`${col} < $${params.length}`);
  }
  if ("lte" in op) {
    params.push(op.lte);
    parts.push(`${col} <= $${params.length}`);
  }
  if ("like" in op) {
    params.push(op.like);
    parts.push(`${col} LIKE $${params.length}`);
  }
  if ("ilike" in op) {
    params.push(op.ilike);
    parts.push(`${col} ILIKE $${params.length}`);
  }

  if ("in" in op) {
    const arr = op.in as unknown[];
    if (arr.length === 0) {
      parts.push("FALSE");
    } else {
      const ph = arr.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      parts.push(`${col} IN (${ph.join(", ")})`);
    }
  }
  if ("notIn" in op) {
    const arr = op.notIn as unknown[];
    if (arr.length === 0) {
      parts.push("TRUE");
    } else {
      const ph = arr.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      parts.push(`${col} NOT IN (${ph.join(", ")})`);
    }
  }
  if ("isNull" in op) parts.push(`${col} IS NULL`);
  if ("isNotNull" in op) parts.push(`${col} IS NOT NULL`);

  if ("between" in op) {
    const [lo, hi] = op.between as [unknown, unknown];
    params.push(lo);
    const loIdx = params.length;
    params.push(hi);
    const hiIdx = params.length;
    parts.push(`${col} BETWEEN $${loIdx} AND $${hiIdx}`);
  }

  return parts.join(" AND ");
}

/**
 * Build the full WHERE clause, populating `params` as a side-effect.
 * Returns an empty string when there are no conditions.
 */
export function buildWhereClause(
  whereClauses: WhereClause[],
  rawClauses: RawWhereClause[],
  params: unknown[],
  known: Set<string>,
): string {
  const fragments: string[] = [];

  for (const clause of whereClauses) {
    assertKnownColumns(clause as Record<string, unknown>, known, "where");
    for (const [col, val] of Object.entries(clause)) {
      fragments.push(compileCondition(quoteIdent(col), val, params));
    }
  }

  for (const raw of rawClauses) {
    // Re-number $1, $2, … in the raw fragment to continue from the current params length
    const offset = params.length;
    const renumbered = raw.sql.replace(
      /\$(\d+)/g,
      (_, n: string) => `$${parseInt(n, 10) + offset}`,
    );
    if (raw.params) params.push(...raw.params);
    fragments.push(renumbered);
  }

  if (fragments.length === 0) return "";
  return `WHERE ${fragments.join(" AND ")}`;
}

// ─── ORDER BY builder ─────────────────────────────────────────────────────────

/** Build the ORDER BY clause, or return "" when `clauses` is empty. */
export function buildOrderByClause(clauses: OrderByClause[]): string {
  if (clauses.length === 0) return "";
  const parts = clauses.map((c) => {
    let s = quoteIdent(c.column);
    if (c.direction) s += ` ${c.direction}`;
    if (c.nulls) s += ` ${c.nulls}`;
    return s;
  });
  return `ORDER BY ${parts.join(", ")}`;
}

// ─── RETURNING builder ────────────────────────────────────────────────────────

/**
 * Build a `RETURNING` clause.
 * An empty `cols` array → `RETURNING *`.
 */
export function buildReturningClause(cols: string[]): string {
  if (cols.length === 0) return "RETURNING *";
  return `RETURNING ${cols.map(quoteIdent).join(", ")}`;
}

// ─── Final assembly ───────────────────────────────────────────────────────────

/** Filter out empty strings and join the remaining parts with a single space. */
export function joinSqlParts(parts: string[]): string {
  return parts.filter((p) => p.length > 0).join(" ");
}

/**
 * Assemble the final `BuiltQuery` from SQL parts and accumulated params.
 */
export function assembleQuery(parts: string[], params: unknown[]): BuiltQuery {
  return { sql: joinSqlParts(parts), params };
}

// ─── Public generateSql helper ────────────────────────────────────────────────

/**
 * Standalone helper that calls `.generateSql()` on any query builder and
 * returns the `BuiltQuery`.
 *
 * This is the intended entry-point for the execution layer — it never holds a
 * database connection itself.
 *
 * @example
 * ```ts
 * const q = generateSql(
 *   new SelectBuilder(UserSchema).columns(["id", "email"]).where({ verified: true })
 * );
 * // Pass q.sql + q.params to your database driver
 * ```
 */
export function generateSql(builder: {
  generateSql(): BuiltQuery;
}): BuiltQuery {
  return builder.generateSql();
}
