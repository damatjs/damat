import { expect, test } from "bun:test";
import { JobWorker } from "../../src/worker/loop";
import { dependencies, waitUntil, workerOptions } from "./loop-fixture";

test("stop before start remains a no-op", async () => {
  let polls = 0;
  let stopped = 0;
  const worker = new JobWorker(
    workerOptions(),
    dependencies({
      poll: async () => (polls++, []),
      stop: async () => stopped++,
    }) as never,
  );
  await worker.stop();
  worker.start();
  await waitUntil(() => polls > 0);
  await worker.stop();
  expect(stopped).toBe(1);
});
