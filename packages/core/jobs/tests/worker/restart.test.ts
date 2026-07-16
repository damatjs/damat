import { expect, test } from "bun:test";
import { createInternalJobWorker } from "../../src/worker/internal";
import {
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("a stopped worker rejects restart synchronously", async () => {
  let polls = 0;
  const worker = createInternalJobWorker(
    workerOptions(),
    dependencies({ poll: async () => (polls++, []) }) as never,
  );
  worker.start();
  await waitUntil(() => polls > 0);
  await worker.stop();
  expect(() => worker.start()).toThrow("cannot be restarted");
});

test("a worker rejects start while stop is pending", async () => {
  const marking = deferred<void>();
  const worker = createInternalJobWorker(
    workerOptions(),
    dependencies({ markStopping: () => marking.promise }) as never,
  );
  worker.start();
  await Bun.sleep(2);
  const stopping = worker.stop();
  expect(worker.stop()).toBe(stopping);
  expect(() => worker.start()).toThrow("stopping");
  marking.resolve();
  await stopping;
});
