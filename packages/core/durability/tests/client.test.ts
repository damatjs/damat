import { afterEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  createDurabilityClient,
  getDurabilityClient,
  isTransactionalExecutor,
  setDurabilityClient,
  withIdempotency,
} from "../src";
import { createRecordingPool } from "./clientContext";

afterEach(clearDurabilityClient);

test("runs a callback in BEGIN and COMMIT", async () => {
  const recording = createRecordingPool();
  const durability = createDurabilityClient({ pool: recording.pool });
  await durability.transaction(async (tx) => tx.query("SELECT 1"));
  expect(recording.sql).toEqual(["BEGIN", "SELECT 1", "COMMIT"]);
  expect(recording.releases()).toBe(1);
});

test("marks only transaction callback executors", async () => {
  const recording = createRecordingPool();
  const durability = createDurabilityClient({ pool: recording.pool });
  let captured;
  expect(isTransactionalExecutor(recording.pool)).toBe(false);
  await durability.transaction(async (executor) => {
    captured = executor;
    expect(isTransactionalExecutor(executor)).toBe(true);
  });
  expect(isTransactionalExecutor(captured!)).toBe(false);
});

test("does not reactivate an old executor when the pool reuses its client", async () => {
  const recording = createRecordingPool();
  const durability = createDurabilityClient({ pool: recording.pool });
  let first;
  await durability.transaction(async (executor) => {
    first = executor;
    expect(isTransactionalExecutor(recording.client)).toBe(false);
  });
  await durability.transaction(async (second) => {
    expect(second).not.toBe(first);
    expect(isTransactionalExecutor(first!)).toBe(false);
    await expect(first!.query("SELECT stale")).rejects.toThrow(
      /active transaction/i,
    );
    expect(recording.sql).not.toContain("SELECT stale");
    await expect(
      withIdempotency(
        { scope: "reuse", key: "first", executor: first! },
        async () => ({ accepted: false }),
      ),
    ).rejects.toThrow(/active transaction/i);
    await expect(
      withIdempotency(
        { scope: "reuse", key: "second", executor: second },
        async () => ({ accepted: true }),
      ),
    ).resolves.toEqual({ value: { accepted: true }, replayed: false });
  });
});

test("rolls back and releases when a callback fails", async () => {
  const recording = createRecordingPool(true);
  const durability = createDurabilityClient({ pool: recording.pool });
  let captured;
  await expect(
    durability.transaction(async (tx) => {
      captured = tx;
      expect(isTransactionalExecutor(tx)).toBe(true);
      return tx.query("SELECT 1");
    }),
  ).rejects.toThrow("query failed");
  expect(isTransactionalExecutor(captured!)).toBe(false);
  expect(recording.sql).toEqual(["BEGIN", "SELECT 1", "ROLLBACK"]);
  expect(recording.releases()).toBe(1);
});

test("stores a process-wide durability client", () => {
  const durability = createDurabilityClient({
    pool: createRecordingPool().pool,
  });
  setDurabilityClient(durability);
  expect(getDurabilityClient()).toBe(durability);
  clearDurabilityClient();
  expect(() => getDurabilityClient()).toThrow(/not configured/i);
});
