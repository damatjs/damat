import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  heartbeatWorker,
  listWorkers,
  registerWorker,
  stopWorker,
} from "../../src";
import { createRepositoryContext, testId } from "../repositoryContext";

let context: Awaited<ReturnType<typeof createRepositoryContext>>;

beforeAll(async () => {
  context = await createRepositoryContext();
});
afterAll(async () => context.pool.end());

describe("worker repository", () => {
  test("registers capabilities and reports heartbeat load", async () => {
    const id = testId("worker");
    await registerWorker({
      id,
      capabilities: ["jobs:default"],
      hostname: "host-a",
      processId: 42,
      concurrency: 4,
      executor: context.pool,
    });
    await heartbeatWorker({ id, inFlight: 3, executor: context.pool });
    const [worker] = await listWorkers({ executor: context.pool, ids: [id] });
    expect(worker).toMatchObject({
      id,
      capabilities: ["jobs:default"],
      inFlight: 3,
      concurrency: 4,
      state: "active",
    });
  });

  test("calculates stale state and records graceful stop", async () => {
    const id = testId("worker");
    await registerWorker({
      id,
      capabilities: [],
      hostname: "host-b",
      processId: 43,
      concurrency: 1,
      executor: context.pool,
    });
    const [stale] = await listWorkers({
      executor: context.pool,
      ids: [id],
      staleAfterMs: 1_000,
      now: new Date(Date.now() + 2_000),
    });
    expect(stale?.state).toBe("stale");
    await stopWorker({ id, executor: context.pool });
    const [stopped] = await listWorkers({ executor: context.pool, ids: [id] });
    expect(stopped?.state).toBe("stopped");
    expect(stopped?.stoppingAt).toBeInstanceOf(Date);
    expect(stopped?.stoppedAt).toBeInstanceOf(Date);
  });
});
