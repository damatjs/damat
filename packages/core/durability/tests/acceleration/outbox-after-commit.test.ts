import { afterEach, expect, test } from "bun:test";
import {
  clearAccelerationController,
  configureAccelerationController,
  createDurabilityClient,
  recordAccelerationSignal,
} from "../../src";
import { createRecordingPool } from "../clientContext";

afterEach(clearAccelerationController);

test("requests one relay flush after an outbox transaction commits", async () => {
  const recording = createRecordingPool();
  const durability = createDurabilityClient({ pool: recording.pool });
  const commits: string[][] = [];
  configureAccelerationController({
    rebuild: async () => {},
    flush: async () => void commits.push([...recording.sql]),
  });
  await durability.transaction(async (executor) => {
    await recordAccelerationSignal({
      topic: "damat:jobs:wakeup",
      kind: "job",
      payload: {},
      executor,
    });
    await recordAccelerationSignal({
      topic: "damat:jobs:wakeup",
      kind: "job",
      payload: {},
      executor,
    });
  });
  expect(commits).toHaveLength(1);
  expect(commits[0]?.at(-1)).toBe("COMMIT");
});

test("never requests a relay flush for rolled-back outbox work", async () => {
  const durability = createDurabilityClient({
    pool: createRecordingPool().pool,
  });
  let flushes = 0;
  configureAccelerationController({
    rebuild: async () => {},
    flush: async () => void flushes++,
  });
  await expect(
    durability.transaction(async (executor) => {
      await recordAccelerationSignal({
        topic: "damat:jobs:wakeup",
        kind: "job",
        payload: {},
        executor,
      });
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(flushes).toBe(0);
});
