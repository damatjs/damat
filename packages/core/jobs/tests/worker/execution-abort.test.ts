import { beforeEach, expect, test } from "bun:test";
import { getJobRun } from "../../src/client";
import { defineJob } from "../../src/definitions/registry";
import { claimJobRuns } from "../../src/worker/claim";
import { startJobExecution } from "../../src/worker/execute";
import { deferred, waitUntil } from "./loop-fixture";
import { expireLease, pool, prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

test("aborting active execution stops heartbeats and preserves its lease", async () => {
  const work = deferred<void>();
  let signal: AbortSignal | undefined;
  const item = await queuedRun();
  const name = `${item.name}-abort`;
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
    workerId: "worker-execution-abort",
    limit: 1,
    leaseMs: 1_000,
  });
  const execution = startJobExecution(claim!, { heartbeatIntervalMs: 5 });
  await waitUntil(() => signal !== undefined);
  execution.abort();
  await Bun.sleep(15);
  const before = await heartbeatAt(item.run.id);
  await Bun.sleep(20);
  expect(await heartbeatAt(item.run.id)).toEqual(before);
  expect(signal?.aborted).toBe(true);
  work.resolve();
  await execution.promise;
  expect((await getJobRun(item.run.id))?.status).toBe("running");
});

async function heartbeatAt(runId: string): Promise<Date> {
  const result = await pool.query(
    `SELECT "heartbeat_at" FROM "_damat_job_runs" WHERE "id"=$1`,
    [runId],
  );
  return result.rows[0]!.heartbeat_at;
}

test("a failed execution heartbeat aborts the active handler", async () => {
  const work = deferred<void>();
  let signal: AbortSignal | undefined;
  const item = await queuedRun();
  const name = `${item.name}-heartbeat-failure`;
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
    workerId: "worker-heartbeat-failure",
    limit: 1,
    leaseMs: 1_000,
  });
  const execution = startJobExecution(claim!, { heartbeatIntervalMs: 5 });
  await waitUntil(() => signal !== undefined);
  await expireLease(item.run.id);
  await waitUntil(() => signal?.aborted === true);
  work.resolve();
  await execution.promise;
  expect((await getJobRun(item.run.id))?.status).toBe("running");
});
