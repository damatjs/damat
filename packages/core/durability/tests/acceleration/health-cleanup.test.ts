import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  claimAccelerationSignals,
  cleanupPublishedAccelerationSignals,
  clearDurabilityClient,
  getAccelerationHealth,
  markAccelerationSignalPublished,
  recordAccelerationSignal,
  setDurabilityClient,
  updateAccelerationState,
  type DurabilityClient,
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

test("acceleration health exposes persisted relay and rebuild state", async () => {
  expect((await getAccelerationHealth()).pendingOutboxCount).toBeNumber();
  await updateAccelerationState({
    mode: "healthy",
    fallbackPollIntervalMs: 5_000,
    checkpoint: "42",
    rebuilt: true,
    published: true,
  });
  expect(await getAccelerationHealth()).toMatchObject({
    mode: "healthy",
    projectionCheckpoint: "42",
    fallbackPollIntervalMs: 5_000,
    lastSuccessfulPublication: expect.any(Date),
    lastRebuildAt: expect.any(Date),
  });
});

test("acceleration health reports an unmigrated state", async () => {
  const empty = {
    pool: context.pool,
    query: async () => ({ rows: [], rowCount: 0 }),
    transaction: context.durability.transaction,
  } as DurabilityClient;
  setDurabilityClient(empty);
  await expect(getAccelerationHealth()).rejects.toThrow("not migrated");
  setDurabilityClient(context.durability);
});

test("published acceleration rows are cleaned in bounded batches", async () => {
  const id = await recordAccelerationSignal({
    topic: "damat:inspection:invalidate",
    kind: "job",
    resourceId: testId("cleanup"),
    availableAt: new Date(0),
  });
  const [signal] = await claimAccelerationSignals(1, 30_000, [id]);
  await markAccelerationSignalPublished(signal!);
  expect(await cleanupPublishedAccelerationSignals()).toBe(0);
  expect(await cleanupPublishedAccelerationSignals({
    before: new Date(Date.now() + 1_000),
    limit: 1,
  })).toBe(1);
  await expect(claimAccelerationSignals(0)).rejects.toThrow("between 1 and 1000");
  await expect(cleanupPublishedAccelerationSignals({ limit: 0 })).rejects.toThrow(
    "between 1 and 1000",
  );
});
