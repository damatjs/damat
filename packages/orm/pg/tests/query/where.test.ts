import { describe, it, expect } from "bun:test";
import { buildWhereClause } from "../../src/query/helpers/where/builder";
import {
  compileCondition,
  isOperatorObject,
} from "../../src/query/helpers/where/condition";

const known = new Set(["id", "email", "age", "name", "verified", "score"]);

/** Helper: run buildWhereClause and return both the SQL and the params. */
function build(
  clauses: Record<string, unknown>[],
  raws: { sql: string; params?: unknown[] }[] = [],
) {
  const params: unknown[] = [];
  const sql = buildWhereClause(clauses as any, raws as any, params, known);
  return { sql, params };
}

describe("isOperatorObject", () => {
  it("recognizes operator objects", () => {
    expect(isOperatorObject({ eq: 1 } as any)).toBe(true);
    expect(isOperatorObject({ gt: 1, lt: 9 } as any)).toBe(true);
    expect(isOperatorObject({ in: [1, 2] } as any)).toBe(true);
    expect(isOperatorObject({ isNull: true } as any)).toBe(true);
  });

  it("rejects plain values, null, arrays, and unknown keys", () => {
    expect(isOperatorObject(null as any)).toBe(false);
    expect(isOperatorObject(5 as any)).toBe(false);
    expect(isOperatorObject("hi" as any)).toBe(false);
    expect(isOperatorObject([1, 2] as any)).toBe(false);
    expect(isOperatorObject({} as any)).toBe(false); // no keys
    // any non-operator key disqualifies the whole object
    expect(isOperatorObject({ eq: 1, bogus: 2 } as any)).toBe(false);
    expect(isOperatorObject({ foo: "bar" } as any)).toBe(false);
  });
});

describe("compileCondition — shorthand (non-operator) values", () => {
  it("scalar value compiles to equality with a parameter", () => {
    const params: unknown[] = [];
    expect(compileCondition('"id"', "u1", params)).toBe('"id" = $1');
    expect(params).toEqual(["u1"]);
  });

  it("null shorthand compiles to IS NULL with no parameter", () => {
    const params: unknown[] = [];
    expect(compileCondition('"name"', null, params)).toBe('"name" IS NULL');
    expect(params).toEqual([]);
  });

  it("array value is treated as a parameter (NOT an IN)", () => {
    // Arrays are not operator-objects, so they become a single equality param.
    const params: unknown[] = [];
    expect(compileCondition('"id"', [1, 2] as any, params)).toBe('"id" = $1');
    expect(params).toEqual([[1, 2]]);
  });
});

describe("compileCondition — comparison operators", () => {
  const cases: Array<[string, Record<string, unknown>, string, unknown[]]> = [
    ["eq", { eq: 5 }, '"age" = $1', [5]],
    ["neq", { neq: 5 }, '"age" <> $1', [5]],
    ["gt", { gt: 5 }, '"age" > $1', [5]],
    ["gte", { gte: 5 }, '"age" >= $1', [5]],
    ["lt", { lt: 5 }, '"age" < $1', [5]],
    ["lte", { lte: 5 }, '"age" <= $1', [5]],
    ["like", { like: "a%" }, '"age" LIKE $1', ["a%"]],
    ["ilike", { ilike: "a%" }, '"age" ILIKE $1', ["a%"]],
  ];
  for (const [name, op, expectedSql, expectedParams] of cases) {
    it(`compiles ${name}`, () => {
      const params: unknown[] = [];
      expect(compileCondition('"age"', op as any, params)).toBe(expectedSql);
      expect(params).toEqual(expectedParams);
    });
  }
});

describe("compileCondition — eq/neq null special-casing", () => {
  it("eq: null becomes IS NULL with no param", () => {
    const params: unknown[] = [];
    expect(compileCondition('"name"', { eq: null } as any, params)).toBe(
      '"name" IS NULL',
    );
    expect(params).toEqual([]);
  });

  it("neq: null becomes IS NOT NULL with no param", () => {
    const params: unknown[] = [];
    expect(compileCondition('"name"', { neq: null } as any, params)).toBe(
      '"name" IS NOT NULL',
    );
    expect(params).toEqual([]);
  });
});

