import { ModelDefinition } from "@/schema/model";
import {
  BuiltQuery,
  RelationDescriptor,
  SelectDescriptor,
  WhereConditionJson,
  OrderByJson,
  RawWhereClause,
} from "./types";
import {
  assembleQuery,
  quoteIdent,
  buildTableRef,
  buildOrderByClause,
} from "./helpers";
import { QueryBase } from "./base";
import {
  RelationIncludeMap,
  RelationIncludeOptions,
  assertValidRelationMap,
  resolveModelRelations,
  ResolvedRelation,
} from "./relations";

// ─── SelectBuilder ────────────────────────────────────────────────────────────

/**
 * Fluent builder for `SELECT` queries.
 *
 * ### Usage
 * ```ts
 * const q = new SelectBuilder(UserSchema)
 *   .columns(["id", "email", "name"])
 *   .where({ verified: true, age: { gte: 18 } })
 *   .orderBy("name", "ASC")
 *   .limit(20)
 *   .offset(40)
 *   .generateSql();
 *
 * // q.sql    → SELECT "id", "email", "name" FROM "store"."user"
 * //            WHERE "verified" = $1 AND "age" >= $2
 * //            ORDER BY "name" ASC
 * //            LIMIT 20 OFFSET 40
 * // q.params → [true, 18]
 * ```
 *
 * ### Relation loading (schema-guarded)
 * ```ts
 * const q = new SelectBuilder(UserSchema)
 *   .columns(["id", "email"])
 *   .with({
 *     orders: {                          // ← must exist on UserSchema
 *       select: ["id", "total"],
 *       where: { status: "pending" },
 *       limit: 10,
 *       with: {
 *         items: {                       // ← must exist on OrderSchema
 *           select: ["id", "quantity"],
 *         }
 *       }
 *     }
 *   })
 *   .generateSql();
 * // → SELECT "id", "email",
 * //     "_rel_orders"."orders"
 * //   FROM "store"."user"
 * //   LEFT JOIN LATERAL (
 * //     SELECT COALESCE(json_agg(_t.*), '[]'::json) AS "orders"
 * //     FROM (
 * //       SELECT "id", "total" FROM "order"
 * //       WHERE "user_id" = "store"."user"."id"
 * //         AND "status" = $1
 * //       LIMIT 10
 * //     ) _t
 * //   ) "_rel_orders" ON TRUE
 * ```
 *
 * ### Guard behaviour
 * ```ts
 * new SelectBuilder(UserSchema).with({ bogus: true });
 * // throws RelationGuardError:
 * //   [query:with] Unknown relation "bogus" on model "user".
 * //     Available relations: orders, profile
 * ```
 *
 * ### Generic column-name narrowing (with codegen)
 * ```ts
 * type UserCols = "id" | "email" | "name" | "age" | "verified" | "created_at" | "updated_at";
 * const q = new SelectBuilder<UserCols>(UserSchema);
 * q.columns(["id", "typo"]);  // ← TypeScript error — "typo" not assignable to UserCols
 * ```
 */
export class SelectBuilder<
  Cols extends string = string,
