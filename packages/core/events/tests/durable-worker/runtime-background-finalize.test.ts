import { beforeEach, expect, test } from "bun:test";
import {
  listWorkers,
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { clearDurableEventDefinitions, DurableEventWorker } from "../../src";
import { durability, resetWorkerStorage } from "./context";
import { deliveryRow, seedDelivery } from "./fixture";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("background stopped persistence failure can be retried", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => void (release = resolve));
  const item = await seedDelivery({ handler: async () => gate });
  const worker = new DurableEventWorker({
    consumers: [{ event: item.event, consumer: item.consumer }],
    pollIntervalMs: 10,
  });
  worker.start();
  await waitUntil(
    async () => (await deliveryRow(item.id)).status === "running",
  );
  await worker.stop({ graceMs: 1 });
  setDurabilityClient(failStoppedPersistence());
  try {
    release();
    await Bun.sleep(20);
  } finally {
    setDurabilityClient(durability);
  }
  await worker.stop();
  expect((await listWorkers({ ids: [worker.id] }))[0]?.state).toBe("stopped");
});

function failStoppedPersistence(): DurabilityClient {
  return {
    ...durability,
    query: (sql, params) => {
      if (sql.includes('"stopped_at" = COALESCE')) {
        return Promise.reject(new Error("stop persistence failed"));
      }
      return durability.query(sql, params);
    },
  };
}
