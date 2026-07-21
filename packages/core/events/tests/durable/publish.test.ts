import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  defineDurableEvent,
  getDurableEvent,
  listDurableEventActivity,
  publishDurableEvent,
} from "../../src";
import {
  durability,
  ensureEventStorage,
  pool,
  uniqueEvent,
} from "./storage-context";

beforeEach(async () => {
  await ensureEventStorage();
  clearDurableEventDefinitions();
});

test("publish persists policy, metadata, lineage, delay, and activity", async () => {
  const name = uniqueEvent("account.created");
  defineDurableEvent(name, { maxAttempts: 5, version: 2 });
  const before = Date.now();
  const event = await publishDurableEvent(
    name,
    { id: "a1" },
    {
      metadata: { source: "signup" },
      correlationId: "corr-1",
      causationId: "cause-1",
      delayMs: 5_000,
    },
  );
  expect(event).toMatchObject({
    name,
    payload: { id: "a1" },
    metadata: { source: "signup" },
    policyVersion: 2,
    correlationId: "corr-1",
    causationId: "cause-1",
  });
  expect(event.availableAt.getTime()).toBeGreaterThanOrEqual(before + 4_900);
  expect(await listDurableEventActivity(event.id)).toMatchObject([
    { type: "published" },
  ]);
});

test("duplicate idempotent publish returns the original event", async () => {
  const name = uniqueEvent("invoice.paid");
  const first = await publishDurableEvent(
    name,
    { amount: 1 },
    {
      idempotencyKey: "provider-1",
    },
  );
  const duplicate = await publishDurableEvent(
    name,
    { amount: 2 },
    {
      idempotencyKey: "provider-1",
    },
  );
  expect(duplicate.id).toBe(first.id);
  expect(duplicate.payload).toEqual({ amount: 1 });
  expect(await listDurableEventActivity(first.id)).toHaveLength(1);
});

test("supplied transaction executor owns publish atomicity", async () => {
  const name = uniqueEvent("rollback");
  let id = "";
  await expect(
    durability.transaction(async (executor) => {
      id = (await publishDurableEvent(name, {}, { executor })).id;
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(await getDurableEvent(id)).toBeUndefined();
  const signals = await pool.query(
    `SELECT 1 FROM "_damat_acceleration_outbox" WHERE "resource_id"=$1`,
    [id],
  );
  expect(signals.rowCount).toBe(0);
});

test("publish rejects a non-transactional supplied executor", async () => {
  let queries = 0;
  const executor = { query: async () => ({ rows: [], rowCount: queries++ }) };
  await expect(
    publishDurableEvent(uniqueEvent("invalid"), {}, { executor }),
  ).rejects.toThrow(/transaction/i);
  expect(queries).toBe(0);
});

test("durable publish rejects wildcard events before SQL", async () => {
  await expect(publishDurableEvent("*", {})).rejects.toThrow(/wildcard/i);
});