> extends QueryBase<Cols> {
  private _cols: string[] = []; // empty → SELECT *
  private _distinct = false;
  private _limit?: number;
  private _offset?: number;
  private _withRelations: Map<string, RelationIncludeOptions> = new Map();
  protected readonly _model: ModelDefinition;

  constructor(model: ModelDefinition) {
    super(model);
    this._model = model;
  }

  // ─── Column selection ──────────────────────────────────────────────────────

  /**
   * Choose which columns to return.
   *
   * Every name is validated against the model's schema.  Calling with an empty
   * array (or not calling at all) produces `SELECT *`.
   *
   * ```ts
   * .columns(["id", "email", "name"])
   * ```
   */
  columns(cols: Cols[]): this {
    this._assertColList(cols as string[], "select.columns");
    this._cols = cols as string[];
    return this;
  }

  // ─── DISTINCT ──────────────────────────────────────────────────────────────

  /**
   * Add `DISTINCT` to the SELECT keyword.
   * ```ts
   * .distinct()
   * ```
   */
  distinct(): this {
    this._distinct = true;
    return this;
  }

  // ─── LIMIT / OFFSET ────────────────────────────────────────────────────────

  /**
   * Limit the number of returned rows.
   * ```ts
   * .limit(10)
   * ```
   */
  limit(n: number): this {
    if (!Number.isInteger(n) || n < 0)
      throw new Error(
        `[query:select.limit] Expected non-negative integer, got ${n}`,
      );
    this._limit = n;
    return this;
  }

  /**
   * Skip the first N rows.
   * ```ts
   * .offset(20)
   * ```
   */
  offset(n: number): this {
    if (!Number.isInteger(n) || n < 0)
      throw new Error(
        `[query:select.offset] Expected non-negative integer, got ${n}`,
      );
    this._offset = n;
    return this;
  }

  // ─── WITH (Relation Loading) ───────────────────────────────────────────────

  /**
   * Include related data in the query result (Drizzle-style).
   *
   * **Schema guard**: every key in `relations` must match a relation property
   * (`belongsTo`, `hasMany`, or `hasOne`) declared on the model.  An unknown
   * name throws `RelationGuardError` immediately — before any SQL is built.
   *
   * The SQL is extended with LEFT JOIN LATERAL subqueries to fetch nested data
   * in a single round trip.  Relations can be nested as deep as needed.
   *
   * ```ts
   * .with({
   *   orders: {
   *     select: ["id", "total"],
   *     where: { status: "pending" },
   *     limit: 10,
   *     with: {
   *       items: {
   *         select: ["id", "quantity"],
   *         with: {
   *           product: { select: ["id", "name", "price"] }
   *         }
   *       }
   *     }
   *   }
   * })
   * ```
   *
   * Pass `true` to include a relation with default options:
   * ```ts
   * .with({ orders: true, profile: true })
   * ```
   */
  with(relations: RelationIncludeMap): this {
    // ── Guard: validate all keys against the model's relation properties ────
    assertValidRelationMap(this._model, relations);

    for (const [name, opts] of Object.entries(relations)) {
      if (opts === false) continue; // skip explicitly disabled relations
      const options: RelationIncludeOptions = opts === true ? {} : opts;
      this._withRelations.set(name, options);
    }
    return this;
  }

  // ─── generateSql ──────────────────────────────────────────────────────────

  /**
   * Compile the builder state into a parameterised `{ sql, params }` object.
   *
   * When relations are included via `.with()`, the query is extended with
   * LEFT JOIN LATERAL subqueries (one per relation).
   *
   * ```ts
   * const { sql, params } = new SelectBuilder(UserSchema)
   *   .columns(["id"])
   *   .where({ id: "usr_1" })
   *   .generateSql();
   * ```
   */
  generateSql(): BuiltQuery {
    const params: unknown[] = [];

    const keyword = this._distinct ? "SELECT DISTINCT" : "SELECT";

    // Resolve relations if any are requested
    const hasRelations = this._withRelations.size > 0;
    const resolvedRelations = hasRelations
      ? resolveModelRelations(this._model)
      : new Map<string, ResolvedRelation>();

    // Parent table alias for lateral join references
    const parentAlias = `_p`;
    const parentRef = hasRelations
      ? `${this._table()} ${quoteIdent(parentAlias)}`
      : this._table();

    // Build the SELECT column list (plain columns + lateral join columns)
    let colList: string;
    if (this._cols.length > 0) {
      const plainCols = this._cols.map((c) =>
        hasRelations
          ? `${quoteIdent(parentAlias)}.${quoteIdent(c)}`
          : quoteIdent(c),
      );
      if (hasRelations) {
        const relCols = [...this._withRelations.keys()].map(
          (name) => `${quoteIdent(`_rel_${name}`)}.${quoteIdent(name)}`,
        );
        colList = [...plainCols, ...relCols].join(", ");
      } else {
        colList = plainCols.join(", ");
      }
    } else {
      if (hasRelations) {
        const relCols = [...this._withRelations.keys()].map(
          (name) => `${quoteIdent(`_rel_${name}`)}.${quoteIdent(name)}`,
        );
        colList = [`${quoteIdent(parentAlias)}.*`, ...relCols].join(", ");
      } else {
        colList = "*";
      }
    }

    // Build the WHERE clause (qualified with parent alias when lateral joins exist)
    const whereStr = this._buildWhere(params);

    // Build lateral join fragments
    const lateralJoins: string[] = [];
    if (hasRelations) {
      for (const [relName, relOpts] of this._withRelations) {
        const resolved = resolvedRelations.get(relName);
        if (!resolved) continue; // guard already validated, should not happen

        const joinSql = this._buildLateralJoin(
          relName,
          resolved,
          relOpts,
          parentAlias,
          params,
        );
        lateralJoins.push(joinSql);
      }
    }

    const parts = [
      `${keyword} ${colList}`,
      `FROM ${parentRef}`,
      ...lateralJoins,
      whereStr,
      this._buildOrderBy(),
      this._limit !== undefined ? `LIMIT ${this._limit}` : "",
      this._offset !== undefined ? `OFFSET ${this._offset}` : "",
    ];

    return assembleQuery(parts, params);
  }

  // ─── Lateral join builder ─────────────────────────────────────────────────

  /**
   * Build a single LEFT JOIN LATERAL fragment for a resolved relation.
   *
   * ```sql
   * -- belongsTo:
   * LEFT JOIN LATERAL (
   *   SELECT row_to_json(_t) AS "user"
   *   FROM "store"."user" _t
   *   WHERE _t."id" = _p."user_id"
   *   LIMIT 1
   * ) "_rel_user" ON TRUE
   *
   * -- hasMany / hasOne:
   * LEFT JOIN LATERAL (
   *   SELECT COALESCE(json_agg(_t), '[]'::json) AS "orders"
   *   FROM (
   *     SELECT "id", "total" FROM "store"."order"
   *     WHERE "user_id" = _p."id"
   *     AND "status" = $N
   *     LIMIT 10
   *   ) _t
   * ) "_rel_orders" ON TRUE
   * ```
   */
  private _buildLateralJoin(
    relName: string,
    resolved: ResolvedRelation,
    opts: RelationIncludeOptions,
    parentAlias: string,
    params: unknown[],
  ): string {
    const targetRef = buildTableRef({
      name: resolved.target._tableName,
      ...(resolved.target._schemaName !== undefined
        ? { schema: resolved.target._schemaName }
        : {}),
    });
    const outerAlias = quoteIdent(`_rel_${relName}`);
    const innerAlias = `_t`;

    // ── Inner column list ──────────────────────────────────────────────────
    const innerCols =
      opts.select && opts.select.length > 0
        ? opts.select.map(quoteIdent).join(", ")
        : "*";

    // ── Inner WHERE (join condition + user filters) ────────────────────────
    const joinCondParts: string[] = [];

    if (resolved.type === "belongsTo") {
      // Parent holds FK → target holds PK
      // WHERE target."<references[i]>" = parent."<foreignKey[i]>"
      for (let i = 0; i < resolved.foreignKey.length; i++) {
        const fkCol = resolved.foreignKey[i]!;
        const refCol = resolved.references[i]!;
        joinCondParts.push(
          `${quoteIdent(innerAlias)}.${quoteIdent(refCol)} = ${quoteIdent(parentAlias)}.${quoteIdent(fkCol)}`,
        );
      }
    } else {
      // hasMany / hasOne: target holds FK → parent holds PK
      // WHERE target."<foreignKey[i]>" = parent."<references[i]>"
      for (let i = 0; i < resolved.foreignKey.length; i++) {
        const fkCol = resolved.foreignKey[i]!;
        const refCol = resolved.references[i]!;
        joinCondParts.push(
          `${quoteIdent(innerAlias)}.${quoteIdent(fkCol)} = ${quoteIdent(parentAlias)}.${quoteIdent(refCol)}`,
        );
      }
    }

    // User-supplied WHERE filters on the relation
    const userWhereClauses = opts.where
      ? [opts.where as Record<string, unknown>]
      : [];
    const userRawWhere: RawWhereClause[] = opts.whereRaw
      ? Array.isArray(opts.whereRaw)
        ? opts.whereRaw
        : [opts.whereRaw]
      : [];

    // Build user WHERE using a temporary known-cols set (permissive for relations)
    const targetCols = new Set(
      resolved.target.toTableSchema().columns.map((c) => c.name),
    );
    const userWhereParts: string[] = [];
    for (const clause of userWhereClauses) {
      for (const [col, val] of Object.entries(clause)) {
        if (targetCols.has(col)) {
          const colSql = `${quoteIdent(innerAlias)}.${quoteIdent(col)}`;
          userWhereParts.push(_compileRelCondition(colSql, val, params));
        }
      }
    }
    for (const raw of userRawWhere) {
      const offset = params.length;
      const renumbered = raw.sql.replace(
        /\$(\d+)/g,
        (_, n: string) => `$${parseInt(n, 10) + offset}`,
      );
      if (raw.params) params.push(...raw.params);
      userWhereParts.push(renumbered);
    }

    const allWhereParts = [...joinCondParts, ...userWhereParts];
    const whereClause =
      allWhereParts.length > 0 ? `WHERE ${allWhereParts.join(" AND ")}` : "";

    // ── ORDER BY ──────────────────────────────────────────────────────────
    const orderByClause =
      opts.orderBy && opts.orderBy.length > 0
        ? buildOrderByClause(
            opts.orderBy.map((o) => {
              const clause: import("./types").OrderByClause = {
                column: o.column as string,
              };
              if (o.direction !== undefined) clause.direction = o.direction;
              if (o.nulls !== undefined) clause.nulls = o.nulls;
              return clause;
            }),
          )
        : "";

    // ── LIMIT / OFFSET ────────────────────────────────────────────────────
    const limitClause = opts.limit !== undefined ? `LIMIT ${opts.limit}` : "";
    const offsetClause =
      opts.offset !== undefined ? `OFFSET ${opts.offset}` : "";

    // ── Assemble inner SELECT ─────────────────────────────────────────────
    const innerParts = [
      `SELECT ${innerCols}`,
      `FROM ${targetRef} ${quoteIdent(innerAlias)}`,
      whereClause,
      orderByClause,
      limitClause,
      offsetClause,
    ]
      .filter((p) => p.length > 0)
      .join(" ");

    // ── Wrap in aggregation based on type ─────────────────────────────────
    let lateralBody: string;
    if (resolved.type === "hasMany") {
      // Array: COALESCE(json_agg(_t), '[]'::json)
      lateralBody =
        `SELECT COALESCE(json_agg(${quoteIdent(innerAlias)}), '[]'::json) AS ${quoteIdent(relName)} ` +
        `FROM (${innerParts}) ${quoteIdent(innerAlias)}`;
    } else {
      // Single row: row_to_json or NULL
      // Add LIMIT 1 to the inner query for safety if not already set
      const innerWithLimit =
        opts.limit !== undefined ? innerParts : `${innerParts} LIMIT 1`;
      lateralBody =
        `SELECT row_to_json(${quoteIdent(innerAlias)}) AS ${quoteIdent(relName)} ` +
        `FROM (${innerWithLimit}) ${quoteIdent(innerAlias)}`;
    }

    return `LEFT JOIN LATERAL (${lateralBody}) ${outerAlias} ON TRUE`;
  }

  // ─── generateJson ─────────────────────────────────────────────────────────

  /**
   * Produce a structured `SelectDescriptor` describing this query without
   * generating a SQL string.
   *
   * Relation includes (`.with()`) are reflected in the `with` field of the
   * descriptor as `RelationDescriptor[]`.
   *
   * ```ts
   * const json = new SelectBuilder(UserSchema)
   *   .columns(["id", "email"])
   *   .where({ verified: true })
   *   .generateJson();
   * // json.type    → "select"
   * // json.columns → ["id", "email"]
   * // json.where   → [{ verified: true }]
   * ```
   */
  generateJson(): SelectDescriptor {
    const desc: SelectDescriptor = {
      type: "select",
      table: this._tableRef.name,
      columns: [...this._cols],
      where: this._whereClauses.map((c) => ({
        ...c,
      })) as WhereConditionJson[],
      whereRaw: this._rawWhereClauses.map((c) => ({ ...c })),
      orderBy: this._orderByClauses.map((c) => ({ ...c })) as OrderByJson[],
      distinct: this._distinct,
    };
    if (this._tableRef.schema !== undefined)
      desc.schema = this._tableRef.schema;
    if (this._limit !== undefined) desc.limit = this._limit;
    if (this._offset !== undefined) desc.offset = this._offset;

    // ── Populate relation descriptors ────────────────────────────────────
    if (this._withRelations.size > 0) {
      const resolvedRelations = resolveModelRelations(this._model);
      const withDescs: RelationDescriptor[] = [];

      for (const [relName, relOpts] of this._withRelations) {
        const resolved = resolvedRelations.get(relName);
        if (!resolved) continue;

        const relDesc = this._buildRelationDescriptor(
          relName,
          resolved,
          relOpts,
        );
        withDescs.push(relDesc);
      }

      desc.with = withDescs;
    }

    return desc;
  }

  // ─── Relation descriptor builder ──────────────────────────────────────────

  private _buildRelationDescriptor(
    relName: string,
    resolved: ResolvedRelation,
    opts: RelationIncludeOptions,
  ): RelationDescriptor {
    const targetSchema = resolved.target._schemaName;
    const relDesc: RelationDescriptor = {
      relation: relName,
      table: resolved.target._tableName,
      type: resolved.type,
      foreignKey: resolved.foreignKey,
      references: resolved.references,
      columns: opts.select ? [...(opts.select as string[])] : [],
      where: opts.where ? [{ ...(opts.where as Record<string, unknown>) }] : [],
      whereRaw: opts.whereRaw
        ? Array.isArray(opts.whereRaw)
          ? opts.whereRaw.map((r) => ({ ...r }))
          : [{ ...opts.whereRaw }]
        : [],
      orderBy: opts.orderBy
        ? opts.orderBy.map((o) => ({ ...o, column: o.column as string }))
        : [],
      with: [],
    };
    if (targetSchema !== undefined) relDesc.schema = targetSchema;
    if (opts.limit !== undefined) relDesc.limit = opts.limit;
    if (opts.offset !== undefined) relDesc.offset = opts.offset;

    // Recurse into nested with
    if (opts.with && Object.keys(opts.with).length > 0) {
      // Guard nested relations against the target model
      assertValidRelationMap(resolved.target, opts.with);
      const nestedResolved = resolveModelRelations(resolved.target);

      for (const [nestedName, nestedOpts] of Object.entries(opts.with)) {
        if (nestedOpts === false) continue;
        const nestedResolution = nestedResolved.get(nestedName);
        if (!nestedResolution) continue;

        const nestedOptions: RelationIncludeOptions =
          nestedOpts === true ? {} : nestedOpts;
        relDesc.with.push(
          this._buildRelationDescriptor(
            nestedName,
            nestedResolution,
            nestedOptions,
          ),
        );
      }
    }

    return relDesc;
  }
}

