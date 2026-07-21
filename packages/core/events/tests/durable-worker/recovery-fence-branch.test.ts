import { expect, test } from "bun:test";
import type { DurabilityExecutor } from "@damatjs/durability";
import { recoverExpiredEventDeliveryLease } from "../../src/durable/worker/lease-recovery";

test("recovery rejects a lease changed after attempt closure", async () => {
  let queries = 0;
  const executor: DurabilityExecutor = {
    query: async () => {
      queries++;
      if (queries === 1) {
        return { rows: [{ duration_ms: "1" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  await expect(
    recoverExpiredEventDeliveryLease(executor, {
      id: crypto.randomUUID(),
      event_id: crypto.randomUUID(),
      consumer: "consumer",
      attempt_count: 1,
      max_attempts: 2,
      cancellation_requested_at: null,
      lease_owner: "worker",
      lease_token: crypto.randomUUID(),
    }),
  ).rejects.toThrow(/lease changed/);
});
