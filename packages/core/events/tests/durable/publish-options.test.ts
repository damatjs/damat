import { beforeAll, expect, test } from "bun:test";
import { defineDurableEvent, publishDurableEvent } from "../../src";
import { ensureEventStorage, uniqueEvent } from "./storage-context";

beforeAll(ensureEventStorage);

test("publish rejects conflicting and invalid scheduling options", async () => {
  const name = uniqueEvent("invalid-schedule");
  await expect(
    publishDurableEvent(name, {}, { delayMs: 1, availableAt: new Date() }),
  ).rejects.toThrow(/either/);
  await expect(publishDurableEvent(name, {}, { delayMs: -1 })).rejects.toThrow(
    /delayMs/,
  );
  await expect(publishDurableEvent(name, {}, { delayMs: 1.5 })).rejects.toThrow(
    /delayMs/,
  );
  await expect(
    publishDurableEvent(name, {}, { idempotencyKey: " " }),
  ).rejects.toThrow(/idempotencyKey/);
});

test("publish rejects an overflowing retention timestamp", async () => {
  const name = uniqueEvent("retention-overflow");
  defineDurableEvent(name, { retentionMs: Number.MAX_SAFE_INTEGER });
  await expect(
    publishDurableEvent(name, {}, { availableAt: new Date(8.64e15) }),
  ).rejects.toThrow(/Date range/);
});
