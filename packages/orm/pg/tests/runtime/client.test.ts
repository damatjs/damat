import { describe, it, expect } from "bun:test";
import { PgModelClient } from "../../src/client";
import { FakeConn, FakePool, UserModel } from "../helpers/fixtures";

function makeClient(opts: ConstructorParameters<typeof FakeConn>[0] = {}) {
  const conn = new FakeConn(opts);
  // pool === conn here; the client uses _conn (= pool when no client passed).
  const client = new PgModelClient(UserModel, conn as any);
  return { client, conn };
}

describe("PgModelClient — connection wiring", () => {
  it("defaults _conn to the pool when no PoolClient is given", () => {
    const conn = new FakeConn();
    const client = new PgModelClient(UserModel, conn as any);
    expect(client._conn).toBe(conn as any);
    expect(client._pool).toBe(conn as any);
  });

  it("withClient swaps the connection but keeps the same pool + model", async () => {
    const pool = new FakeConn({ rows: [{ id: "via-pool" }] });
    const dedicated = new FakeConn({ rows: [{ id: "via-client" }] });
    const client = new PgModelClient(UserModel, pool as any);
    const scoped = client.withClient(dedicated as any);
    expect(scoped._pool).toBe(pool as any);
    expect(scoped._conn).toBe(dedicated as any);
    const res = await scoped.findMany();
    expect(res.rows).toEqual([{ id: "via-client" }]);
    expect(dedicated.calls.length).toBe(1);
    expect(pool.calls.length).toBe(0);
  });
});

describe("PgModelClient.findMany / findOne", () => {
  it("findMany sends generated SQL/params and returns rows + descriptor", async () => {
    const { client, conn } = makeClient({ rows: [{ id: "u1" }] });
    const res = await client.findMany({
      select: ["id", "email"],
      where: { verified: true },
    });
    expect(conn.last.sql).toBe(
      'SELECT "id", "email" FROM "app"."user" WHERE "verified" = $1',
    );
    expect(conn.last.params).toEqual([true]);
    expect(res.rows).toEqual([{ id: "u1" }]);
    expect(res.rowCount).toBe(1);
    expect(res.descriptor.type).toBe("select");
  });

  it("findOne appends LIMIT 1", async () => {
    const { client, conn } = makeClient({ rows: [{ id: "u1" }] });
    await client.findOne({ where: { id: "u1" } });
    expect(conn.last.sql).toBe(
      'SELECT * FROM "app"."user" WHERE "id" = $1 LIMIT 1',
    );
  });
});

describe("PgModelClient mutations", () => {
  it("create issues INSERT and returns the row", async () => {
    const { client, conn } = makeClient({
      rows: [{ id: "u1", email: "a@b.com" }],
    });
    const res = await client.create({
      data: { id: "u1", email: "a@b.com" },
      returning: ["id", "email"],
    });
    expect(conn.last.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") VALUES ($1, $2) RETURNING "id", "email"',
    );
    expect(conn.last.params).toEqual(["u1", "a@b.com"]);
    expect(res.rows[0]).toEqual({ id: "u1", email: "a@b.com" });
  });

  it("createMany issues a multi-row INSERT", async () => {
    const { client, conn } = makeClient({ rows: [{ id: "u1" }, { id: "u2" }] });
    const res = await client.createMany({ data: [{ id: "u1" }, { id: "u2" }] });
    expect(conn.last.sql).toBe(
      'INSERT INTO "app"."user" ("id") VALUES ($1), ($2) RETURNING *',
    );
    expect(res.rowCount).toBe(2);
  });

  it("update issues UPDATE ... SET ... WHERE", async () => {
    const { client, conn } = makeClient({ rows: [{ id: "u1" }] });
    await client.update({ set: { verified: true }, where: { id: "u1" } });
    expect(conn.last.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 WHERE "id" = $2 RETURNING *',
    );
    expect(conn.last.params).toEqual([true, "u1"]);
  });

  it("delete issues DELETE and reports rowCount", async () => {
    const { client, conn } = makeClient({ rows: [], rowCount: 3 });
    const res = await client.delete({ where: { verified: false } });
    expect(conn.last.sql).toBe(
      'DELETE FROM "app"."user" WHERE "verified" = $1 RETURNING *',
    );
    expect(res.rowCount).toBe(3);
  });

  it("upsert issues INSERT ... ON CONFLICT DO UPDATE", async () => {
    const { client, conn } = makeClient({ rows: [{ id: "u1" }] });
    await client.upsert({
      data: { id: "u1", email: "a@b.com", name: "Alice" },
      onConflict: ["email"],
    });
    expect(conn.last.sql).toContain('ON CONFLICT ("email") DO UPDATE SET');
  });
});

describe("PgModelClient.transaction", () => {
  it("runs the callback against a per-transaction client and commits", async () => {
    const pool = new FakePool({ rows: [{ id: "u1" }] });
    const client = new PgModelClient(UserModel, pool as any);
    const out = await client.transaction(async (tx) => {
      await tx.create({ data: { id: "u1", email: "a@b.com" } });
      return "done";
    });
    expect(out).toBe("done");
    // BEGIN, the INSERT, then COMMIT on the dedicated client.
    expect(pool.client.sqlLog[0]).toBe("BEGIN");
    expect(pool.client.sqlLog[pool.client.sqlLog.length - 1]).toBe("COMMIT");
    expect(pool.client.sqlLog.some((s) => s.startsWith("INSERT INTO"))).toBe(
      true,
    );
  });

  it("rolls back when the callback throws", async () => {
    const pool = new FakePool({ rows: [] });
    const client = new PgModelClient(UserModel, pool as any);
    await expect(
      client.transaction(async () => {
        throw new Error("nope");
      }),
    ).rejects.toThrow("nope");
    expect(pool.client.sqlLog).toEqual(["BEGIN", "ROLLBACK"]);
  });
});
