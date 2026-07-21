import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  executeEventDelivery,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("requested cancellation aborts and records cancelled", async () => {
  let observedAbort = false;
  const item = await seedDelivery({
    handler: async (_payload, context) => {
      observedAbort = context.signal.aborted;
    },
  });
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "cancellation_requested_at"=NOW() WHERE "id"=$1`,
    [item.id],
  );
  await executeEventDelivery(claim!);
  expect(observedAbort).toBe(false);
  expect((await deliveryRow(item.id)).status).toBe("cancelled");
});

test("cancellation observed during a cooperative handler becomes terminal", async () => {
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const item = await seedDelivery({
    handler: async (_payload, context) => {
      markStarted();
      await new Promise<void>((resolve) => {
        context.signal.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
    },
  });
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  const execution = executeEventDelivery(claim!, {
    heartbeatIntervalMs: 5,
    leaseMs: 30_000,
  });
  await started;
  await pool.query(
    `UPDATE "_damat_event_deliveries"
     SET "cancellation_requested_at"=NOW() WHERE "id"=$1`,
    [item.id],
  );
  await execution;
  expect((await deliveryRow(item.id)).status).toBe("cancelled");
});
