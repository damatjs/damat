import { expect, test } from "bun:test";
import { listWorkers } from "@damatjs/durability";
import { JobWorker } from "../../src/worker";
import { prepareWorkerTest } from "./context";

async function waitForHeartbeat(id: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const [worker] = await listWorkers({ ids: [id] });
    if (worker && worker.lastHeartbeatAt.getTime() > worker.startedAt.getTime())
      return;
    await Bun.sleep(5);
  }
  throw new Error("worker heartbeat was not persisted");
}

test("start is idempotent and stop persists registry state", async () => {
  await prepareWorkerTest();
  const worker = new JobWorker({
    queue: crypto.randomUUID(),
    pollIntervalMs: 10_000,
    registryHeartbeatIntervalMs: 5,
  });
  worker.start();
  worker.start();
  expect(worker.isRunning).toBe(true);
  await waitForHeartbeat(worker.id);
  await worker.stop({ graceMs: 20 });
  expect(worker.isRunning).toBe(false);
  expect(await listWorkers({ ids: [worker.id] })).toMatchObject([
    { id: worker.id, state: "stopped" },
  ]);
});
