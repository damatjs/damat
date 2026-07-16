import { beforeEach, expect, test } from "bun:test";
import { cancelJobRun, getJobRun } from "../../src/client";
import { executeJobClaim, startJobExecution } from "../../src/worker/execute";
import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { deferred, waitUntil } from "./loop-fixture";
import { claimOne, pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("execution settles cancellation requested before the handler starts", async () => {
  const claim = await claimOne("worker-cancel-execution");
  await cancelJobRun(claim.id);
  await executeJobClaim(claim, { heartbeatIntervalMs: 5_000 });
  expect(await getJobRun(claim.id)).toMatchObject({
    status: "cancelled",
  });
});

test("aborting before execution setup is safe", async () => {
  const claim = await claimOne("worker-early-abort");
  clearJobDefinitions();
  const execution = startJobExecution(claim, {
    heartbeatIntervalMs: 5_000,
  });
  execution.abort();
  await execution.promise;
  expect((await getJobRun(claim.id))?.status).toBe("dead_lettered");
});

test("a handler returning after cancellation still settles cancelled", async () => {
  const work = deferred<void>();
  let signal: AbortSignal | undefined;
  const item = await queuedRun();
  const name = `${item.name}-ignore-cancel`;
  defineJob(name, async (_payload, context) => {
    signal = context.signal;
    await work.promise;
  });
  await pool.query(`UPDATE "_damat_job_runs" SET "name"=$2 WHERE "id"=$1`, [
    item.run.id,
    name,
  ]);
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-ignore-cancel",
    limit: 1,
    leaseMs: 1_000,
  });
  const execution = startJobExecution(claim!, { heartbeatIntervalMs: 5 });
  await waitUntil(() => signal !== undefined);
  await cancelJobRun(item.run.id);
  await waitUntil(() => signal?.aborted === true);
  work.resolve();
  await execution.promise;
  expect((await getJobRun(item.run.id))?.status).toBe("cancelled");
});
