import { describe, it, expect, beforeEach, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Mock the redis boundary: the tagged-cache primitives are tested for real in
// @damatjs/redis (against FakeRedis); here we test the PROXY logic — opt-in
// semantics, key stability, stripping, invalidation, fail-open behavior.
// ---------------------------------------------------------------------------
const redisState = {
  has: true,
  store: new Map<string, unknown>(),
  setCalls: [] as Array<{
    key: string;
    value: unknown;
    ttl: number;
    tags: string[];
  }>,
  invalidations: [] as string[][],
  getThrows: false,
  setThrows: false,
  invalidateThrows: false,
};

mock.module("@damatjs/redis", () => ({
  hasRedis: () => redisState.has,
  cacheGet: async (key: string) => {
    if (redisState.getThrows) throw new Error("redis get down");
    return redisState.store.has(key) ? redisState.store.get(key) : null;
  },
  cacheSetTagged: async (
    key: string,
    value: unknown,
    ttl: number,
    tags: string[],
  ) => {
    if (redisState.setThrows) throw new Error("redis set down");
    redisState.store.set(key, value);
    redisState.setCalls.push({ key, value, ttl, tags });
  },
  invalidateCacheTags: async (tags: string[]) => {
    if (redisState.invalidateThrows) throw new Error("redis invalidate down");
    redisState.invalidations.push(tags);
    redisState.store.clear();
    return 0;
  },
}));

import { withTaggedCache, modelCacheTag } from "../../service/cache";
import type { ModelMethods } from "../../service/methods";

/** A recording stand-in with the read/write surface the proxy wraps. */
function makeStub() {
  const stub = {
    calls: [] as Array<{ method: string; args: unknown[] }>,
    transactionalEm: null as unknown,
    nextFindMany: [{ id: 1 }] as unknown,
    async findMany(options?: unknown) {
      stub.calls.push({ method: "findMany", args: [options] });
      return stub.nextFindMany;
    },
    async find(options?: unknown) {
      stub.calls.push({ method: "find", args: [options] });
      return null; // negative result by default
    },
    async findById(id: unknown, options?: unknown) {
      stub.calls.push({ method: "findById", args: [id, options] });
      return { id };
    },
    async exists(options?: unknown) {
      stub.calls.push({ method: "exists", args: [options] });
      return false;
    },
    async count(options?: unknown) {
      stub.calls.push({ method: "count", args: [options] });
      return 0;
    },
    async create(options?: unknown) {
      stub.calls.push({ method: "create", args: [options] });
      return { id: 9 };
    },
    async delete(options?: unknown) {
      stub.calls.push({ method: "delete", args: [options] });
      return 1;
    },
    setTransactionalEm(tx: unknown) {
      stub.transactionalEm = tx;
    },
  };
  return stub;
}

const wrap = (stub: ReturnType<typeof makeStub>, config = {}) =>
  withTaggedCache(
    stub as unknown as ModelMethods,
    "user",
    config,
  ) as unknown as ReturnType<typeof makeStub>;

beforeEach(() => {
  redisState.has = true;
  redisState.store.clear();
  redisState.setCalls.length = 0;
  redisState.invalidations.length = 0;
  redisState.getThrows = false;
  redisState.setThrows = false;
  redisState.invalidateThrows = false;
});

describe("modelCacheTag", () => {
  it("derives the implicit tag from the model name", () => {
    expect(modelCacheTag("user")).toBe("model:user");
  });
});

describe("withTaggedCache — opt-in reads", () => {
  it("does NOT cache without a per-call cache option", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.findMany({ where: { a: 1 } });
    await cached.findMany({ where: { a: 1 } });
    expect(stub.calls).toHaveLength(2);
    expect(redisState.setCalls).toHaveLength(0);
  });

  it("cache: true caches the result and serves the second call from redis", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    const first = await cached.findMany({
      where: { a: 1 },
      cache: true,
    } as never);
    const second = await cached.findMany({
      where: { a: 1 },
      cache: true,
    } as never);
    expect(stub.calls).toHaveLength(1); // only the miss hit the database
    expect(second).toEqual(first);
    expect(redisState.setCalls).toHaveLength(1);
    expect(redisState.setCalls[0]!.ttl).toBe(60); // default TTL
    expect(redisState.setCalls[0]!.tags).toEqual(["model:user"]);
  });

  it("honors per-call ttl/tags and the service defaultTtl/prefix", async () => {
    const stub = makeStub();
    const cached = wrap(stub, { defaultTtl: 120, prefix: "shop" });
    await cached.findMany({ cache: { ttl: 5, tags: ["storefront"] } } as never);
    expect(redisState.setCalls[0]!.ttl).toBe(5);
    expect(redisState.setCalls[0]!.tags).toEqual(["model:user", "storefront"]);
    expect(redisState.setCalls[0]!.key.startsWith("shop:user:findMany:")).toBe(
      true,
    );

    await cached.count({ cache: true } as never);
    expect(redisState.setCalls[1]!.ttl).toBe(120); // service default
  });

  it("strips the cache option before the underlying method sees it", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.findMany({ where: { a: 1 }, cache: true } as never);
    expect(stub.calls[0]!.args[0]).toEqual({ where: { a: 1 } });
  });

  it("addresses {a,b} and {b,a} filters as the same entry (stable keys)", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.findMany({ where: { a: 1, b: 2 }, cache: true } as never);
    await cached.findMany({ where: { b: 2, a: 1 }, cache: true } as never);
    expect(stub.calls).toHaveLength(1);
  });

  it("findById keys include the id (options are the SECOND argument)", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.findById(1, { cache: true } as never);
    await cached.findById(2, { cache: true } as never);
    await cached.findById(1, { cache: true } as never); // hit
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[0]!.args[1]).toEqual({}); // cache stripped from options
  });

  it("does not cache null results (a miss is indistinguishable from a cached null)", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.find({ where: { id: 404 }, cache: true } as never);
    await cached.find({ where: { id: 404 }, cache: true } as never);
    expect(stub.calls).toHaveLength(2);
    expect(redisState.setCalls).toHaveLength(0);
  });

  it("DOES cache falsy-but-valid results (exists false, count 0)", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    expect(
      await cached.exists({ where: { id: 1 }, cache: true } as never),
    ).toBe(false);
    expect(
      await cached.exists({ where: { id: 1 }, cache: true } as never),
    ).toBe(false);
    expect(await cached.count({ cache: true } as never)).toBe(0);
    expect(await cached.count({ cache: true } as never)).toBe(0);
    // one database call each — the falsy values were served from cache
    expect(stub.calls.filter((c) => c.method === "exists")).toHaveLength(1);
    expect(stub.calls.filter((c) => c.method === "count")).toHaveLength(1);
  });

  it("bypasses the cache inside a transaction (must see its own writes)", async () => {
    const stub = makeStub();
    stub.transactionalEm = {};
    const cached = wrap(stub);
    await cached.findMany({ cache: true } as never);
    await cached.findMany({ cache: true } as never);
    expect(stub.calls).toHaveLength(2);
    expect(redisState.setCalls).toHaveLength(0);
  });

  it("bypasses the cache when redis is not initialized", async () => {
    redisState.has = false;
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.findMany({ cache: true } as never);
    expect(stub.calls).toHaveLength(1);
    expect(redisState.setCalls).toHaveLength(0);
  });

  it("falls through to the database when the cache read fails (fail-open)", async () => {
    redisState.getThrows = true;
    const stub = makeStub();
    const cached = wrap(stub);
    const rows = await cached.findMany({ cache: true } as never);
    expect(rows).toEqual([{ id: 1 }]);
    expect(stub.calls).toHaveLength(1);
  });

  it("still returns the database result when the cache write fails", async () => {
    redisState.setThrows = true;
    const stub = makeStub();
    const cached = wrap(stub);
    const rows = await cached.findMany({ cache: true } as never);
    expect(rows).toEqual([{ id: 1 }]);
  });
});

describe("withTaggedCache — write invalidation", () => {
  it("create/delete invalidate the model tag so stale reads are dropped", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.findMany({ cache: true } as never);
    expect(redisState.store.size).toBe(1);

    await cached.create({ data: { name: "x" } } as never);
    expect(redisState.invalidations).toEqual([["model:user"]]);
    expect(redisState.store.size).toBe(0);

    await cached.delete({ where: { id: 1 } } as never);
    expect(redisState.invalidations).toHaveLength(2);
  });

  it("skips invalidation when redis is not initialized", async () => {
    redisState.has = false;
    const stub = makeStub();
    const cached = wrap(stub);
    await cached.create({ data: {} } as never);
    expect(redisState.invalidations).toHaveLength(0);
  });

  it("a failing invalidation never fails the write", async () => {
    redisState.invalidateThrows = true;
    const stub = makeStub();
    const cached = wrap(stub);
    const created = await cached.create({ data: {} } as never);
    expect(created).toEqual({ id: 9 });
  });

  it("leaves non-CRUD members untouched", async () => {
    const stub = makeStub();
    const cached = wrap(stub);
    cached.setTransactionalEm("tx");
    expect(stub.transactionalEm).toBe("tx");
  });
});
