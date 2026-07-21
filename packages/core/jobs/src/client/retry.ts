import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
  type WorkActor,
  recordAccelerationSignal,
} from "@damatjs/durability";
import { appendJobActivity, type JobRun } from "../repositories";
import { mapJobRun, type JobRunRow } from "../repositories/map-run";
import { publishJobWakeup } from "../wakeup/publisher";

export interface RetryJobRunOptions {
  actor?: WorkActor;
  executor?: DurabilityExecutor;
}

export async function retryJobRun(
  id: string,
  options: RetryJobRunOptions = {},
): Promise<JobRun | undefined> {
  const execute = (executor: DurabilityExecutor) =>
    retryWith(executor, id, options);
  if (!options.executor) {
    const run = await getDurabilityClient().transaction(execute);
    if (run) await publishJobWakeup(run.queue);
    return run;
  }
  if (!isTransactionalExecutor(options.executor)) {
    throw new TransactionalExecutorRequiredError();
  }
  return execute(options.executor);
}

async function retryWith(
  executor: DurabilityExecutor,
  id: string,
  options: RetryJobRunOptions,
): Promise<JobRun | undefined> {
  const updated = await executor.query<JobRunRow>(
    `UPDATE "_damat_job_runs" SET "status"='queued',"progress"=NULL,
       "result"=NULL,"last_error"=NULL,"cancellation_requested_at"=NULL,
       "lease_owner"=NULL,"lease_token"=NULL,"lease_expires_at"=NULL,
       "heartbeat_at"=NULL,"completed_at"=NULL,"available_at"=NOW(),
       "updated_at"=NOW() WHERE "id"=$1 AND "status"='dead_lettered'
     RETURNING *`,
    [id],
  );
  const row = updated.rows[0];
  if (!row) return undefined;
  const run = mapJobRun(row);
  await appendJobActivity(executor, {
    runId: id,
    type: "manual_retry",
    previousStatus: "dead_lettered",
    nextStatus: "queued",
    metadata: { availableAt: run.availableAt.toISOString() },
    ...(options.actor ? { actor: options.actor } : {}),
  });
  await recordAccelerationSignal({
    topic: "damat:jobs:wakeup",
    kind: "job",
    resourceId: run.id,
    scope: run.queue,
    payload: { kind: "jobs", queue: run.queue },
    executor,
  });
  return run;
}
