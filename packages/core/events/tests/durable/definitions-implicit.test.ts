import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEvent,
  defineDurableEventHandler,
  getDurableEventConsumer,
  getDurableEventDefinition,
} from "../../src";

beforeEach(clearDurableEventDefinitions);

test("an explicit definition upgrades handler-created defaults once", () => {
  defineDurableEventHandler("account.created", "audit", async () => {}, {
    backoffMs: 25,
  });
  const definition = defineDurableEvent("account.created", {
    version: 3,
    maxAttempts: 7,
  });
  expect(definition.policy.version).toBe(3);
  expect(definition.policy.maxAttempts).toBe(7);
  expect(getDurableEventConsumer("account.created", "audit")).toBeDefined();
  expect(getDurableEventConsumer("account.created", "audit")?.options).toEqual({
    maxAttempts: 7,
    backoffMs: 25,
    backoffMultiplier: 2,
  });
  expect(() => defineDurableEvent("account.created")).toThrow(
    /already defined/,
  );
});

test("explicit undefined policy values preserve defaults", () => {
  const definition = defineDurableEvent("account.created", {
    version: undefined,
    maxAttempts: undefined,
  });
  expect(definition.policy.version).toBe(1);
  expect(definition.policy.maxAttempts).toBe(3);
});

test("consumer retry options never replace the event policy version", () => {
  defineDurableEvent("account.created", { version: 8, retentionMs: 10_000 });
  const consumer = defineDurableEventHandler(
    "account.created",
    "audit",
    async () => {},
    { maxAttempts: 9 },
  );
  expect(consumer.options).toEqual({
    maxAttempts: 9,
    backoffMs: 1_000,
    backoffMultiplier: 2,
  });
  expect(getDurableEventDefinition("account.created")?.policy.version).toBe(8);
});

test("blank and wildcard-pattern names are rejected", () => {
  expect(() => defineDurableEvent("   ")).toThrow(/required/i);
  expect(() => defineDurableEvent("account.*")).toThrow(/wildcard/i);
  expect(() =>
    defineDurableEventHandler("account.created", "audit*", async () => {}),
  ).toThrow(/wildcard/i);
});
