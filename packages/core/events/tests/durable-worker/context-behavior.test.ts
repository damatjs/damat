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

test("handler progress, redacted logs, and JSON result are durable", async () => {
  const item = await seedDelivery({
    handler: async (_payload, context) => {
      await context.progress({ percent: 50 }, { stage: "half" });
      await context.log("info", "working", { token: "secret", safe: true });
      return { accepted: true };
    },
  });
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeEventDelivery(claim!, {
    redaction: { keys: ["token"] },
    progressMinimumIntervalMs: 0,
  });
  const row = await deliveryRow(item.id);
  expect(row).toMatchObject({
    status: "succeeded",
    progress: { percent: 50 },
    result: { accepted: true },
  });
  const logs = await pool.query(
    `SELECT "context" FROM "_damat_event_logs" WHERE "delivery_id"=$1`,
    [item.id],
  );
  expect(logs.rows[0].context).toEqual({ token: "[REDACTED]", safe: true });
});

test("non JSON-safe results visibly fail the delivery", async () => {
  const item = await seedDelivery({
    maxAttempts: 1,
    handler: async () => new Date(),
  });
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "worker-a",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeEventDelivery(claim!);
  expect(await deliveryRow(item.id)).toMatchObject({
    status: "dead_lettered",
    last_error: { message: expect.stringContaining("JSON-safe") },
  });
});
