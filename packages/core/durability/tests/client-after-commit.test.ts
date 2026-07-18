import { expect, test } from "bun:test";
import { createDurabilityClient, registerAfterCommit } from "../src";
import { createRecordingPool } from "./clientContext";

test("runs coalesced callbacks only after commit", async () => {
  const recording = createRecordingPool();
  const durability = createDurabilityClient({ pool: recording.pool });
  const observed: string[][] = [];
  const callback = () => observed.push([...recording.sql]);
  await durability.transaction(async (executor) => {
    expect(registerAfterCommit(executor, callback)).toBe(true);
    expect(registerAfterCommit(executor, callback)).toBe(true);
    expect(observed).toEqual([]);
  });
  expect(observed).toEqual([["BEGIN", "COMMIT"]]);
});

test("discards after-commit callbacks on rollback", async () => {
  const recording = createRecordingPool();
  const durability = createDurabilityClient({ pool: recording.pool });
  let called = false;
  await expect(
    durability.transaction(async (executor) => {
      registerAfterCommit(executor, () => {
        called = true;
      });
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(called).toBe(false);
});
