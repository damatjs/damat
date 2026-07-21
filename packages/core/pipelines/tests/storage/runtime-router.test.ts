import { beforeAll, expect, test } from "bun:test";
import { PipelineRouter } from "../../src";
import { ensureStorage } from "./context";

beforeAll(ensureStorage);
const pause = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

test("router lifecycle ignores idle wakes and duplicate starts", async () => {
  const router = new PipelineRouter({ pollIntervalMs: 50 });
  expect(router.isRunning).toBe(false);
  router.wake();
  await (router as unknown as { run(): Promise<void> }).run();
  router.start();
  router.start();
  await pause();
  expect(router.isRunning).toBe(true);
  await router.stop();
  expect(router.isRunning).toBe(false);
});

test("coordinated router coalesces an in-flight wake and stop rejection", async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<never>((_, fail) => {
    reject = fail;
  });
  const coordinator = {
    run: () => pending,
    pollInterval: (value: number) => value,
  };
  const router = new PipelineRouter({
    coordinator: coordinator as never,
    pollIntervalMs: 50,
  });
  router.start();
  router.wake();
  const stopped = router.stop();
  reject(new Error("coordinator stopped"));
  await stopped;
  expect(router.isRunning).toBe(false);
});

test("coordinator poll intervals and explicit wakes reschedule work", async () => {
  let runs = 0;
  let polls = 0;
  const coordinator = {
    run: async () => {
      runs++;
      return { count: 0 };
    },
    pollInterval: () => {
      polls++;
      return 50;
    },
  };
  const router = new PipelineRouter({
    coordinator: coordinator as never,
    pollIntervalMs: 50,
  });
  router.start();
  await pause();
  router.wake();
  await pause();
  await router.stop();
  expect(runs).toBeGreaterThanOrEqual(2);
  expect(polls).toBeGreaterThanOrEqual(2);
});
