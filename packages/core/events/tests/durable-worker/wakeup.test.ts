import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  clearEventWakeupPublisher,
  configureEventWakeupPublisher,
  defineDurableEventHandler,
  parseEventWakeup,
  publishDurableEvent,
  routeDurableEvents,
} from "../../src";
import { durability, resetWorkerStorage, uniqueEvent } from "./context";

const messages: string[] = [];

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
  clearEventWakeupPublisher();
  messages.length = 0;
  configureEventWakeupPublisher({
    publish: async (_channel, message) => messages.push(message),
  });
});

afterEach(clearEventWakeupPublisher);

test("owned publish wakes router after commit", async () => {
  await publishDurableEvent(uniqueEvent("wake"), {});
  expect(messages.map(parseEventWakeup)).toEqual([
    { kind: "events", target: "router" },
  ]);
});

test("supplied transaction publishes no premature wake-up", async () => {
  await durability.transaction(async (executor) => {
    await publishDurableEvent(uniqueEvent("owned-by-caller"), {}, { executor });
    expect(messages).toEqual([]);
  });
  expect(messages).toEqual([]);
});

test("router wakes each exact consumer only after fan-out commit", async () => {
  const name = uniqueEvent("fanout-wake");
  defineDurableEventHandler(name, "email", async () => {});
  defineDurableEventHandler(name, "audit", async () => {});
  await publishDurableEvent(name, {});
  messages.length = 0;
  await routeDurableEvents();
  expect(messages.map(parseEventWakeup)).toEqual([
    { kind: "events", target: "delivery", event: name, consumer: "email" },
    { kind: "events", target: "delivery", event: name, consumer: "audit" },
  ]);
});

test("malformed and extra-field messages are rejected", () => {
  expect(parseEventWakeup("not-json")).toBeUndefined();
  expect(
    parseEventWakeup('{"kind":"events","target":"router","x":1}'),
  ).toBeUndefined();
  expect(
    parseEventWakeup('{"kind":"events","target":"delivery"}'),
  ).toBeUndefined();
  expect(parseEventWakeup('{"kind":"jobs","target":"router"}')).toBeUndefined();
});

test("Redis publication failure never fails PostgreSQL publishing", async () => {
  configureEventWakeupPublisher({
    publish: async () => {
      throw new Error("redis down");
    },
  });
  await expect(
    publishDurableEvent(uniqueEvent("fallback"), {}),
  ).resolves.toMatchObject({ name: expect.stringContaining("fallback") });
});
