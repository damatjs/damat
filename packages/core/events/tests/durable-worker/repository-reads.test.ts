import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  executeEventDelivery,
  getDurableEventDelivery,
  listDurableEventDeliveries,
  listDurableEventDeliveryAttempts,
  listDurableEventLogs,
} from "../../src";
import { resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("delivery, attempts, and logs expose complete durable lifecycle rows", async () => {
  const item = await seedDelivery({
    handler: async (_payload, context) => {
      await context.log("info", "readable", { step: 1 });
      return { ok: true };
    },
  });
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "reader-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeEventDelivery(claim!);
  expect(await getDurableEventDelivery(item.id)).toMatchObject({
    id: item.id,
    eventId: item.eventId,
    consumer: item.consumer,
    status: "succeeded",
    attemptCount: 1,
    result: { ok: true },
    completedAt: expect.any(Date),
  });
  expect(await listDurableEventDeliveries(item.eventId)).toMatchObject([
    { id: item.id, consumer: item.consumer, status: "succeeded" },
  ]);
  expect(await listDurableEventDeliveryAttempts(item.id)).toMatchObject([
    {
      attemptNumber: 1,
      workerId: "reader-worker",
      outcome: "succeeded",
      finishedAt: expect.any(Date),
    },
  ]);
  expect(await listDurableEventLogs(item.id)).toMatchObject([
    {
      level: "info",
      message: "readable",
      context: { step: 1 },
      workerId: "reader-worker",
      sequence: 1,
    },
  ]);
});
