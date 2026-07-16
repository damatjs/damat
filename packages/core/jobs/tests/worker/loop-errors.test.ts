import { test } from "bun:test";
import { JobWorker } from "../../src/worker/loop";
import {
  claim,
  deferred,
  dependencies,
  waitUntil,
  workerOptions,
} from "./loop-fixture";

test("execution rejection is observed and released from capacity", async () => {
  let polls = 0;
  const worker = new JobWorker(
    workerOptions(),
    dependencies({
      poll: async () => (polls++ === 0 ? [claim] : []),
      startExecution: () => ({
        promise: Promise.reject(new Error("execution failed")),
        abort: () => {},
      }),
    }) as never,
  );
  worker.start();
  await waitUntil(() => polls >= 2);
  await worker.stop();
});

test("stop absorbs an in-flight poll rejection", async () => {
  const polling = deferred<(typeof claim)[]>();
  const worker = new JobWorker(
    workerOptions(),
    dependencies({ poll: () => polling.promise }) as never,
  );
  worker.start();
  await Bun.sleep(2);
  const stopping = worker.stop();
  polling.reject(new Error("poll stopped"));
  await stopping;
});

test("stop absorbs an in-flight registry heartbeat rejection", async () => {
  const heartbeat = deferred<void>();
  let heartbeatStarted = false;
  const worker = new JobWorker(
    workerOptions(),
    dependencies({
      heartbeat: () => {
        heartbeatStarted = true;
        return heartbeat.promise;
      },
    }) as never,
  );
  worker.start();
  await waitUntil(() => heartbeatStarted);
  const stopping = worker.stop();
  heartbeat.reject(new Error("heartbeat stopped"));
  await stopping;
});
