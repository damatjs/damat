import { expect, test } from "bun:test";
import { WorkerLifecycle } from "../../src/worker/lifecycle";

test("explicit lifecycle states are one-shot", async () => {
  const lifecycle = new WorkerLifecycle();
  let stopCalls = 0;
  expect(lifecycle.running).toBe(false);
  await lifecycle.stop(async () => {
    stopCalls++;
  });
  expect(lifecycle.start()).toBe(true);
  expect(lifecycle.start()).toBe(false);
  lifecycle.failStart();
  expect(lifecycle.running).toBe(false);
  expect(() => lifecycle.start()).toThrow("failed");
  await lifecycle.stop(async () => {
    stopCalls++;
  });
  lifecycle.completeStop();
  await lifecycle.stop(async () => {
    stopCalls++;
  });
  expect(stopCalls).toBe(1);
});
