import { describe, it, expect } from "bun:test";
import {
  TransactionManager,
  TransactionContext,
  TransactionError,
  TransactionContextError,
} from "../../src/transaction";
import { FakePool, FakePoolClient, noopLogger } from "../helpers/fixtures";

describe("TransactionManager.run", () => {
  it("BEGIN → callback → COMMIT → release on success", async () => {
    const pool = new FakePool();
    const tm = new TransactionManager(pool as any, noopLogger);
    const result = await tm.run(async (ctx) => {
      await ctx.query("SELECT 1");
      return 99;
    });
    expect(result).toBe(99);
    expect(pool.client.sqlLog).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
    expect(pool.client.released).toBe(1);
  });

  it("BEGIN → ROLLBACK → release and rethrow on error", async () => {
    const pool = new FakePool();
    const tm = new TransactionManager(pool as any, noopLogger);
    await expect(
      tm.run(async () => {
        throw new Error("work failed");
      }),
    ).rejects.toThrow("work failed");
    expect(pool.client.sqlLog).toEqual(["BEGIN", "ROLLBACK"]);
    expect(pool.client.released).toBe(1);
  });
});

describe("TransactionManager.begin — options", () => {
  it("emits SET TRANSACTION ISOLATION LEVEL after BEGIN", async () => {
    const pool = new FakePool();
    const tm = new TransactionManager(pool as any, noopLogger);
    await tm.begin({ isolationLevel: "SERIALIZABLE" });
    expect(pool.client.sqlLog).toEqual([
      "BEGIN",
      "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE",
    ]);
  });

  it("emits READ ONLY / READ WRITE for the readOnly option", async () => {
    const ro = new FakePool();
    await new TransactionManager(ro as any, noopLogger).begin({
      readOnly: true,
    });
    expect(ro.client.sqlLog).toEqual(["BEGIN", "SET TRANSACTION READ ONLY"]);

    const rw = new FakePool();
    await new TransactionManager(rw as any, noopLogger).begin({
      readOnly: false,
    });
    expect(rw.client.sqlLog).toEqual(["BEGIN", "SET TRANSACTION READ WRITE"]);
  });

  it("emits DEFERRABLE only when isolation + readOnly are both unset", async () => {
    const pool = new FakePool();
    await new TransactionManager(pool as any, noopLogger).begin({
      deferrable: true,
    });
    expect(pool.client.sqlLog).toEqual(["BEGIN", "SET TRANSACTION DEFERRABLE"]);
  });

  it("releases the client and rethrows if BEGIN itself fails", async () => {
    const pool = new FakePool({
      throwOn: (sql) => (sql === "BEGIN" ? new Error("begin boom") : undefined),
    });
    const tm = new TransactionManager(pool as any, noopLogger);
    await expect(tm.begin()).rejects.toThrow("begin boom");
    expect(pool.client.released).toBe(1);
  });
});

describe("TransactionContext", () => {
  function makeCtx(opts: ConstructorParameters<typeof FakePoolClient>[0] = {}) {
    const client = new FakePoolClient(opts);
    const ctx = new TransactionContext(client as any, noopLogger);
    return { ctx, client };
  }

  it("query forwards sql + params and normalizes rowCount", async () => {
    const { ctx, client } = makeCtx({ rows: [{ id: "u1" }], rowCount: null });
    const res = await ctx.query("SELECT * FROM t WHERE x = $1", ["v"]);
    expect(client.last.sql).toBe("SELECT * FROM t WHERE x = $1");
    expect(client.last.params).toEqual(["v"]);
    expect(res.rows).toEqual([{ id: "u1" }]);
    expect(res.rowCount).toBe(0); // ?? 0 fallback in context.query
  });

  it("commit issues COMMIT and deactivates the context", async () => {
    const { ctx, client } = makeCtx();
    await ctx.commit();
    expect(client.sqlLog).toEqual(["COMMIT"]);
    expect(ctx.isActive()).toBe(false);
  });

  it("commit on an inactive context throws TransactionError", async () => {
    const { ctx } = makeCtx();
    await ctx.commit();
    await expect(ctx.commit()).rejects.toThrow(TransactionError);
  });

  it("rollback issues ROLLBACK and is a no-op when already inactive", async () => {
    const { ctx, client } = makeCtx();
    await ctx.rollback();
    expect(client.sqlLog).toEqual(["ROLLBACK"]);
    // second rollback should not issue another statement
    await ctx.rollback();
    expect(client.sqlLog).toEqual(["ROLLBACK"]);
  });

  it("wraps driver errors from commit in a TransactionError", async () => {
    const { ctx } = makeCtx({
      throwOn: (sql) => (sql === "COMMIT" ? new Error("disk full") : undefined),
    });
    await expect(ctx.commit()).rejects.toThrow(/Commit failed: disk full/);
  });

  it("wraps driver errors from query in a TransactionError", async () => {
    const { ctx } = makeCtx({ throwOn: () => new Error("syntax error") });
    await expect(ctx.query("BAD SQL")).rejects.toThrow(
      /Query failed: syntax error/,
    );
  });

  it("getClient throws once the transaction is inactive", async () => {
    const { ctx, client } = makeCtx();
    expect(ctx.getClient()).toBe(client as any);
    await ctx.commit();
    expect(() => ctx.getClient()).toThrow(TransactionError);
  });

  it("savepoint ops sanitize the name and issue the right statement", async () => {
    const { ctx, client } = makeCtx();
    await ctx.createSavepoint("sp-1; drop");
    await ctx.rollbackToSavepoint("sp-1; drop");
    await ctx.releaseSavepoint("sp-1; drop");
    expect(client.sqlLog).toEqual([
      "SAVEPOINT sp_1__drop",
      "ROLLBACK TO SAVEPOINT sp_1__drop",
      "RELEASE SAVEPOINT sp_1__drop",
    ]);
  });

  it("savepoint op throws when the transaction is inactive", async () => {
    const { ctx } = makeCtx();
    await ctx.commit();
    await expect(ctx.createSavepoint("a")).rejects.toThrow(TransactionError);
  });

  it("release() releases the client once and isActive() reflects it", async () => {
    const { ctx, client } = makeCtx();
    expect(ctx.isActive()).toBe(true);
    ctx.release();
    ctx.release();
    expect(client.released).toBe(1);
    expect(ctx.isActive()).toBe(false);
  });
});

describe("TransactionError", () => {
  it("captures message, name and optional cause", () => {
    const cause = new Error("root");
    const err = new TransactionError("wrapped", cause);
    expect(err.name).toBe("TransactionError");
    expect(err.message).toBe("wrapped");
    expect(err.cause).toBe(cause);
  });

  it("allows omitting the cause", () => {
    const err = new TransactionError("no cause");
    expect(err.name).toBe("TransactionError");
    expect(err.cause).toBeUndefined();
  });
});

describe("TransactionContextError", () => {
  it("is an Error carrying its message and a distinct name", () => {
    const err = new TransactionContextError("no active transaction context");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("TransactionContextError");
    expect(err.message).toBe("no active transaction context");
  });
});
