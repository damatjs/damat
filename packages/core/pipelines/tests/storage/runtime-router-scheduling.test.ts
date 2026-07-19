import { beforeAll, expect, test } from "bun:test";
import { PipelineRouter } from "../../src";
import { ensureStorage } from "./context";

beforeAll(ensureStorage);
const pause = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

test("router honors due-node delays and full batches", async () => {
  let runs = 0;
  let release!: (value: { count: number }) => void;
  const blocked = new Promise<{ count: number }>((resolve) => {
    release = resolve;
  });
  const coordinator = {
    run: async () =>
      ++runs === 1
        ? { count: 2, nextDelayMs: 1 }
        : runs === 2
          ? { count: 0, nextDelayMs: 1 }
          : blocked,
    pollInterval: (value: number) => value,
  };
  const router = new PipelineRouter({
    coordinator: coordinator as never,
    batchSize: 2,
    pollIntervalMs: 50,
  });
  router.start();
  await pause();
  const stopped = router.stop();
  release({ count: 0 });
  await stopped;
  expect(runs).toBeGreaterThanOrEqual(2);
});

test("router retries coordinator errors", async () => {
  const coordinator = {
    run: async () => {
      throw new Error("poll failed");
    },
    pollInterval: (value: number) => value,
  };
  const router = new PipelineRouter({
    coordinator: coordinator as never,
    retryIntervalMs: 20,
  });
  router.start();
  await pause();
  await router.stop();
  expect(router.isRunning).toBe(false);
});
