import { expect, spyOn, test } from "bun:test";
import { getLogger } from "@damatjs/logger";
import { createInternalJobWorker } from "../../src/worker/internal";
import {
  claim,
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("mark-stopping failure rejects stop and permits retry", async () => {
  let marks = 0;
  let stops = 0;
  const worker = createInternalJobWorker(
    workerOptions(),
    dependencies({
      markStopping: async () => {
        if (++marks === 1) throw new Error("mark failed");
      },
      stop: async () => stops++,
    }) as never,
  );
  worker.start();
  await Bun.sleep(2);
  await expect(worker.stop()).rejects.toThrow("mark failed");
  await worker.stop();
  expect([marks, stops]).toEqual([2, 1]);
});

test("stopped persistence failure rejects stop and permits retry", async () => {
  let stops = 0;
  const worker = createInternalJobWorker(
    workerOptions(),
    dependencies({
      stop: async () => {
        if (++stops === 1) throw new Error("stop failed");
      },
    }) as never,
  );
  worker.start();
  await Bun.sleep(2);
  await expect(worker.stop()).rejects.toThrow("stop failed");
  await worker.stop();
  expect(stops).toBe(2);
});

test("background finalization failure is logged and retryable", async () => {
  const work = deferred<void>();
  let polls = 0;
  let stops = 0;
  const error = spyOn(getLogger(), "error").mockImplementation(() => {});
  const worker = createInternalJobWorker(
    workerOptions(),
    dependencies({
      poll: async () => (polls++ ? [] : [claim]),
      startExecution: () => ({ promise: work.promise, abort: () => {} }),
      stop: async () => {
        if (++stops === 1) throw new Error("background stop failed");
      },
    }) as never,
  );
  worker.start();
  await waitUntil(() => polls > 0);
  await worker.stop({ graceMs: 1 });
  work.resolve();
  await waitUntil(() => error.mock.calls.length > 0);
  await worker.stop();
  expect(stops).toBe(2);
  error.mockRestore();
});
