import { beforeEach, expect, expectTypeOf, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEvent,
  publishDurableEvent,
  type DurableEventHandlerContext,
} from "../../src";
import { ensureEventStorage, uniqueEvent } from "./storage-context";
import { withIdempotency } from "@damatjs/durability";
import type { DurabilityExecutor } from "@damatjs/durability";
import { durability } from "./storage-context";

beforeEach(async () => {
  await ensureEventStorage();
  clearDurableEventDefinitions();
});

test("publish snapshots every resolved event policy field", async () => {
  const name = uniqueEvent("snapshot");
  defineDurableEvent(name, {
    version: 6,
    maxAttempts: 8,
    backoffMs: 2_500,
    backoffMultiplier: 1.5,
    retentionMs: 99_000,
  });
  const event = await publishDurableEvent(name, {});
  expect(event).toMatchObject({
    policyVersion: 6,
    maxAttempts: 8,
    backoffMs: 2_500,
    backoffMultiplier: 1.5,
    retentionMs: 99_000,
  });
});

test("publish rejects blank and wildcard-pattern event names", async () => {
  await expect(publishDurableEvent(" ", {})).rejects.toThrow(/required/i);
  await expect(publishDurableEvent("account.*", {})).rejects.toThrow(
    /wildcard/i,
  );
});

test("publish rejects invalid availability values before SQL", async () => {
  await expect(
    publishDurableEvent(
      uniqueEvent("invalid-date"),
      {},
      {
        availableAt: "tomorrow" as unknown as Date,
      },
    ),
  ).rejects.toThrow(/Date/);
  await expect(
    publishDurableEvent(
      uniqueEvent("invalid-date"),
      {},
      {
        availableAt: new Date(Number.NaN),
      },
    ),
  ).rejects.toThrow(/Date/);
});

test("handler context exposes the shared idempotency operation", () => {
  expectTypeOf<DurableEventHandlerContext["withIdempotency"]>().toEqualTypeOf<
    typeof withIdempotency
  >();
});

test("publish rejects a captured executor after its transaction ends", async () => {
  let captured: DurabilityExecutor | undefined;
  await durability.transaction(async (executor) => {
    captured = executor;
  });
  await expect(
    publishDurableEvent(uniqueEvent("inactive"), {}, { executor: captured! }),
  ).rejects.toThrow(/transaction/i);
});

test("durable publish succeeds without Redis initialization", async () => {
  const event = await publishDurableEvent(uniqueEvent("postgres-only"), {});
  expect(event.id).toBeString();
});
