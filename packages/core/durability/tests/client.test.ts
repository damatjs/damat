import { afterEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  createDurabilityClient,
  getDurabilityClient,
  isTransactionalExecutor,
  setDurabilityClient,
} from "../src";

function createRecordingPool(fail = false) {
  const sql: string[] = [];
  let releases = 0;
  const client = {
    query: async (statement: string) => {
      sql.push(statement);
      if (fail && statement === "SELECT 1") throw new Error("query failed");
      return { rows: [], rowCount: 0 };
    },
    release: () => {
      releases += 1;
    },
  };
  return {
    pool: {
      query: client.query,
      connect: async () => client,
    },
    sql,
    releases: () => releases,
  };
}

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
