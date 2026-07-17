import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  executeEventDelivery,
} from "../../src";
import { resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("direct execution validates lease and heartbeat options", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "direct-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  await expect(
    executeEventDelivery(claim!, { heartbeatIntervalMs: 0 }),
  ).rejects.toThrow(/heartbeatIntervalMs/);
  await expect(
    executeEventDelivery(claim!, {
      leaseMs: 10,
      heartbeatIntervalMs: 10,
    }),
  ).rejects.toThrow(/heartbeatIntervalMs/);
  await expect(executeEventDelivery(claim!, { leaseMs: 1.5 })).rejects.toThrow(
    /leaseMs/,
  );
  await expect(
    executeEventDelivery(claim!, { progressMinimumIntervalMs: -1 }),
  ).rejects.toThrow(/progressMinimumIntervalMs/);
  await expect(
    executeEventDelivery(claim!, { logLimits: { maxCount: 0, maxBytes: 1 } }),
  ).rejects.toThrow(/maxCount/);
  await expect(
    executeEventDelivery(claim!, { logLimits: { maxCount: 1, maxBytes: 0 } }),
  ).rejects.toThrow(/maxBytes/);
});