// ─── Internal: compile a single WHERE condition for lateral joins ─────────────

/**
 * Compiles a column condition for use inside lateral join subqueries.
 * Mirrors the logic in helpers.ts but accepts a pre-quoted column expression.
 */
function _compileRelCondition(
  colExpr: string,
  val: unknown,
  params: unknown[],
): string {
  if (val === null) return `${colExpr} IS NULL`;

  if (val !== null && typeof val === "object" && !Array.isArray(val)) {
    const op = val as Record<string, unknown>;
    const parts: string[] = [];

    if ("eq" in op) {
      if (op.eq === null) parts.push(`${colExpr} IS NULL`);
      else {
        params.push(op.eq);
        parts.push(`${colExpr} = $${params.length}`);
      }
    }
    if ("neq" in op) {
      if (op.neq === null) parts.push(`${colExpr} IS NOT NULL`);
      else {
        params.push(op.neq);
        parts.push(`${colExpr} <> $${params.length}`);
      }
    }
    if ("gt" in op) {
      params.push(op.gt);
      parts.push(`${colExpr} > $${params.length}`);
    }
    if ("gte" in op) {
      params.push(op.gte);
      parts.push(`${colExpr} >= $${params.length}`);
    }
    if ("lt" in op) {
      params.push(op.lt);
      parts.push(`${colExpr} < $${params.length}`);
    }
    if ("lte" in op) {
      params.push(op.lte);
      parts.push(`${colExpr} <= $${params.length}`);
    }
    if ("like" in op) {
      params.push(op.like);
      parts.push(`${colExpr} LIKE $${params.length}`);
    }
    if ("ilike" in op) {
      params.push(op.ilike);
      parts.push(`${colExpr} ILIKE $${params.length}`);
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
        parts.push(`${colExpr} IN (${ph.join(", ")})`);
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
        parts.push(`${colExpr} NOT IN (${ph.join(", ")})`);
      }
    }
    if ("isNull" in op) parts.push(`${colExpr} IS NULL`);
    if ("isNotNull" in op) parts.push(`${colExpr} IS NOT NULL`);
    if ("between" in op) {
      const [lo, hi] = op.between as [unknown, unknown];
      params.push(lo);
      const loIdx = params.length;
      params.push(hi);
      const hiIdx = params.length;
      parts.push(`${colExpr} BETWEEN $${loIdx} AND $${hiIdx}`);
    }

    return parts.length > 0 ? parts.join(" AND ") : "TRUE";
  }

  params.push(val);
  return `${colExpr} = $${params.length}`;
}
