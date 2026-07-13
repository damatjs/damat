import { describe, it, expect, beforeEach, mock } from "bun:test";
import { z } from "@damatjs/deps/zod";
import { PoolManager } from "../../manager/pool";
import { ModuleService } from "../../service/module";

/**
 * Tests for the ModuleService factory.
 *
 * DB mocking strategy: PoolManager.setup() is called with a fake pg pool, then
 * the real PgEntityManager it constructs is immediately overridden via
 * PoolManager.setEntityManager() with a fully controllable fake. The fake EM
 * records registerModel calls, hands out fake repositories, and drives the
 * transaction callback with a fake transactional EM. No DB is touched.
 */

// --- Fakes ------------------------------------------------------------------

function fakeModel(name: string) {
  return {
    _name: name,
    _deletedAtField: "deleted_at",
    toTableSchema: () => ({ relations: [] }),
  } as any;
}

interface FakeEM {
  registered: Array<{ name: string; model: any }>;
  registerModel: ReturnType<typeof mock>;
  getRepository: ReturnType<typeof mock>;
  transaction: ReturnType<typeof mock>;
  txEm: any;
  txOptions: any;
}

function makeFakeEM(): FakeEM {
  const em: FakeEM = {
    registered: [],
    txEm: { getRepository: mock(() => ({ tx: true })) },
    txOptions: undefined,
    registerModel: mock((name: string, model: any) => {
      em.registered.push({ name, model });
    }),
    getRepository: mock(() => ({ tx: false })),
    transaction: mock(async (cb: any, options?: any) => {
      em.txOptions = options;
      return cb(em.txEm);
    }),
  };
  return em;
}

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as any;

/** Initialize PoolManager and swap in a fake entity manager. */
function initWithFakeEM(): FakeEM {
  const em = makeFakeEM();
  PoolManager.setup({
    pool: {} as any,
    logger: noopLogger,
    connectionManager: null as any,
  });
  PoolManager.setEntityManager(em as any);
  return em;
}

// --- Tests ------------------------------------------------------------------

describe("ModuleService factory", () => {
  beforeEach(() => {
    PoolManager.reset();
  });

  describe("guard: PoolManager must be initialized", () => {
    it("throws on instantiation when PoolManager is not initialized", () => {
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      expect(() => new (Base as any)()).toThrow(
        "PoolManager not initialized. Call PoolManager.setup(pool) before creating service instances.",
      );
    });
  });

  describe("construction", () => {
    it("registers every configured model with the entity manager", () => {
      const em = initWithFakeEM();
      const Base = ModuleService({
        models: { User: fakeModel("user"), Post: fakeModel("post") },
      });
      new (Base as any)();
      expect(em.registerModel).toHaveBeenCalledTimes(2);
      expect(em.registered.map((r) => r.name)).toEqual(["User", "Post"]);
    });

    it("populates `models` with the model definitions", () => {
      initWithFakeEM();
      const user = fakeModel("user");
      const post = fakeModel("post");
      const Base = ModuleService({ models: { User: user, Post: post } });
      const svc: any = new (Base as any)();
      expect(svc.models).toEqual([user, post]);
      expect(svc.getModels).toEqual([user, post]);
    });

    it("starts with inTransaction = false", () => {
      initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();
      expect(svc.inTransaction).toBe(false);
    });

    it("exposes the entity manager via the `em` getter", () => {
      const em = initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();
      expect(svc.em).toBe(em);
    });
  });

  describe("credentials schema", () => {
    it("parses and stores valid credentials", () => {
      initWithFakeEM();
      const Base = ModuleService({
        models: { User: fakeModel("user") },
        credentialsSchema: z.object({ token: z.string(), retries: z.number() }),
      });
      const svc: any = new (Base as any)({ token: "abc", retries: 3 });
      expect(svc.credentials).toEqual({ token: "abc", retries: 3 });
    });

    it("throws when credentials fail schema validation", () => {
      initWithFakeEM();
      const Base = ModuleService({
        models: { User: fakeModel("user") },
        credentialsSchema: z.object({ token: z.string() }),
      });
      expect(() => new (Base as any)({ token: 123 })).toThrow();
    });

    it("leaves credentials undefined when no schema is configured", () => {
      initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();
      expect(svc.credentials).toBeUndefined();
    });
  });

  describe("camelCase model accessors", () => {
    it("exposes a camelCased accessor per model returning ModelMethods", () => {
      initWithFakeEM();
      const Base = ModuleService({
        models: { User: fakeModel("user"), BlogPost: fakeModel("blog_post") },
      });
      const svc: any = new (Base as any)();
      expect(svc.user).toBeDefined();
      expect(typeof svc.user.find).toBe("function");
      // "BlogPost" -> only first char lowercased per toCamelCase
      expect(svc.blogPost).toBeDefined();
      expect(typeof svc.blogPost.create).toBe("function");
    });

    it("returns the same ModelMethods instance registered during construction", () => {
      initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();
      const first = svc.user;
      const second = svc.user;
      expect(first).toBe(second);
    });

    it("exposes the model definition through the accessor's ModelMethods", () => {
      initWithFakeEM();
      const user = fakeModel("user");
      const Base = ModuleService({ models: { User: user } });
      const svc: any = new (Base as any)();
      expect(svc.user.getModelDefinition()).toBe(user);
    });
  });

  describe("transaction()", () => {
    it("runs the callback inside em.transaction and returns its result", async () => {
      const em = initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();

      const result = await svc.transaction(async () => "done");

      expect(result).toBe("done");
      expect(em.transaction).toHaveBeenCalledTimes(1);
    });

    it("forwards transaction options to the entity manager", async () => {
      const em = initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();

      await svc.transaction(async () => null, {
        isolationLevel: "SERIALIZABLE",
      });

      expect(em.txOptions).toEqual({ isolationLevel: "SERIALIZABLE" });
    });

    it("resets inTransaction to false after a successful transaction", async () => {
      initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();

      let inside = false;
      await svc.transaction(async () => {
        inside = svc.inTransaction;
      });

      expect(inside).toBe(true); // flag set during the callback
      expect(svc.inTransaction).toBe(false); // restored afterwards
    });

    it("resets inTransaction to false even when the callback throws", async () => {
      initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();

      await expect(
        svc.transaction(async () => {
          throw new Error("rollback me");
        }),
      ).rejects.toThrow("rollback me");

      expect(svc.inTransaction).toBe(false);
    });

    it("wires the transactional EM onto the model methods during the callback, then clears it", async () => {
      initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();

      const methods = svc.user;
      const setTx = mock(() => {});
      methods.setTransactionalEm = setTx;

      await svc.transaction(async () => "ok");

      // Called once with the tx EM, then once with null to clear it.
      expect(setTx).toHaveBeenCalledTimes(2);
      const calls = setTx.mock.calls;
      expect(calls[0][0]).not.toBeNull();
      expect(calls[1][0]).toBeNull();
    });

    it("does not re-open a nested transaction when already in one", async () => {
      const em = initWithFakeEM();
      const Base = ModuleService({ models: { User: fakeModel("user") } });
      const svc: any = new (Base as any)();
      svc.inTransaction = true;

      const result = await svc.transaction(async () => "nested");

      expect(result).toBe("nested");
      // Because we were already in a transaction, em.transaction is bypassed.
      expect(em.transaction).not.toHaveBeenCalled();
    });
  });
});
