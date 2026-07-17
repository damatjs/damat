import { beforeEach, expect, test } from "bun:test";
import { clearDurableEventDefinitions, DurableEventWorker } from "../../src";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";
import { waitUntil } from "./wait";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("shutdown abort immediately stops the delivery heartbeat", async () => {
  let release!: () => void;
  let observedAbort!: () => void;
  let markStarted!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const aborted = new Promise<void>((resolve) => (observedAbort = resolve));
  const started = new Promise<void>((resolve) => (markStarted = resolve));
  const item = await seedDelivery({
    handler: async (_payload, context) => {
      await new Promise<void>((resolve) => {
        context.signal.addEventListener(
          "abort",
          () => {
            observedAbort();
            resolve();
          },
          { once: true },
        );
        markStarted();
      });
      await gate;
    },
  });
  const worker = new DurableEventWorker({
    consumers: [{ event: item.event, consumer: item.consumer }],
    pollIntervalMs: 10,
    leaseMs: 1_000,
    heartbeatIntervalMs: 5,
    registryHeartbeatIntervalMs: 10,
    reconcileIntervalMs: 1_000,
  });
  worker.start();
  await waitUntil(async () => (await lease(item.id)) !== null);
  await started;
  const stopping = worker.stop({ graceMs: 10 });
  await aborted;
  await stopping;
  const afterAbort = await lease(item.id);
  await Bun.sleep(30);
  expect((await lease(item.id))?.getTime()).toBe(afterAbort?.getTime());
  release();
  await waitUntil(async () => {
    const row = await pool.query(
      `SELECT "stopped_at" FROM "_damat_workers" WHERE "id"=$1`,
      [worker.id],
    );
    return row.rows[0]?.stopped_at instanceof Date;
  });
});

async function lease(id: string): Promise<Date | null> {
  return (
    await pool.query(
      `SELECT "lease_expires_at" FROM "_damat_event_deliveries" WHERE "id"=$1`,
      [id],
    )
  ).rows[0].lease_expires_at;
}
