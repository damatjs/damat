import { describe, it, expect } from "bun:test";
import { ModelAccessor } from "../../src/query/accessor";
import { UserModel } from "../helpers/fixtures";

const acc = () => new ModelAccessor(UserModel);

describe("ModelAccessor.builders", () => {
  it("each getter returns a fresh builder instance", () => {
    const a = acc();
    expect(a.builders.select).not.toBe(a.builders.select);
    expect(a.builders.insert).not.toBe(a.builders.insert);
  });

  it("exposes update / delete / upsert builder getters too", () => {
    const a = acc();
    // Touch every getter so all of them are exercised (each is independent).
    expect(a.builders.update).not.toBe(a.builders.update);
    expect(a.builders.delete).not.toBe(a.builders.delete);
    expect(a.builders.upsert).not.toBe(a.builders.upsert);
    // And they are the right builder kinds (constructor names).
    expect(a.builders.update.constructor.name).toBe("UpdateBuilder");
    expect(a.builders.delete.constructor.name).toBe("DeleteBuilder");
    expect(a.builders.upsert.constructor.name).toBe("UpsertBuilder");
  });
});

describe("ModelAccessor.findMany", () => {
  it("applies select, where, orderBy, limit, offset and returns sql + json", () => {
    const { sql, json } = acc().findMany({
      select: ["id", "email"],
      where: { verified: true },
      orderBy: [{ column: "name", direction: "DESC" }],
      limit: 5,
      offset: 2,
    });
    expect(sql.sql).toBe(
      'SELECT "id", "email" FROM "app"."user" WHERE "verified" = $1 ORDER BY "name" DESC LIMIT 5 OFFSET 2',
    );
    expect(sql.params).toEqual([true]);
    expect(json.type).toBe("select");
  });

  it("supports whereRaw arrays and distinct", () => {
    const { sql } = acc().findMany({
      distinct: true,
      whereRaw: [{ sql: '"age" > $1', params: [18] }],
    });
    expect(sql.sql).toBe(
      'SELECT DISTINCT * FROM "app"."user" WHERE "age" > $1',
    );
  });

  it("supports relations via with()", () => {
    const { sql } = acc().findMany({ with: { posts: { select: ["id"] } } });
    expect(sql.sql).toContain('LEFT JOIN LATERAL');
    expect(sql.sql).toContain('AS "posts"');
  });
});

describe("ModelAccessor.findOne", () => {
  it("forces LIMIT 1", () => {
    const { sql } = acc().findOne({ where: { id: "u1" } });
    expect(sql.sql).toBe(
      'SELECT * FROM "app"."user" WHERE "id" = $1 LIMIT 1',
    );
    expect(sql.params).toEqual(["u1"]);
  });
});

describe("ModelAccessor.create / createMany", () => {
  it("create builds an insert with returning + onConflict", () => {
    const { sql } = acc().create({
      data: { id: "u1", email: "a@b.com" },
      returning: ["id"],
      onConflict: { action: "nothing", conflictColumns: ["email"] },
    });
    expect(sql.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") VALUES ($1, $2) ' +
        'ON CONFLICT ("email") DO NOTHING RETURNING "id"',
    );
  });

  it("createMany builds a multi-row insert", () => {
    const { sql } = acc().createMany({
      data: [{ id: "u1" }, { id: "u2" }],
    });
    expect(sql.sql).toBe(
      'INSERT INTO "app"."user" ("id") VALUES ($1), ($2) RETURNING *',
    );
    expect(sql.params).toEqual(["u1", "u2"]);
  });
});

describe("ModelAccessor.update", () => {
  it("builds update with where + returning", () => {
    const { sql } = acc().update({
      set: { verified: true },
      where: { id: "u1" },
      returning: ["id"],
    });
    expect(sql.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 WHERE "id" = $2 RETURNING "id"',
    );
  });

  it("honors allowFullTable to permit an unscoped update", () => {
    const { sql } = acc().update({
      set: { verified: true },
      allowFullTable: true,
    });
    expect(sql.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 RETURNING *',
    );
  });

  it("applies whereRaw (single clause) on update", () => {
    const { sql } = acc().update({
      set: { verified: true },
      whereRaw: { sql: '"age" > $1', params: [18] },
    });
    expect(sql.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 WHERE "age" > $2 RETURNING *',
    );
    expect(sql.params).toEqual([true, 18]);
  });

  it("applies whereRaw (array of clauses) on update", () => {
    const { sql } = acc().update({
      set: { verified: true },
      whereRaw: [
        { sql: '"age" > $1', params: [18] },
        { sql: '"name" IS NOT NULL', params: [] },
      ],
    });
    expect(sql.sql).toContain('"age" > $2');
    expect(sql.sql).toContain('"name" IS NOT NULL');
    expect(sql.params).toEqual([true, 18]);
  });
});

describe("ModelAccessor.delete", () => {
  it("builds delete with where", () => {
    const { sql } = acc().delete({ where: { id: "u1" } });
    expect(sql.sql).toBe(
      'DELETE FROM "app"."user" WHERE "id" = $1 RETURNING *',
    );
  });

  it("applies whereRaw (single clause) on delete", () => {
    const { sql } = acc().delete({
      whereRaw: { sql: '"age" < $1', params: [18] },
    });
    expect(sql.sql).toBe(
      'DELETE FROM "app"."user" WHERE "age" < $1 RETURNING *',
    );
    expect(sql.params).toEqual([18]);
  });

  it("applies whereRaw (array of clauses) and allowFullTable on delete", () => {
    const { sql } = acc().delete({
      whereRaw: [
        { sql: '"age" < $1', params: [18] },
        { sql: '"verified" = false', params: [] },
      ],
      allowFullTable: true,
    });
    expect(sql.sql).toContain('"age" < $1');
    expect(sql.sql).toContain('"verified" = false');
    expect(sql.params).toEqual([18]);
  });
});

describe("ModelAccessor.upsert / upsertMany", () => {
  it("upsert builds insert-on-conflict-do-update", () => {
    const { sql } = acc().upsert({
      data: { id: "u1", email: "a@b.com", name: "Alice" },
      onConflict: ["email"],
      returning: ["id"],
    });
    expect(sql.sql).toContain('ON CONFLICT ("email") DO UPDATE SET');
    expect(sql.sql.endsWith('RETURNING "id"')).toBe(true);
  });

  it("upsertMany handles multiple rows", () => {
    const { sql } = acc().upsertMany({
      data: [
        { id: "u1", email: "a@b.com" },
        { id: "u2", email: "c@d.com" },
      ],
      onConflict: ["email"],
    });
    expect(sql.sql).toContain("VALUES ($1, $2), ($3, $4)");
  });
});
