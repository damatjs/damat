import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  claimAccelerationSignals,
  clearDurabilityClient,
  markAccelerationSignalPublished,
  recordAccelerationSignal,
  releaseAccelerationSignal,
  setDurabilityClient,
} from "../../src";
import { createRepositoryContext, testId } from "../repositoryContext";

let context: Awaited<ReturnType<typeof createRepositoryContext>>;

beforeAll(async () => {
  context = await createRepositoryContext();
  setDurabilityClient(context.durability);
});
afterAll(async () => {
  clearDurabilityClient();
  await context.pool.end();
});

test("transaction rollback leaves no acceleration signal", async () => {
  const resourceId = testId("rollback-signal");
  await expect(context.durability.transaction(async (executor) => {
    await recordAccelerationSignal({
      topic: "damat:inspection:invalidate",
      kind: "job",
      resourceId,
      executor,
    });
    throw new Error("roll back signal");
  })).rejects.toThrow("roll back signal");
  const result = await context.pool.query(
    `SELECT 1 FROM "_damat_acceleration_outbox" WHERE "resource_id"=$1`,
    [resourceId],
  );
  expect(result.rowCount).toBe(0);
});

test("released relay claims replay and settle idempotently", async () => {
  const resourceId = testId("replay-signal");
  const id = await recordAccelerationSignal({
    topic: "damat:inspection:invalidate",
    kind: "event",
    resourceId,
    availableAt: new Date(0),
    executor: context.pool,
  });
  const first = (await claimAccelerationSignals(1, 30_000, [id])).find(
    (signal) => signal.id === id,
  )!;
  await releaseAccelerationSignal(first, new Error("temporary Redis failure"));
  const replay = (await claimAccelerationSignals(1, 30_000, [id])).find(
    (signal) => signal.id === id,
  )!;
  expect(replay.claimToken).not.toBe(first.claimToken);
  expect(await markAccelerationSignalPublished(replay)).toBeTrue();
  expect(await markAccelerationSignalPublished(replay)).toBeFalse();
  const result = await context.pool.query(
    `SELECT "published_at","attempts" FROM "_damat_acceleration_outbox" WHERE "id"=$1`,
    [id],
  );
  expect(result.rows[0].published_at).toBeInstanceOf(Date);
  expect(result.rows[0].attempts).toBe(2);
});
