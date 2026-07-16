import { beforeEach, expect, test } from "bun:test";
import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import { enqueueJob, getJobRun, listJobActivity } from "../../src/client";
import { durability, ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearJobDefinitions();
});

test("enqueue persists definition defaults and immutable activity", async () => {
  const name = uniqueName("defaults");
  defineJob(name, async () => {}, {
    queue: "mail",
    priority: 10,
    maxAttempts: 5,
    backoffMs: 250,
    backoffMultiplier: 1.5,
  });
  const run = await enqueueJob(name, { userId: "u1" });
  expect(run).toMatchObject({
    name,
    queue: "mail",
    status: "queued",
    payload: { userId: "u1" },
    priority: 10,
    maxAttempts: 5,
    backoffMs: 250,
    backoffMultiplier: 1.5,
  });
  const activity = await listJobActivity(run.id);
  expect(activity).toMatchObject([{ type: "enqueued", nextStatus: "queued" }]);
  expect("previousStatus" in activity[0]!).toBe(false);
});

test("enqueue persists delay and call-site overrides", async () => {
  const before = Date.now();
  const run = await enqueueJob(uniqueName("override"), null, {
    queue: "urgent",
    priority: 1,
    delayMs: 5_000,
    maxAttempts: 2,
    backoffMs: 20,
    backoffMultiplier: 3,
    metadata: { source: "test" },
    correlationId: "corr-1",
  });
  expect(run.availableAt.getTime()).toBeGreaterThanOrEqual(before + 4_900);
  expect(run).toMatchObject({
    queue: "urgent",
    priority: 1,
    maxAttempts: 2,
    metadata: { source: "test" },
    correlationId: "corr-1",
  });
});

test("supplied transaction executor owns enqueue atomicity", async () => {
  const name = uniqueName("rollback");
  let id = "";
  await expect(
    durability.transaction(async (executor) => {
      id = (await enqueueJob(name, {}, { executor })).id;
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(await getJobRun(id)).toBeUndefined();
});

test("enqueue rejects a non-transactional executor before SQL", async () => {
  let queries = 0;
  const executor = {
    query: async () => {
      queries++;
      return { rows: [], rowCount: 0 };
    },
  };
  await expect(
    enqueueJob(uniqueName("invalid-executor"), {}, { executor }),
  ).rejects.toThrow(/transaction/i);
  expect(queries).toBe(0);
});
