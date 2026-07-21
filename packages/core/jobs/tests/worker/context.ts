import { clearJobDefinitions, defineJob } from "../../src/definitions/registry";
import { enqueueJob } from "../../src/client";
import { claimJobRuns } from "../../src/worker/claim";
import { ensureStorage, pool, uniqueName } from "../storage/context";

export { pool };

setDefaultTimeout(20_000);

export async function prepareWorkerTest(): Promise<void> {
  await ensureStorage();
  clearJobDefinitions();
}

export async function queuedRun(
  queue = uniqueName("worker-queue"),
  options: { delayMs?: number; priority?: number; maxAttempts?: number } = {},
) {
  const name = uniqueName("worker-job");
  defineJob(name, async () => {});
  const run = await enqueueJob(
    name,
    { value: name },
    {
      queue,
      ...(options.delayMs !== undefined ? { delayMs: options.delayMs } : {}),
      ...(options.priority !== undefined ? { priority: options.priority } : {}),
      ...(options.maxAttempts !== undefined
        ? { maxAttempts: options.maxAttempts }
        : {}),
    },
  );
  return { name, queue, run };
}

export async function expireLease(runId: string): Promise<void> {
  await pool.query(
    `UPDATE "_damat_job_runs"
     SET "lease_expires_at" = NOW() - INTERVAL '1 second'
     WHERE "id" = $1`,
    [runId],
  );
}

export async function claimOne(workerId = "worker-test") {
  const item = await queuedRun();
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId,
    limit: 1,
    leaseMs: 30_000,
  });
  return claim!;
}
import { setDefaultTimeout } from "bun:test";
