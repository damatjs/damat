import { describe, it, expect } from "bun:test";
import { SelectBuilder } from "../../src/query/select";
import { compileRelCondition } from "../../src/query/select/lateral";
import { UserModel, PostModel } from "../helpers/fixtures";

/**
 * Coverage for the lateral-join compiler:
 *   - `compileRelCondition` — every operator branch, exercised directly as the
 *     pure SQL-fragment builder it is (no DB, no builder).
 *   - `buildLateralJoin` — driven through SelectBuilder.with() so the realistic
 *     code path (operator wheres, whereRaw renumbering, orderBy/limit/offset)
 *     runs end to end against fixture models.
 */

describe("compileRelCondition — operator branches", () => {
  const col = '"_t"."age"';

  it("null value → IS NULL", () => {
    const params: unknown[] = [];
    expect(compileRelCondition(col, null, params)).toBe(`${col} IS NULL`);
    expect(params).toEqual([]);
  });

  it("scalar value → equality with a placeholder", () => {
    const params: unknown[] = [];
    expect(compileRelCondition(col, 42, params)).toBe(`${col} = $1`);
    expect(params).toEqual([42]);
  });

  it("eq / neq with explicit null map to IS NULL / IS NOT NULL", () => {
    const p1: unknown[] = [];
    expect(compileRelCondition(col, { eq: null }, p1)).toBe(`${col} IS NULL`);
    const p2: unknown[] = [];
    expect(compileRelCondition(col, { neq: null }, p2)).toBe(
      `${col} IS NOT NULL`,
    );
    expect(p1).toEqual([]);
    expect(p2).toEqual([]);
  });

  it("eq / neq with values bind placeholders", () => {
    const p1: unknown[] = [];
    expect(compileRelCondition(col, { eq: 1 }, p1)).toBe(`${col} = $1`);
    const p2: unknown[] = [];
    expect(compileRelCondition(col, { neq: 2 }, p2)).toBe(`${col} <> $1`);
    expect(p1).toEqual([1]);
    expect(p2).toEqual([2]);
  });

  it("gt / gte / lt / lte comparators", () => {
    const params: unknown[] = [];
    const sql = compileRelCondition(
      col,
      { gt: 1, gte: 2, lt: 3, lte: 4 },
      params,
    );
    expect(sql).toBe(
      `${col} > $1 AND ${col} >= $2 AND ${col} < $3 AND ${col} <= $4`,
    );
    expect(params).toEqual([1, 2, 3, 4]);
  });

  it("like / ilike", () => {
    const params: unknown[] = [];
    const sql = compileRelCondition(col, { like: "a%", ilike: "b%" }, params);
    expect(sql).toBe(`${col} LIKE $1 AND ${col} ILIKE $2`);
    expect(params).toEqual(["a%", "b%"]);
  });

  it("in with values, and empty in → FALSE", () => {
    const p1: unknown[] = [];
    expect(compileRelCondition(col, { in: [1, 2] }, p1)).toBe(
      `${col} IN ($1, $2)`,
    );
    expect(p1).toEqual([1, 2]);
    const p2: unknown[] = [];
    expect(compileRelCondition(col, { in: [] }, p2)).toBe("FALSE");
    expect(p2).toEqual([]);
  });

  it("notIn with values, and empty notIn → TRUE", () => {
    const p1: unknown[] = [];
    expect(compileRelCondition(col, { notIn: [1, 2] }, p1)).toBe(
      `${col} NOT IN ($1, $2)`,
    );
    expect(p1).toEqual([1, 2]);
    const p2: unknown[] = [];
    expect(compileRelCondition(col, { notIn: [] }, p2)).toBe("TRUE");
    expect(p2).toEqual([]);
  });

  it("isNull / isNotNull flags", () => {
    const p1: unknown[] = [];
    expect(compileRelCondition(col, { isNull: true }, p1)).toBe(
      `${col} IS NULL`,
    );
    const p2: unknown[] = [];
    expect(compileRelCondition(col, { isNotNull: true }, p2)).toBe(
      `${col} IS NOT NULL`,
    );
  });

  it("between binds both bounds", () => {
    const params: unknown[] = [];
    expect(compileRelCondition(col, { between: [10, 20] }, params)).toBe(
      `${col} BETWEEN $1 AND $2`,
    );
    expect(params).toEqual([10, 20]);
  });

  it("empty operator object → TRUE (no parts)", () => {
    const params: unknown[] = [];
    expect(compileRelCondition(col, {}, params)).toBe("TRUE");
    expect(params).toEqual([]);
  });

  it("array value is treated as a scalar (equality)", () => {
    // Arrays are NOT operator maps; they bind as a single equality param.
    const params: unknown[] = [];
    expect(compileRelCondition(col, [1, 2, 3], params)).toBe(`${col} = $1`);
    expect(params).toEqual([[1, 2, 3]]);
  });
});

describe("buildLateralJoin — via SelectBuilder.with()", () => {
  it("hasMany: operator where + whereRaw renumbering + orderBy + limit + offset", () => {
    const q = new SelectBuilder(UserModel)
      .where({ verified: true })
      .with({
        posts: {
          select: ["id", "title"],
          where: { published: true, title: { like: "Hi%" } },
          whereRaw: { sql: '"body" IS NOT NULL OR $1 = $1', params: ["x"] },
          orderBy: [
            { column: "title", direction: "DESC", nulls: "NULLS LAST" },
          ],
          limit: 5,
          offset: 2,
        },
      })
      .generateSql();

    expect(q.sql).toContain("LEFT JOIN LATERAL");
    expect(q.sql).toContain("json_agg");
    // operator where compiled into the lateral subquery
    expect(q.sql).toContain("LIKE");
    // orderBy + limit + offset present
    expect(q.sql).toContain("ORDER BY");
    expect(q.sql).toContain("LIMIT 5");
    expect(q.sql).toContain("OFFSET 2");
    // The parent where param ($1=true) plus the relation params are all bound.
    expect(q.params[0]).toBe(true);
    expect(q.params).toContain("x");
  });

  it("belongsTo with an explicit limit keeps the caller's LIMIT", () => {
    // Drive the belongsTo branch from the Post model (author belongsTo user).
    // Imported lazily to keep this assertion self-contained.
    const q = new SelectBuilder(PostModel)
      .with({ author: { select: ["id"], limit: 3 } })
      .generateSql();
    expect(q.sql).toContain("row_to_json");
    expect(q.sql).toContain("LIMIT 3");
  });

  it("belongsTo default (no limit) injects LIMIT 1", () => {
    const q = new SelectBuilder(PostModel)
      .with({ author: { select: ["id"] } })
      .generateSql();
    expect(q.sql).toContain("row_to_json");
    expect(q.sql).toContain("LIMIT 1");
  });

  it("relation with no select uses * for the inner columns", () => {
    const q = new SelectBuilder(PostModel).with({ author: true }).generateSql();
    expect(q.sql).toContain("SELECT *");
  });

  it("whereRaw as an array of clauses is supported", () => {
    const q = new SelectBuilder(PostModel)
      .with({
        author: {
          whereRaw: [
            { sql: '"email" IS NOT NULL', params: [] },
            { sql: "$1 = $1", params: ["y"] },
          ],
        },
      })
      .generateSql();
    expect(q.sql).toContain("row_to_json");
    expect(q.params).toContain("y");
  });
});
