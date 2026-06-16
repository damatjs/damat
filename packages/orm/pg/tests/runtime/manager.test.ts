import { describe, it, expect } from "bun:test";
import { ModelRegistry, ModelRegistryError } from "@damatjs/orm-core";
import {
  PgEntityManager,
  TransactionalEntityManager,
  EntityManagerError,
  QueryExecutionError,
} from "../../src/manager";
import {
  FakePool,
  FakePoolClient,
  UserModel,
  noopLogger,
} from "../helpers/fixtures";

function makeEm(opts: ConstructorParameters<typeof FakePool>[0] = {}) {
  const pool = new FakePool(opts);
  const em = new PgEntityManager({ pool, logger: noopLogger } as any);
  return { em, pool };
}

describe("PgEntityManager — model registration & repositories", () => {
  it("registerModel registers the model and exposes it via getRegisteredModels", () => {
    const { em } = makeEm();
    em.registerModel("user", UserModel);
    expect(em.getRegisteredModels()).toContain("user");
  });

  it("getRepository returns a repository and caches it", () => {
    const { em } = makeEm();
    em.registerModel("user", UserModel);
    const r1 = em.getRepository("user");
    const r2 = em.getRepository("user");
    expect(r1).toBe(r2);
  });

  it("repo() is an alias of getRepository()", () => {
    const { em } = makeEm();
    em.registerModel("user", UserModel);
    expect(em.repo("user")).toBe(em.getRepository("user"));
  });

  it("getRepository throws ModelRegistryError for an unknown model", () => {
    const { em } = makeEm();
    expect(() => em.getRepository("missing")).toThrow(ModelRegistryError);
  });

  it("getPool / getModelRegistry expose internals", () => {
    const { em, pool } = makeEm();
    expect(em.getPool()).toBe(pool as any);
    expect(em.getModelRegistry()).toBeInstanceOf(ModelRegistry);
  });
});

describe("PgEntityManager — repository CRUD wiring", () => {
  it("a registered repository builds the right SQL against the pool", async () => {
    const { em, pool } = makeEm({ rows: [{ id: "u1", email: "a@b.com" }] });
    em.registerModel("user", UserModel);
    const row = await em.getRepository("user").create({
      data: { id: "u1", email: "a@b.com" },
    });
    expect(pool.last.sql).toBe(
      'INSERT INTO "app"."user" ("id", "email") VALUES ($1, $2) RETURNING *',
    );
    expect(row).toEqual({ id: "u1", email: "a@b.com" });
  });
});

describe("PgEntityManager.raw / execute — error mapping", () => {
  it("raw forwards sql + params and returns rows + rowCount", async () => {
    const { em, pool } = makeEm({ rows: [{ n: 1 }], rowCount: 1 });
    const res = await em.raw("SELECT $1::int AS n", [1]);
    expect(pool.last.sql).toBe("SELECT $1::int AS n");
    expect(pool.last.params).toEqual([1]);
    expect(res.rows).toEqual([{ n: 1 }]);
    expect(res.rowCount).toBe(1);
  });

  it("raw wraps driver errors in QueryExecutionError", async () => {
    const { em } = makeEm({ throwOn: () => new Error("relation does not exist") });
    await expect(em.raw("SELECT * FROM nope")).rejects.toThrow(
      QueryExecutionError,
    );
    await expect(em.raw("SELECT * FROM nope")).rejects.toThrow(
      /Query failed: relation does not exist/,
    );
  });

  it("execute() delegates to raw()", async () => {
    const { em, pool } = makeEm({ rows: [{ ok: true }], rowCount: 1 });
    const res = await em.execute("SELECT true AS ok");
    expect(pool.last.sql).toBe("SELECT true AS ok");
    expect(res.rows).toEqual([{ ok: true }]);
  });
});

