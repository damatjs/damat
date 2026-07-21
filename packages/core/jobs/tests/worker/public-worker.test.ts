import { expect, test } from "bun:test";
import { JobWorker } from "../../src";

test("public worker exposes idle state and accepts an idle wake", async () => {
  const worker = new JobWorker();
  expect(worker.isRunning).toBeFalse();
  expect(worker.inFlight).toBe(0);
  worker.wake();
  await worker.stop();
});
