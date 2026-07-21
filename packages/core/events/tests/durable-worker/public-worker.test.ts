import { expect, test } from "bun:test";
import { DurableEventWorker } from "../../src";

test("public event worker exposes idle state and accepts an idle wake", async () => {
  const worker = new DurableEventWorker({
    consumers: [{ event: "audit.created", consumer: "audit" }],
  });
  expect(worker.isRunning).toBeFalse();
  expect(worker.inFlight).toBe(0);
  worker.wake();
  await worker.stop();
});
