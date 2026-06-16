import { describe, it, expect } from "bun:test";
import { pgExecuteRaw, pgTransaction } from "../../src/executor";
import { FakeConn, FakePool, noopQueryLogger } from "../helpers/fixtures";

describe("pgExecuteRaw", () => {
  it("passes sql + params to the connection and returns rows + rowCount", async () => {
    const conn = new FakeConn({ rows: [{ id: "u1" }, { id: "u2" }] });
    const res = await pgExecuteRaw(
      conn as any,
      { sql: "SELECT * FROM t WHERE x = $1", params: ["v"] },
      noopQueryLogger,
    );
    expect(conn.last.sql).toBe("SELECT * FROM t WHERE x = $1");
    expect(conn.last.params).toEqual(["v"]);
    expect(res.rows).toEqual([{ id: "u1" }, { id: "u2" }]);
    expect(res.rowCount).toBe(2);
  });

  it("falls back to rows.length when driver rowCount is null", async () => {
    const conn = new FakeConn({ rows: [{ id: "u1" }], rowCount: null });
    const res = await pgExecuteRaw(
      conn as any,
      { sql: "SELECT 1", params: [] },
      noopQueryLogger,
    );
    expect(res.rowCount).toBe(1);
  });

  it("re-throws the original driver error (no wrapping)", async () => {
    const boom = new Error("connection reset");
    const conn = new FakeConn({ throwOn: () => boom });
    await expect(
      pgExecuteRaw(conn as any, { sql: "SELECT 1", params: [] }, noopQueryLogger),
    ).rejects.toThrow("connection reset");
  });
});

describe("pgTransaction", () => {
  it("issues BEGIN, runs callback, COMMIT, then releases the client", async () => {
    const pool = new FakePool({ rows: [] });
    const result = await pgTransaction(
      pool as any,
      async (client) => {
        await (client as any).query("SELECT 1");
        return "ok";
      },
      noopQueryLogger,
    );
    expect(result).toBe("ok");
    expect(pool.client.sqlLog).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(pool.client.released).toBe(1);
  });

  it("issues ROLLBACK and releases on callback error, then rethrows", async () => {
    const pool = new FakePool({ rows: [] });
    await expect(
      pgTransaction(
        pool as any,
        async () => {
          throw new Error("callback failed");
        },
        noopQueryLogger,
      ),
    ).rejects.toThrow("callback failed");
    expect(pool.client.sqlLog).toEqual(["BEGIN", "ROLLBACK"]);
    expect(pool.client.released).toBe(1);
  });

  it("the transaction callback receives the pooled client (not the pool)", async () => {
    const pool = new FakePool({ rows: [] });
    let received: unknown;
    await pgTransaction(
      pool as any,
      async (client) => {
        received = client;
      },
      noopQueryLogger,
    );
    expect(received).toBe(pool.client as any);
  });
});
