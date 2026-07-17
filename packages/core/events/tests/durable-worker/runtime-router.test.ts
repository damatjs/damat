import { beforeEach, expect, test } from "bun:test";
import {
  clearDurableEventDefinitions,
  DurableEventRouter,
  publishDurableEvent,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("router keeps PostgreSQL polling without Redis", async () => {
  const router = new DurableEventRouter({
    pollIntervalMs: 10,
    retryIntervalMs: 10,
    batchSize: 10,
  });
  router.start();
  const event = await publishDurableEvent(uniqueEvent("router-poll"), {});
  await waitUntil(async () => {
    const row = await pool.query(
      `SELECT "routed_at" FROM "_damat_event_outbox" WHERE "id"=$1`,
      [event.id],
    );
    return row.rows[0].routed_at instanceof Date;
  });
  await router.stop();
  expect(router.isRunning).toBe(false);
});

test("router validates bounded numeric options", () => {
  expect(() => new DurableEventRouter({ pollIntervalMs: 0 })).toThrow(
    /pollIntervalMs/,
  );
  expect(() => new DurableEventRouter({ batchSize: 1_001 })).toThrow(
    /batchSize/,
  );
  expect(
    () => new DurableEventRouter({ pollIntervalMs: 2_147_483_648 }),
  ).toThrow(/pollIntervalMs/);
  expect(
    () => new DurableEventRouter({ retryIntervalMs: 2_147_483_648 }),
  ).toThrow(/retryIntervalMs/);
});

test("router start, wake, and stop are idempotent", async () => {
  const router = new DurableEventRouter({ pollIntervalMs: 10 });
  router.wake();
  await router.stop();
  router.start();
  router.start();
  expect(router.isRunning).toBe(true);
  await router.stop();
  await router.stop();
});
