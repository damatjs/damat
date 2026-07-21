import { describe, it, expect } from "bun:test";
import { quoteIdent, buildTableRef } from "../../src/query/helpers/ident";
import {
  buildOrderByClause,
  buildReturningClause,
} from "../../src/query/helpers/clauses";
import {
  joinSqlParts,
  assembleQuery,
  generateSql,
} from "../../src/query/helpers/assemble";
import {
  columnNameSet,
  assertKnownColumns,
  assertKnownColumnList,
} from "../../src/query/helpers/asserts";

describe("quoteIdent", () => {
  it("wraps a plain identifier in double quotes", () => {
    expect(quoteIdent("id")).toBe('"id"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(quoteIdent('we"ird')).toBe('"we""ird"');
  });

  it("handles multiple embedded quotes", () => {
    expect(quoteIdent('a"b"c')).toBe('"a""b""c"');
  });

  it("does not strip or alter dots / spaces (escaping only)", () => {
    expect(quoteIdent("user table")).toBe('"user table"');
    expect(quoteIdent("a.b")).toBe('"a.b"');
  });
});

describe("buildTableRef", () => {
  it("qualifies with schema when present", () => {
    expect(buildTableRef({ schema: "app", name: "user" })).toBe('"app"."user"');
  });

  it("omits schema qualifier when absent", () => {
    expect(buildTableRef({ name: "user" })).toBe('"user"');
  });

  it("escapes both schema and table names", () => {
    expect(buildTableRef({ schema: 'sc"h', name: 'ta"b' })).toBe(
      '"sc""h"."ta""b"',
    );
  });
});

describe("buildOrderByClause", () => {
  it("returns empty string for no clauses", () => {
    expect(buildOrderByClause([])).toBe("");
  });

  it("renders a single column with no direction", () => {
    expect(buildOrderByClause([{ column: "name" }])).toBe('ORDER BY "name"');
  });

  it("includes direction and nulls modifiers", () => {
    expect(
      buildOrderByClause([
        { column: "name", direction: "DESC", nulls: "NULLS LAST" },
      ]),
    ).toBe('ORDER BY "name" DESC NULLS LAST');
  });

  it("joins multiple clauses with commas", () => {
    expect(
      buildOrderByClause([
        { column: "age", direction: "ASC" },
        { column: "name" },
      ]),
    ).toBe('ORDER BY "age" ASC, "name"');
  });

  it("uppercases a lowercase direction/nulls before interpolating", () => {
    expect(
      buildOrderByClause([
        {
          column: "name",
          direction: "asc" as any,
          nulls: "nulls first" as any,
        },
      ]),
    ).toBe('ORDER BY "name" ASC NULLS FIRST');
  });

  it("rejects a direction outside the ASC/DESC whitelist (SQL injection guard)", () => {
    expect(() =>
      buildOrderByClause([
        { column: "name", direction: "; DROP TABLE users" as any },
      ]),
    ).toThrow(/Invalid direction/);
  });

  it("rejects a nulls modifier outside the whitelist", () => {
    expect(() =>
      buildOrderByClause([{ column: "name", nulls: "; DELETE" as any }]),
    ).toThrow(/Invalid nulls/);
  });
});

describe("buildReturningClause", () => {
  it("defaults to RETURNING * when no columns given", () => {
    expect(buildReturningClause([])).toBe("RETURNING *");
  });

  it("quotes and joins explicit columns", () => {
    expect(buildReturningClause(["id", "email"])).toBe(
      'RETURNING "id", "email"',
    );
  });
});

describe("joinSqlParts", () => {
  it("filters out empty parts and joins with single spaces", () => {
    expect(joinSqlParts(["SELECT *", "", "FROM t", ""])).toBe(
      "SELECT * FROM t",
    );
  });

  it("returns empty string when all parts are empty", () => {
    expect(joinSqlParts(["", ""])).toBe("");
  });
});

describe("assembleQuery", () => {
  it("produces a BuiltQuery with joined sql and the same params reference", () => {
    const params = [1, 2];
    const q = assembleQuery(["UPDATE t", "", "SET x = $1"], params);
    expect(q.sql).toBe("UPDATE t SET x = $1");
    expect(q.params).toBe(params);
  });
});

describe("generateSql passthrough", () => {
  it("delegates to builder.generateSql()", () => {
    const built = { sql: "SELECT 1", params: [] };
    expect(generateSql({ generateSql: () => built })).toBe(built);
  });
});

describe("columnNameSet", () => {
  it("collects column names into a Set", () => {
    const set = columnNameSet([
      { name: "id" } as any,
      { name: "email" } as any,
    ]);
    expect(set.has("id")).toBe(true);
    expect(set.has("email")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("assertKnownColumns", () => {
  const known = new Set(["id", "email"]);

  it("passes when every key is known", () => {
    expect(() =>
      assertKnownColumns({ id: 1, email: 2 }, known, "ctx"),
    ).not.toThrow();
  });

  it("throws with context + column name + known list when a key is unknown", () => {
    expect(() => assertKnownColumns({ bogus: 1 }, known, "where")).toThrow(
      '[query:where] Unknown column "bogus". Known columns: id, email',
    );
  });
});

describe("assertKnownColumnList", () => {
  const known = new Set(["id", "email"]);

  it("passes for known names", () => {
    expect(() => assertKnownColumnList(["id"], known, "orderBy")).not.toThrow();
  });

  it("throws for the first unknown name", () => {
    expect(() =>
      assertKnownColumnList(["id", "missing"], known, "orderBy"),
    ).toThrow('[query:orderBy] Unknown column "missing"');
  });
});
