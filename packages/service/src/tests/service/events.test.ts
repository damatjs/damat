import { describe, it, expect, beforeEach, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Mock the events boundary: the bus itself is tested for real in
// @damatjs/events; here we test the PROXY logic — which writes emit which
// event, the payload shape, awaited emission, and reads staying untouched.
// ---------------------------------------------------------------------------
const eventState = {
  emitted: [] as Array<{ event: string; payload: unknown }>,
  order: [] as string[],
  emitSettled: false,
};

const fakeBus = {
  emit: (event: string, payload: unknown) => {
    eventState.order.push(`emit:${event}`);
    return new Promise<number>((resolve) => {
      // Settle asynchronously so an un-awaited emit would still be pending
      // when the wrapped write returns — the settled flag proves the await.
      setTimeout(() => {
        eventState.emitted.push({ event, payload });
        eventState.emitSettled = true;
        resolve(1);
      }, 5);
    });
  },
};

mock.module("@damatjs/events", () => ({
  getEventBus: () => fakeBus,
}));

import { withModelEvents, modelEventName } from "../../service/events";
import type { ModelMethods } from "../../service/methods";

/** A recording stand-in exposing every write, some reads, and a non-CRUD member. */
function makeStub() {
  const stub = {
    calls: [] as Array<{ method: string; args: unknown[] }>,
    transactionalEm: null as unknown,
    notAFunction: 42,
    // reads — must never emit
    async findMany(options?: unknown) {
      stub.calls.push({ method: "findMany", args: [options] });
      return [{ id: 1 }];
    },
    async findById(id: unknown) {
      stub.calls.push({ method: "findById", args: [id] });
      return { id };
    },
    async count() {
      stub.calls.push({ method: "count", args: [] });
      return 0;
    },
    // writes — one per WRITE_EVENT_KINDS entry, each with a distinct result
    async create(options?: unknown) {
      stub.calls.push({ method: "create", args: [options] });
      return { id: 1, created: true };
    },
    async createMany() {
      stub.calls.push({ method: "createMany", args: [] });
      return [{ id: 1 }, { id: 2 }];
    },
    async upsert() {
      stub.calls.push({ method: "upsert", args: [] });
      return { id: 3, upserted: true };
    },
    async upsertMany() {
      stub.calls.push({ method: "upsertMany", args: [] });
      return [{ id: 4 }];
    },
    async update() {
      stub.calls.push({ method: "update", args: [] });
      return 2; // affected count
    },
    async updateOne() {
      stub.calls.push({ method: "updateOne", args: [] });
      return { id: 5, updated: true };
    },
    async restore() {
      stub.calls.push({ method: "restore", args: [] });
      return { id: 6, deletedAt: null };
    },
    async delete() {
      stub.calls.push({ method: "delete", args: [] });
      return 1;
    },
    async softDelete() {
      stub.calls.push({ method: "softDelete", args: [] });
      return { id: 7, deletedAt: new Date() };
    },
    setTransactionalEm(tx: unknown) {
      stub.transactionalEm = tx;
    },
  };
  return stub;
}

const wrap = (stub: ReturnType<typeof makeStub>, model = "user") =>
  withModelEvents(
    stub as unknown as ModelMethods,
    model,
  ) as unknown as ReturnType<typeof makeStub>;

beforeEach(() => {
  eventState.emitted.length = 0;
  eventState.order.length = 0;
  eventState.emitSettled = false;
});

describe("modelEventName", () => {
  it("joins model and kind with a dot", () => {
    expect(modelEventName("user", "created")).toBe("user.created");
    expect(modelEventName("order_item", "updated")).toBe("order_item.updated");
    expect(modelEventName("invoice", "deleted")).toBe("invoice.deleted");
  });
});

describe("withModelEvents — write emissions", () => {
  const expectedKinds = {
    create: "created",
    createMany: "created",
    upsert: "updated",
    upsertMany: "updated",
    update: "updated",
    updateOne: "updated",
    restore: "updated",
    delete: "deleted",
    softDelete: "deleted",
  } as const;

  for (const [method, kind] of Object.entries(expectedKinds)) {
    it(`${method}() emits user.${kind} with { model, method, result }`, async () => {
      const stub = makeStub();
      const wrapped = wrap(stub);

      const result = await (
        wrapped[method as keyof typeof wrapped] as () => Promise<unknown>
      )();

      // The underlying write ran once and its result came back unchanged.
      expect(stub.calls.map((c) => c.method)).toEqual([method]);
      expect(eventState.emitted).toHaveLength(1);
      expect(eventState.emitted[0]!.event).toBe(`user.${kind}`);
      expect(eventState.emitted[0]!.payload).toEqual({
        model: "user",
        method,
        result,
      });
    });
  }

  it("passes the write's arguments through untouched", async () => {
    const stub = makeStub();
    const wrapped = wrap(stub);

    await wrapped.create({ data: { name: "Ada" } } as never);

    expect(stub.calls[0]!.args).toEqual([{ data: { name: "Ada" } }]);
  });

  it("uses the wrapped model's name in the event", async () => {
    const stub = makeStub();
    const wrapped = wrap(stub, "invoice");

    await wrapped.delete();

    expect(eventState.emitted[0]!.event).toBe("invoice.deleted");
    expect(eventState.emitted[0]!.payload).toMatchObject({ model: "invoice" });
  });

  it("returns the write result unchanged (emit's return is discarded)", async () => {
    const stub = makeStub();
    const wrapped = wrap(stub);

    expect(await wrapped.create()).toEqual({ id: 1, created: true });
    expect(await wrapped.update()).toBe(2);
    expect(await wrapped.delete()).toBe(1);
  });

  it("AWAITS the emission, after the underlying write", async () => {
    const stub = makeStub();
    const wrapped = wrap(stub);

    await wrapped.create();

    // emit was started after the write recorded its call…
    expect(eventState.order).toEqual(["emit:user.created"]);
    expect(stub.calls.map((c) => c.method)).toEqual(["create"]);
    // …and the (deliberately slow) emit promise settled before create returned.
    expect(eventState.emitSettled).toBe(true);
    expect(eventState.emitted).toHaveLength(1);
  });
});

describe("withModelEvents — reads and non-CRUD members", () => {
  it("reads pass through without emitting", async () => {
    const stub = makeStub();
    const wrapped = wrap(stub);

    expect(await wrapped.findMany({ where: {} })).toEqual([{ id: 1 }]);
    expect(await wrapped.findById(9)).toEqual({ id: 9 });
    expect(await wrapped.count()).toBe(0);

    expect(eventState.emitted).toHaveLength(0);
    expect(eventState.order).toHaveLength(0);
    expect(stub.calls.map((c) => c.method)).toEqual([
      "findMany",
      "findById",
      "count",
    ]);
  });

  it("leaves non-CRUD functions and plain properties untouched", async () => {
    const stub = makeStub();
    const wrapped = wrap(stub);

    wrapped.setTransactionalEm("tx");
    expect(stub.transactionalEm).toBe("tx");
    expect(wrapped.notAFunction).toBe(42);

    expect(eventState.emitted).toHaveLength(0);
  });
});
