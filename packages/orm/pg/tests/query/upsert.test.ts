import { describe, it, expect } from "bun:test";
import { UpsertBuilder } from "../../src/query/upsert";
import { UserModel } from "../helpers/fixtures";

const ups = () => new UpsertBuilder(UserModel);

describe("UpsertBuilder.generateSql — default EXCLUDED fallback", () => {
  it("updates every non-conflict inserted column via EXCLUDED", () => {
    const q = ups()
      .values({ id: "u1", email: "a@b.com", name: "Alice" })
      .onConflict(["email"])
      .generateSql();
    // Conflict column "email" is excluded from the SET; id + name are updated.
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email", "name") VALUES ($1, $2, $3) ' +
        'ON CONFLICT ("email") DO UPDATE SET ' +
        '"id" = EXCLUDED."id", "name" = EXCLUDED."name" RETURNING *',
    );
    expect(q.params).toEqual(["u1", "a@b.com", "Alice"]);
  });

  it("RETURNING explicit columns", () => {
    const q = ups()
      .values({ id: "u1", email: "a@b.com" })
      .onConflict(["email"])
      .returning(["id", "email"])
      .generateSql();
    expect(q.sql.endsWith('RETURNING "id", "email"')).toBe(true);
  });
});

describe("UpsertBuilder.generateSql — updateColumns / set", () => {
  it("updateColumns restricts the EXCLUDED set", () => {
    const q = ups()
      .values({ id: "u1", email: "a@b.com", name: "Alice", verified: true })
      .onConflict(["email"])
      .updateColumns(["name", "verified"])
      .generateSql();
    expect(q.sql).toContain(
      'DO UPDATE SET "name" = EXCLUDED."name", "verified" = EXCLUDED."verified"',
    );
  });

  it("explicit set() values are parameterized and appended after EXCLUDED cols", () => {
    const q = ups()
      .values({ id: "u1", email: "a@b.com", name: "Alice" })
      .onConflict(["email"])
      .set({ name: "Override" })
      .generateSql();
    // name is explicit (param), so EXCLUDED only covers "id"
    expect(q.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email", "name") VALUES ($1, $2, $3) ' +
        'ON CONFLICT ("email") DO UPDATE SET ' +
        '"id" = EXCLUDED."id", "name" = $4 RETURNING *',
    );
    expect(q.params).toEqual(["u1", "a@b.com", "Alice", "Override"]);
  });

  it("set takes precedence over updateColumns for overlapping keys", () => {
    const q = ups()
      .values({ id: "u1", email: "a@b.com", name: "Alice", verified: true })
      .onConflict(["email"])
      .updateColumns(["name", "verified"])
      .set({ verified: false })
      .generateSql();
    // verified is overridden via set (param). There are 4 value params
    // (id, email, name, verified) so the explicit set param is $5.
    expect(q.sql).toContain(
      'DO UPDATE SET "name" = EXCLUDED."name", "verified" = $5',
    );
    expect(q.params).toEqual(["u1", "a@b.com", "Alice", true, false]);
  });
});

describe("UpsertBuilder.generateSql — many rows", () => {
  it("multi-row VALUES tuples", () => {
    const q = ups()
      .values([
        { id: "u1", email: "a@b.com" },
        { id: "u2", email: "c@d.com" },
      ])
      .onConflict(["email"])
      .generateSql();
    expect(q.sql).toContain("VALUES ($1, $2), ($3, $4)");
    expect(q.params).toEqual(["u1", "a@b.com", "u2", "c@d.com"]);
  });
});

describe("UpsertBuilder — validation", () => {
  it("throws when no values", () => {
    expect(() => ups().onConflict(["email"]).generateSql()).toThrow(
      /No values provided/,
    );
  });

  it("throws when no conflict columns", () => {
    expect(() => ups().values({ id: "u1" }).generateSql()).toThrow(
      /No conflict columns specified/,
    );
  });

  it("throws on unknown conflict column", () => {
    expect(() =>
      ups()
        .values({ id: "u1" })
        .onConflict(["bogus" as any]),
    ).toThrow(/Unknown column "bogus"/);
  });

  it("throws on unknown column in set()", () => {
    expect(() => ups().set({ bogus: 1 } as any)).toThrow(
      /Unknown column "bogus"/,
    );
  });
});

describe("UpsertBuilder.generateJson", () => {
  it("emits an upsert descriptor with updateColumns and set", () => {
    const json = ups()
      .values({ id: "u1", email: "a@b.com" })
      .onConflict(["email"])
      .updateColumns(["name"])
      .set({ name: "x" })
      .returning(["id"])
      .generateJson();
    expect(json).toMatchObject({
      type: "upsert",
      table: "user",
      schema: "app",
      rows: [{ id: "u1", email: "a@b.com" }],
      conflictColumns: ["email"],
      updateColumns: ["name"],
      set: { name: "x" },
      returning: ["id"],
    });
  });
});
