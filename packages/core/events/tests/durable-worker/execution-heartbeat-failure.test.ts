import { beforeEach, expect, test } from "bun:test";
import { claimEventDeliveries, clearDurableEventDefinitions } from "../../src";
import { runEventDeliveryHandler } from "../../src/durable/worker/execution-handler";
import { resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("interval heartbeat failure aborts the handler", async () => {
  const item = await seedDelivery();
  const [claim] = await claimEventDeliveries({
    consumers: [{ event: item.event, consumer: item.consumer }],
    workerId: "heartbeat-failure-worker",
    limit: 1,
    leaseMs: 30_000,
  });
  const controller = new AbortController();
  await runEventDeliveryHandler(
    claim!,
    { heartbeatIntervalMs: 1, leaseMs: 30_000 },
    async (_payload, context) =>
      new Promise<void>((resolve) =>
        context.signal.addEventListener("abort", () => resolve(), {
          once: true,
        }),
      ),
    controller,
    async () => Promise.reject(new Error("heartbeat failed")),
  );
  expect(controller.signal.aborted).toBe(true);
  expect((await deliveryRow(item.id)).status).toBe("running");
});
