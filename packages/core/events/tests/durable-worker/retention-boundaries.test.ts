import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliveryFailure,
  publishDurableEvent,
  routeDurableEvents,
  runEventRetention,
} from "../../src";
import { pool, resetWorkerStorage, uniqueEvent } from "./context";
import { seedDelivery } from "./fixture";

const actor = { id: "retention-boundaries", type: "system" as const };
const future = new Date(Date.now() + 91 * 86_400_000);

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("retention deletion is bounded by its batch size", async () => {
  const events = await Promise.all([
    publishDurableEvent(uniqueEvent("bounded"), {}),
    publishDurableEvent(uniqueEvent("bounded"), {}),
  ]);
  await routeDurableEvents();
  expect(
    await runEventRetention({ actor, batchSize: 1, terminalBefore: future }),
  ).toMatchObject({ deletedEvents: 1 });
  const remaining = await pool.query(
    `SELECT 1 FROM "_damat_event_outbox" WHERE "id"=ANY($1::uuid[])`,
    [events.map(({ id }) => id)],
  );
  expect(remaining.rowCount).toBe(1);
});

test("retention preserves pending, running, retry_wait, and unrouted events", async () => {
  const pending = await seedDelivery({ consumer: "pending" });
  const running = await seedDelivery({ consumer: "running" });
  await claim(running);
  const retry = await seedDelivery({ consumer: "retry", maxAttempts: 2 });
  const retryClaim = await claim(retry);
  await completeEventDeliveryFailure(retryClaim, new Error("retry"));
  const unrouted = await publishDurableEvent(uniqueEvent("unrouted"), {});
  await runEventRetention({ actor, batchSize: 10, terminalBefore: future });
  const ids = [pending.eventId, running.eventId, retry.eventId, unrouted.id];
  const remaining = await pool.query(
    `SELECT "id" FROM "_damat_event_outbox" WHERE "id"=ANY($1::uuid[])`,
    [ids],
  );
  expect(remaining.rowCount).toBe(4);
});

async function claim(item: Awaited<ReturnType<typeof seedDelivery>>) {
  const [result] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "retention-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  return result!;
}
