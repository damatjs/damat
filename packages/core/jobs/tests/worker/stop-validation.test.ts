import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
import { dependencies, workerOptions } from "./loop-fixture";

const TIMER_MAX = 2_147_483_647;

test("invalid grace periods throw without changing lifecycle", async () => {
  const worker = createInternalJobWorker(
    workerOptions(),
    dependencies() as never,
  );
  expect(() => worker.stop({ graceMs: -1 })).toThrow("graceMs");
  worker.start();
  expect(() => worker.stop({ graceMs: Number.NaN })).toThrow("graceMs");
  expect(() => worker.stop({ graceMs: TIMER_MAX + 1 })).toThrow("graceMs");
  expect(worker.isRunning).toBe(true);
  await worker.stop({ graceMs: 0 });
});

test("grace period accepts the timer boundaries", async () => {
  const immediate = createInternalJobWorker(
    workerOptions(),
    dependencies() as never,
  );
  await immediate.stop({ graceMs: 0 });
  const maximum = createInternalJobWorker(
    workerOptions(),
    dependencies() as never,
  );
  await maximum.stop({ graceMs: TIMER_MAX });
});
