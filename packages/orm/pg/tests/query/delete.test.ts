import { describe, it, expect } from "bun:test";
import { DeleteBuilder } from "../../src/query/delete";
import { UserModel } from "../helpers/fixtures";

const del = () => new DeleteBuilder(UserModel);

describe("DeleteBuilder.generateSql", () => {
  it("DELETE with WHERE and default RETURNING *", () => {
    const q = del().where({ id: "u1" }).generateSql();
    expect(q.sql).toBe('DELETE FROM "app"."user" WHERE "id" = $1 RETURNING *');
    expect(q.params).toEqual(["u1"]);
  });

  it("RETURNING explicit columns", () => {
    const q = del().where({ id: "u1" }).returning(["id"]).generateSql();
    expect(q.sql).toBe(
      'DELETE FROM "app"."user" WHERE "id" = $1 RETURNING "id"',
    );
  });

  it("DELETE with operator-based WHERE", () => {
    const q = del().where({ age: { lt: 18 } }).generateSql();
    expect(q.sql).toBe('DELETE FROM "app"."user" WHERE "age" < $1 RETURNING *');
    expect(q.params).toEqual([18]);
  });

  it("supports whereRaw", () => {
    const q = del()
      .whereRaw({ sql: '"verified" = $1', params: [false] })
      .generateSql();
    expect(q.sql).toBe(
      'DELETE FROM "app"."user" WHERE "verified" = $1 RETURNING *',
    );
    expect(q.params).toEqual([false]);
  });
});

describe("DeleteBuilder — guard rails", () => {
  it("throws when no WHERE and allowFullTable not set", () => {
    expect(() => del().generateSql()).toThrow(/No WHERE clause/);
  });

  it("allowFullTable() permits an unscoped DELETE", () => {
    const q = del().allowFullTable().generateSql();
    expect(q.sql).toBe('DELETE FROM "app"."user" RETURNING *');
  });
});

describe("DeleteBuilder.generateJson", () => {
  it("emits a delete descriptor", () => {
    const json = del().where({ id: "u1" }).returning(["id"]).generateJson();
    expect(json).toMatchObject({
      type: "delete",
      table: "user",
      schema: "app",
      where: [{ id: "u1" }],
      returning: ["id"],
    });
  });

  it("includes cloned whereRaw clauses in the descriptor", () => {
    const json = del()
      .where({ id: "u1" })
      .whereRaw({ sql: '"age" < $1', params: [18] })
      .generateJson();
    expect(json.where).toEqual([{ id: "u1" }]);
    expect(json.whereRaw).toEqual([{ sql: '"age" < $1', params: [18] }]);
  });
});
