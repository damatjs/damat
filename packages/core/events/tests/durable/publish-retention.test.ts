import { beforeAll, expect, test } from "bun:test";
import { defineDurableEvent, publishDurableEvent } from "../../src";
import { ensureEventStorage, uniqueEvent } from "./storage-context";

beforeAll(ensureEventStorage);

test("explicit availability and retention policy are snapshotted", async () => {
  const name = uniqueEvent("available");
  const availableAt = new Date(Date.now() + 60_000);
  defineDurableEvent(name, { version: 4, retentionMs: 123_456 });
  const event = await publishDurableEvent(name, {}, { availableAt });
  expect(event.availableAt).toEqual(availableAt);
  expect(event.policyVersion).toBe(4);
  expect(event.retentionAt.getTime() - event.availableAt.getTime()).toBe(
    123_456,
  );
});

test("retention starts after delayed work becomes available", async () => {
  const name = uniqueEvent("long-delay");
  defineDurableEvent(name, { retentionMs: 1_000 });
  const availableAt = new Date(Date.now() + 60_000);
  const event = await publishDurableEvent(name, {}, { availableAt });
  expect(event.retentionAt.getTime()).toBe(availableAt.getTime() + 1_000);
});
