import { afterEach, expect, test } from "bun:test";
import {
  clearAccelerationController,
  clearDurableInvalidationListeners,
  configureAccelerationController,
  emitDurableInvalidation,
  rebuildAccelerationProjection,
  requestAccelerationFlush,
  subscribeDurableInvalidations,
} from "../../src";

afterEach(() => {
  clearAccelerationController();
  clearDurableInvalidationListeners();
});

test("rebuilds use an attributed configured controller", async () => {
  const actors: unknown[] = [];
  configureAccelerationController({
    rebuild: async (actor) => void actors.push(actor),
  });
  const actor = { id: "operator", type: "user" as const, reason: "repair" };
  await rebuildAccelerationProjection(actor);
  expect(actors).toEqual([actor]);
});

test("rebuilds require attribution and a configured controller", async () => {
  expect(() => rebuildAccelerationProjection({
    id: " ",
    type: "user",
    reason: "repair",
  })).toThrow("actor and reason");
  expect(() => rebuildAccelerationProjection({
    id: "operator",
    type: "user",
    reason: "repair",
  })).toThrow("not configured");
});

test("flush requests are optional and contain relay failures", async () => {
  requestAccelerationFlush();
  configureAccelerationController({ rebuild: async () => {} });
  requestAccelerationFlush();
  let flushes = 0;
  configureAccelerationController({
    rebuild: async () => {},
    flush: async () => void flushes++,
  });
  requestAccelerationFlush();
  await Promise.resolve();
  expect(flushes).toBe(1);
  configureAccelerationController({
    rebuild: async () => {},
    flush: async () => {
      throw new Error("temporary relay failure");
    },
  });
  expect(() => requestAccelerationFlush()).not.toThrow();
  await Promise.resolve();
});

test("invalidation listeners can subscribe, unsubscribe, and clear", () => {
  const revisions: string[] = [];
  const unsubscribe = subscribeDurableInvalidations((event) => {
    revisions.push(event.revision);
  });
  emitDurableInvalidation({ kind: "job", revision: "1" });
  unsubscribe();
  emitDurableInvalidation({ kind: "job", revision: "2" });
  subscribeDurableInvalidations((event) => revisions.push(event.revision));
  clearDurableInvalidationListeners();
  emitDurableInvalidation({ kind: "event", revision: "3" });
  expect(revisions).toEqual(["1"]);
});
