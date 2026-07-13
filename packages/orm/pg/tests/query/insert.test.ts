import { describe, it, expect } from "bun:test";
import { InsertBuilder } from "../../src/query/insert";
import { buildOnConflictSql } from "../../src/query/insert/conflict";
import { UserModel, NoSchemaModel } from "../helpers/fixtures";

const ins = () => new InsertBuilder(UserModel);

describe("InsertBuilder.generateSql — single row", () => {
  it("builds INSERT with quoted columns, value placeholders and RETURNING *", () => {
    const q = ins()
      .values({ id: "u1", email: "a@b.com", name: "Alice" })
      .generateSql();
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email", "name") ' +
        "VALUES ($1, $2, $3) RETURNING *",
    );
    expect(q.params).toEqual(["u1", "a@b.com", "Alice"]);
  });

  it("RETURNING with explicit columns", () => {
    const q = ins()
      .values({ id: "u1", email: "a@b.com" })
      .returning(["id", "email"])
      .generateSql();
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") VALUES ($1, $2) RETURNING "id", "email"',
    );
  });

  it("preserves null values as parameters", () => {
    const q = ins().values({ id: "u1", name: null }).generateSql();
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "name") VALUES ($1, $2) RETURNING *',
    );
    expect(q.params).toEqual(["u1", null]);
  });

  it("omits schema for a schema-less model", () => {
    const q = new InsertBuilder(NoSchemaModel)
      .values({ id: "w1", label: "x" })
      .generateSql();
    expect(q.sql.startsWith('INSERT INTO "widget" ("id", "label")')).toBe(true);
  });
});

describe("InsertBuilder.generateSql — many rows", () => {
  it("builds multi-row VALUES with sequential params from first row's keys", () => {
    const q = ins()
      .values([
        { id: "u1", email: "a@b.com" },
        { id: "u2", email: "c@d.com" },
      ])
      .returning(["id"])
      .generateSql();
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") ' +
        'VALUES ($1, $2), ($3, $4) RETURNING "id"',
    );
    expect(q.params).toEqual(["u1", "a@b.com", "u2", "c@d.com"]);
  });
});

describe("InsertBuilder — validation", () => {
  it("throws when generateSql is called without values()", () => {
    expect(() => ins().generateSql()).toThrow(/No values provided/);
  });

  it("calling values([]) is a no-op (keeps it empty → throws at generateSql)", () => {
    expect(() => ins().values([]).generateSql()).toThrow(/No values provided/);
  });

  it("throws on unknown column in values", () => {
    expect(() => ins().values({ bogus: 1 } as any)).toThrow(
      /Unknown column "bogus"/,
    );
  });
});

describe("InsertBuilder — ON CONFLICT", () => {
  it("ON CONFLICT (...) DO NOTHING", () => {
    const q = ins()
      .values({ id: "u1", email: "a@b.com" })
      .onConflict({ action: "nothing", conflictColumns: ["email"] })
      .generateSql();
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") VALUES ($1, $2) ' +
        'ON CONFLICT ("email") DO NOTHING RETURNING *',
    );
  });

  it("ON CONFLICT DO UPDATE with explicit set adds params after value params", () => {
    const q = ins()
      .values({ id: "u1", email: "a@b.com" })
      .onConflict({
        action: "update",
        conflictColumns: ["email"],
        set: { name: "Updated" },
      })
      .generateSql();
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") VALUES ($1, $2) ' +
        'ON CONFLICT ("email") DO UPDATE SET "name" = $3 RETURNING *',
    );
    expect(q.params).toEqual(["u1", "a@b.com", "Updated"]);
  });

  it("throws for unknown conflictColumns", () => {
    expect(() =>
      ins()
        .values({ id: "u1" })
        .onConflict({ action: "nothing", conflictColumns: ["bogus" as any] }),
    ).toThrow(/Unknown column "bogus"/);
  });
});

describe("buildOnConflictSql (unit)", () => {
  it("DO UPDATE falls back to EXCLUDED for conflict columns when no set given", () => {
    const params: unknown[] = [];
    const sql = buildOnConflictSql(
      { action: "update", conflictColumns: ["email"] } as any,
      params,
    );
    expect(sql).toBe(
      'ON CONFLICT ("email") DO UPDATE SET "email" = EXCLUDED."email"',
    );
    expect(params).toEqual([]);
  });

  it("DO UPDATE with no conflict columns and no set falls back to id = EXCLUDED.id", () => {
    const params: unknown[] = [];
    const sql = buildOnConflictSql({ action: "update" } as any, params);
    // NOTE: with no conflict target the template leaves a double space
    // ("ON CONFLICT  DO UPDATE") because .trimEnd() only trims the tail.
    expect(sql).toBe('ON CONFLICT  DO UPDATE SET "id" = EXCLUDED."id"');
  });

  it("DO NOTHING with no target leaves a double space (trimEnd only trims tail)", () => {
    const params: unknown[] = [];
    const sql = buildOnConflictSql({ action: "nothing" } as any, params);
    expect(sql).toBe("ON CONFLICT  DO NOTHING");
  });
});

describe("InsertBuilder.generateJson", () => {
  it("emits an insert descriptor with rows, returning, and conflict info", () => {
    const json = ins()
      .values([{ id: "u1" }, { id: "u2" }])
      .returning(["id"])
      .onConflict({
        action: "update",
        conflictColumns: ["email"],
        set: { name: "x" },
      })
      .generateJson();
    expect(json).toMatchObject({
      type: "insert",
      table: "user",
      schema: "app",
      rows: [{ id: "u1" }, { id: "u2" }],
      returning: ["id"],
      onConflict: {
        action: "update",
        conflictColumns: ["email"],
        set: { name: "x" },
      },
    });
  });
});
