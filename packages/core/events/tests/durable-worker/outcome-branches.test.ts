import { beforeEach, expect, test } from "bun:test";
import {
  claimEventDeliveries,
  clearDurableEventDefinitions,
  completeEventDeliveryFailure,
  executeEventDelivery,
} from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("failure rejects a claim whose delivery lease was lost", async () => {
  const item = await seedDelivery();
  const deliveryClaim = await claim(item);
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "lease_token"=$2 WHERE "id"=$1`,
    [item.id, crypto.randomUUID()],
  );
  await expect(
    completeEventDeliveryFailure(deliveryClaim, "plain failure"),
  ).rejects.toThrow(/lease/i);
});

test("terminal transition loss is logged without retrying the handler", async () => {
  let calls = 0;
  const item = await seedDelivery({
    handler: async () => {
      calls++;
      await pool.query(
        `UPDATE "_damat_event_deliveries" SET "lease_token"=$2 WHERE "id"=$1`,
        [item.id, crypto.randomUUID()],
      );
      throw new Error("handler failed after lease loss");
    },
  });
  await executeEventDelivery(await claim(item));
  expect(calls).toBe(1);
  expect((await deliveryRow(item.id)).status).toBe("running");
});

test("non-Error failures are serialized visibly", async () => {
  const item = await seedDelivery({ maxAttempts: 1 });
  const deliveryClaim = await claim(item);
  expect(
    await completeEventDeliveryFailure(deliveryClaim, "plain failure"),
  ).toBe("dead_lettered");
  expect((await deliveryRow(item.id)).last_error).toMatchObject({
    name: "Error",
    message: "plain failure",
  });
});

async function claim(item: Awaited<ReturnType<typeof seedDelivery>>) {
  return (
    await claimEventDeliveries({
      consumers: [{ event: item.event, consumer: item.consumer }],
      workerId: "outcome-branch-worker",
      limit: 1,
      leaseMs: 30_000,
    })
  )[0]!;
}