describe("compileCondition — IN / NOT IN", () => {
  it("IN with values", () => {
    const params: unknown[] = [];
    expect(compileCondition('"id"', { in: ["a", "b", "c"] } as any, params)).toBe(
      '"id" IN ($1, $2, $3)',
    );
    expect(params).toEqual(["a", "b", "c"]);
  });

  it("empty IN compiles to FALSE with no params", () => {
    const params: unknown[] = [];
    expect(compileCondition('"id"', { in: [] } as any, params)).toBe("FALSE");
    expect(params).toEqual([]);
  });

  it("NOT IN with values", () => {
    const params: unknown[] = [];
    expect(
      compileCondition('"id"', { notIn: ["a", "b"] } as any, params),
    ).toBe('"id" NOT IN ($1, $2)');
    expect(params).toEqual(["a", "b"]);
  });

  it("empty NOT IN compiles to TRUE with no params", () => {
    const params: unknown[] = [];
    expect(compileCondition('"id"', { notIn: [] } as any, params)).toBe("TRUE");
    expect(params).toEqual([]);
  });
});

describe("compileCondition — null checks & between", () => {
  it("isNull", () => {
    const params: unknown[] = [];
    expect(compileCondition('"name"', { isNull: true } as any, params)).toBe(
      '"name" IS NULL',
    );
    expect(params).toEqual([]);
  });

  it("isNotNull", () => {
    const params: unknown[] = [];
    expect(
      compileCondition('"name"', { isNotNull: true } as any, params),
    ).toBe('"name" IS NOT NULL');
    expect(params).toEqual([]);
  });

  it("between produces two sequential params", () => {
    const params: unknown[] = [];
    expect(
      compileCondition('"age"', { between: [18, 65] } as any, params),
    ).toBe('"age" BETWEEN $1 AND $2');
    expect(params).toEqual([18, 65]);
  });
});

describe("compileCondition — combined operators on one column", () => {
  it("ANDs multiple operators and numbers params in declaration order", () => {
    const params: unknown[] = [];
    const sql = compileCondition('"age"', { gte: 18, lt: 65 } as any, params);
    expect(sql).toBe('"age" >= $1 AND "age" < $2');
    expect(params).toEqual([18, 65]);
  });
});

describe("buildWhereClause", () => {
  it("returns empty string when there are no clauses", () => {
    const { sql, params } = build([]);
    expect(sql).toBe("");
    expect(params).toEqual([]);
  });

  it("single equality clause", () => {
    const { sql, params } = build([{ id: "u1" }]);
    expect(sql).toBe('WHERE "id" = $1');
    expect(params).toEqual(["u1"]);
  });

  it("multiple columns in one clause are ANDed with sequential params", () => {
    const { sql, params } = build([{ id: "u1", verified: true }]);
    expect(sql).toBe('WHERE "id" = $1 AND "verified" = $2');
    expect(params).toEqual(["u1", true]);
  });

  it("multiple clause objects are ANDed together", () => {
    const { sql, params } = build([{ id: "u1" }, { age: { gte: 18 } }]);
    expect(sql).toBe('WHERE "id" = $1 AND "age" >= $2');
    expect(params).toEqual(["u1", 18]);
  });

  it("mixes operators, IN, between, and null across clauses with correct $n", () => {
    const { sql, params } = build([
      { age: { between: [1, 10] } },
      { id: { in: ["a", "b"] } },
      { name: null },
      { score: { gt: 5 } },
    ]);
    expect(sql).toBe(
      'WHERE "age" BETWEEN $1 AND $2 AND "id" IN ($3, $4) AND "name" IS NULL AND "score" > $5',
    );
    expect(params).toEqual([1, 10, "a", "b", 5]);
  });

  it("throws on unknown column", () => {
    expect(() => build([{ unknownCol: 1 } as any])).toThrow(
      /Unknown column "unknownCol"/,
    );
  });

  it("appends raw clauses and renumbers their $n by the current param offset", () => {
    const { sql, params } = build(
      [{ id: "u1" }],
      [{ sql: '"age" > $1 AND "score" < $2', params: [18, 100] }],
    );
    // existing params length is 1, so $1/$2 in the raw clause become $2/$3
    expect(sql).toBe('WHERE "id" = $1 AND "age" > $2 AND "score" < $3');
    expect(params).toEqual(["u1", 18, 100]);
  });

  it("raw clause without params is appended as-is (after offset shift)", () => {
    const { sql, params } = build([], [{ sql: '"verified" IS TRUE' }]);
    expect(sql).toBe('WHERE "verified" IS TRUE');
    expect(params).toEqual([]);
  });

  it("only raw clauses (no object clauses)", () => {
    const { sql, params } = build(
      [],
      [{ sql: '"age" = $1', params: [42] }],
    );
    expect(sql).toBe('WHERE "age" = $1');
    expect(params).toEqual([42]);
  });
});
