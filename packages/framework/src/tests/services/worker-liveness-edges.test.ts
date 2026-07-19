import { expect, test } from "bun:test";
import type { Redis } from "@damatjs/redis";
import { WorkerLiveness } from "../../services/initialize/workerLiveness";

test("worker liveness refreshes, reports failure, and removes keys", async () => {
  const writes: string[] = [];
  const errors: unknown[] = [];
  const redis = {
    set: async (key: string) => void writes.push(key),
    del: async () => {
      throw new Error("delete failed");
    },
  } as unknown as Redis;
  const liveness = new WorkerLiveness(
    redis,
    [{ id: "worker", inFlight: 2 }],
    6,
    (error) => errors.push(error),
  );
  liveness.start();
  while (writes.length < 2) await Bun.sleep(1);
  await liveness.stop();
  await refresh(liveness);
  expect(writes).toEqual(["damat:workers:worker", "damat:workers:worker"]);
  const failing = new WorkerLiveness(
    {
      set: async () => {
        throw new Error("write failed");
      },
      del: async () => 1,
    } as unknown as Redis,
    [{ id: "bad", inFlight: 0 }],
    6,
    (error) => errors.push(error),
  );
  failing.start();
  while (!errors.length) await Bun.sleep(1);
  await failing.stop();
  expect(errors).toHaveLength(1);
});

const refresh = (value: WorkerLiveness) =>
  (value as unknown as { refresh(): Promise<void> }).refresh();
