import { beforeEach, expect, test } from "bun:test";
import { getJobRun, listJobAttempts } from "../../src/client";
import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { executeJobClaim } from "../../src/worker/execute";
import { pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

async function execute(
  handler?: () => unknown | Promise<unknown>,
  maxAttempts = 3,
) {
  const item = await queuedRun(undefined, { maxAttempts });
  if (handler) {
    const name = `${item.name}-handler`;
    defineJob(name, handler);
    await pool.query(
      `UPDATE "_damat_job_runs" SET "name" = $2 WHERE "id" = $1`,
      [item.run.id, name],
    );
  } else {
    clearJobDefinitions();
  }
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-outcome",
    limit: 1,
    leaseMs: 30_000,
  });
  await executeJobClaim(claim!, { heartbeatIntervalMs: 5_000 });
  return { claim: claim!, run: await getJobRun(item.run.id) };
}

test("JSON results succeed and attempt history stays immutable", async () => {
  const completed = await execute(() => ({ sent: true }));
  expect(completed.run).toMatchObject({
    status: "succeeded",
    result: { sent: true },
  });
  expect(await listJobAttempts(completed.claim.id)).toMatchObject([
    { attemptNumber: 1, outcome: "succeeded", result: { sent: true } },
  ]);
});

test("failures schedule a retry with persisted backoff", async () => {
  const retry = await execute(() => {
    throw new Error("temporary");
  });
  expect(retry.run?.status).toBe("retry_wait");
});

test("exhausted failures dead-letter", async () => {
  const dead = await execute(() => {
    throw new Error("permanent");
  }, 1);
  expect(dead.run?.status).toBe("dead_lettered");
});

test("unknown definitions dead-letter immediately", async () => {
  const unknown = await execute();
  expect(unknown.run?.status).toBe("dead_lettered");
});

test("non-serializable results fail completion visibly", async () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const failed = await execute(() => cyclic, 1);
  expect(failed.run?.status).toBe("dead_lettered");
});

test("class instance results fail completion visibly", async () => {
  const failed = await execute(() => new Date(), 1);
  expect(failed.run?.status).toBe("dead_lettered");
});

test("non-error throws are serialized into visible failures", async () => {
  const failed = await execute(() => {
    throw "plain failure";
  }, 1);
  expect(failed.run?.status).toBe("dead_lettered");
  const error = await pool.query(
    `SELECT "last_error" FROM "_damat_job_runs" WHERE "id"=$1`,
    [failed.claim.id],
  );
  expect(error.rows[0]?.last_error).toEqual({
    name: "Error",
    message: "plain failure",
  });
});
