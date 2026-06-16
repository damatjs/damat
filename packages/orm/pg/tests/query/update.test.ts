import { describe, it, expect } from "bun:test";
import { UpdateBuilder } from "../../src/query/update";
import { UserModel } from "../helpers/fixtures";

const upd = () => new UpdateBuilder(UserModel);

describe("UpdateBuilder.generateSql", () => {
  it("SET + WHERE with sequential params (SET first, then WHERE)", () => {
    const q = upd()
      .set({ verified: true, name: "Bob" })
      .where({ id: "u1" })
      .generateSql();
    expect(q.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1, "name" = $2 WHERE "id" = $3 RETURNING *',
    );
    expect(q.params).toEqual([true, "Bob", "u1"]);
  });

  it("RETURNING explicit columns", () => {
    const q = upd()
      .set({ verified: true })
      .where({ id: "u1" })
      .returning(["id", "verified"])
      .generateSql();
    expect(q.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 WHERE "id" = $2 RETURNING "id", "verified"',
    );
  });

  it("merges successive set() calls", () => {
    const q = upd()
      .set({ name: "A" })
      .set({ verified: true })
      .where({ id: "u1" })
      .generateSql();
    expect(q.sql).toBe(
      'UPDATE "app"."user" SET "name" = $1, "verified" = $2 WHERE "id" = $3 RETURNING *',
    );
    expect(q.params).toEqual(["A", true, "u1"]);
  });

  it("supports whereRaw renumbering after SET params", () => {
    const q = upd()
      .set({ verified: true })
      .whereRaw({ sql: '"age" > $1', params: [21] })
      .generateSql();
    expect(q.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 WHERE "age" > $2 RETURNING *',
    );
    expect(q.params).toEqual([true, 21]);
  });
});

describe("UpdateBuilder — guard rails", () => {
  it("throws when set() was never called", () => {
    expect(() => upd().where({ id: "u1" }).generateSql()).toThrow(
      /No columns to update/,
    );
  });

  it("throws when there is no WHERE clause and allowFullTable not set", () => {
    expect(() => upd().set({ verified: true }).generateSql()).toThrow(
      /No WHERE clause/,
    );
  });

  it("allowFullTable() permits an unscoped UPDATE", () => {
    const q = upd().set({ verified: true }).allowFullTable().generateSql();
    expect(q.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 RETURNING *',
    );
  });

  it("throws on unknown column in set()", () => {
    expect(() => upd().set({ bogus: 1 } as any)).toThrow(
      /Unknown column "bogus"/,
    );
  });
});

describe("UpdateBuilder.generateJson", () => {
  it("emits an update descriptor", () => {
    const json = upd()
      .set({ verified: true })
      .where({ id: "u1" })
      .returning(["id"])
      .generateJson();
    expect(json).toMatchObject({
      type: "update",
      table: "user",
      schema: "app",
      set: { verified: true },
      where: [{ id: "u1" }],
      returning: ["id"],
    });
  });
});
