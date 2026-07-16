import { expect, test } from "bun:test";
import { listWorkers } from "@damatjs/durability";
import { JobWorker } from "../../src/worker";
import { prepareWorkerTest } from "./context";

test("start is idempotent and stop bounds the graceful drain", async () => {
  await prepareWorkerTest();
  const worker = new JobWorker({
    queue: crypto.randomUUID(),
    pollIntervalMs: 10_000,
  });
  worker.start();
  worker.start();
  expect(worker.isRunning).toBe(true);
  const started = Date.now();
  await worker.stop({ graceMs: 20 });
  expect(worker.isRunning).toBe(false);
  expect(Date.now() - started).toBeLessThan(500);
  expect(await listWorkers({ ids: [worker.id] })).toMatchObject([
    { id: worker.id, state: "stopped" },
  ]);
});
