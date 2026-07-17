import { beforeEach, expect, expectTypeOf, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEvent,
  defineDurableEventHandler,
  getDurableEventConsumer,
  getAllDurableEventDefinitions,
  getDurableEventDefinition,
  type DurableEventPayload,
} from "../../src";

declare module "../../src" {
  interface DurableEventMap {
    "account.created": { id: string };
  }
}

beforeEach(clearDurableEventDefinitions);

test("durable event definitions resolve policy defaults", () => {
  const definition = defineDurableEvent("account.created");
  expect(definition.policy).toEqual({
    version: 1,
    maxAttempts: 3,
    backoffMs: 1_000,
    backoffMultiplier: 2,
    retentionMs: 604_800_000,
  });
  expectTypeOf<DurableEventPayload<"account.created">>().toEqualTypeOf<{
    id: string;
  }>();
});

test("consumer names are unique within an event", () => {
  const handler = async () => {};
  defineDurableEventHandler("account.created", "send-email", handler);
  expect(
    getDurableEventConsumer("account.created", "send-email")?.handler,
  ).toBe(handler);
  expect(() =>
    defineDurableEventHandler("account.created", "send-email", async () => {}),
  ).toThrow(/already defined/);
});

test("event names are unique", () => {
  defineDurableEvent("account.created");
  expect(() => defineDurableEvent("account.created")).toThrow(
    /already defined/,
  );
});

test("the same consumer name can serve another event", () => {
  defineDurableEventHandler("account.created", "audit", async () => {});
  expect(() =>
    defineDurableEventHandler("account.updated", "audit", async () => {}),
  ).not.toThrow();
});

test("durable wildcard definitions and handlers are rejected", () => {
  expect(() => defineDurableEvent("*")).toThrow(/wildcard/i);
  expect(() => defineDurableEventHandler("*", "audit", async () => {})).toThrow(
    /wildcard/i,
  );
});

test("registry reset removes event definitions and consumers", () => {
  defineDurableEvent("account.created", { maxAttempts: 7 });
  defineDurableEventHandler("account.created", "audit", async () => {});
  clearDurableEventDefinitions();
  expect(getDurableEventDefinition("account.created")).toBeUndefined();
  expect(getAllDurableEventDefinitions()).toEqual([]);
  expect(() =>
    defineDurableEventHandler("account.created", "audit", async () => {}),
  ).not.toThrow();
});

test("invalid durable policies are rejected", () => {
  expect(() => defineDurableEvent("bad.version", { version: 0 })).toThrow(
    /version/,
  );
  expect(() => defineDurableEvent("bad.backoff", { backoffMs: -1 })).toThrow(
    /backoffMs/,
  );
  expect(() =>
    defineDurableEvent("bad.multiplier", { backoffMultiplier: 0.5 }),
  ).toThrow(/backoffMultiplier/);
  expect(() =>
    defineDurableEvent("bad.retention", { retentionMs: -1 }),
  ).toThrow(/retentionMs/);
});
