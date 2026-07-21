import { expect, test } from "bun:test";
import { EventWorkerRuntimeFinalizer } from "../../src/durable/worker/runtime-finalizer";

test("failed stopped persistence can be retried", async () => {
  let attempts = 0;
  let maintenanceStops = 0;
  let stopped = 0;
  const finalizer = new EventWorkerRuntimeFinalizer(
    "retry-worker",
    async () => void maintenanceStops++,
    () => void stopped++,
    async () => {
      attempts++;
      if (attempts === 1) throw new Error("temporary stop failure");
    },
  );
  finalizer.waitForDrain();
  await expect(finalizer.finish()).rejects.toThrow("temporary stop failure");
  await finalizer.finish();
  expect({ attempts, maintenanceStops, stopped }).toEqual({
    attempts: 2,
    maintenanceStops: 2,
    stopped: 1,
  });
  expect(finalizer.isWaitingForDrain).toBe(false);
});