describe("PgEntityManager.transaction", () => {
  // `transaction()` builds per-transaction repositories from the manager's real
  // source of models — the ModelRegistry — mirroring the non-transactional path
  // (getRepository). The callback runs inside BEGIN/COMMIT and the tx manager
  // exposes working, registry-backed repositories.
  it("runs the callback inside a tx and exposes registry-backed repositories", async () => {
    const { em, pool } = makeEm({ rows: [{ id: "u1" }] });
    em.registerModel("user", UserModel);

    const row = await em.transaction(async (tx) => {
      expect(tx).toBeInstanceOf(TransactionalEntityManager);
      // the registered model is reachable as a dynamic getter…
      const viaGetter = await (tx as any).user.findById("u1");
      // …and via getRepository(), bound to the transaction client.
      const viaRepo = await tx.getRepository("user").findById("u1");
      expect(viaGetter).toEqual({ id: "u1" });
      expect(viaRepo).toEqual({ id: "u1" });
      return "ok";
    });

    expect(row).toBe("ok");
    // The work ran against the pooled client between BEGIN and COMMIT.
    expect(pool.client.sqlLog[0]).toBe("BEGIN");
    expect(pool.client.sqlLog.at(-1)).toBe("COMMIT");
    expect(pool.client.sqlLog).toContain(
      'SELECT * FROM "app"."user" WHERE "id" = $1 LIMIT 1',
    );
  });

  it("rolls back and rethrows when the callback throws", async () => {
    const { em, pool } = makeEm();
    em.registerModel("user", UserModel);
    await expect(
      em.transaction(async () => {
        throw new Error("work failed");
      }),
    ).rejects.toThrow("work failed");
    expect(pool.client.sqlLog).toEqual(["BEGIN", "ROLLBACK"]);
  });
});

describe("TransactionalEntityManager (constructed directly)", () => {
  function makeTx(opts: ConstructorParameters<typeof FakePoolClient>[0] = {}) {
    const registry = new ModelRegistry(noopLogger);
    registry.register("user", UserModel);
    const client = new FakePoolClient(opts);
    // Minimal transaction-context stand-in: getClient + query + savepoints.
    const ctx = {
      getClient: () => client,
      query: async (sql: string, params?: unknown[]) =>
        client.query(sql, params ?? []),
      createSavepoint: async (n: string) => {
        await client.query(`SAVEPOINT ${n}`);
      },
      rollbackToSavepoint: async (n: string) => {
        await client.query(`ROLLBACK TO SAVEPOINT ${n}`);
      },
      releaseSavepoint: async (n: string) => {
        await client.query(`RELEASE SAVEPOINT ${n}`);
      },
    };
    const tx = new TransactionalEntityManager(
      registry,
      ctx as any,
      noopLogger,
      { user: UserModel } as any,
    );
    return { tx, client };
  }

  it("exposes registered models as dynamic getters bound to the tx client", async () => {
    const { tx, client } = makeTx({ rows: [{ id: "u1" }] });
    const row = await (tx as any).user.findById("u1");
    expect(client.last.sql).toBe(
      'SELECT * FROM "app"."user" WHERE "id" = $1 LIMIT 1',
    );
    expect(row).toEqual({ id: "u1" });
  });

  it("getRepository caches the repo and uses the transaction client", () => {
    const { tx } = makeTx();
    const r1 = tx.getRepository("user");
    const r2 = tx.getRepository("user");
    expect(r1).toBe(r2);
  });

  it("getRepository throws ModelRegistryError for unknown model", () => {
    const { tx } = makeTx();
    expect(() => tx.getRepository("ghost")).toThrow(ModelRegistryError);
  });

  it("query / execute go through the transaction context", async () => {
    const { tx, client } = makeTx({ rows: [{ n: 1 }], rowCount: 1 });
    const res = await tx.query("SELECT 1 AS n");
    expect(client.last.sql).toBe("SELECT 1 AS n");
    expect(res.rows).toEqual([{ n: 1 }]);
    const res2 = await tx.execute("SELECT 2 AS n");
    expect(res2.rows).toEqual([{ n: 1 }]);
  });

  it("savepoint helpers delegate to the context", async () => {
    const { tx, client } = makeTx();
    await tx.createSavepoint("sp1");
    await tx.rollbackToSavepoint("sp1");
    await tx.releaseSavepoint("sp1");
    expect(client.sqlLog).toEqual([
      "SAVEPOINT sp1",
      "ROLLBACK TO SAVEPOINT sp1",
      "RELEASE SAVEPOINT sp1",
    ]);
  });
});

describe("manager error types", () => {
  it("EntityManagerError carries message, name and cause", () => {
    const cause = new Error("x");
    const e = new EntityManagerError("msg", cause);
    expect(e.name).toBe("EntityManagerError");
    expect(e.message).toBe("msg");
    expect(e.cause).toBe(cause);
  });

  it("QueryExecutionError carries message, name and cause", () => {
    const cause = new Error("y");
    const e = new QueryExecutionError("msg", cause);
    expect(e.name).toBe("QueryExecutionError");
    expect(e.cause).toBe(cause);
  });
});
