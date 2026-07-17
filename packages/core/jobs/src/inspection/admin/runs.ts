import { validateWorkActor, type WorkActor } from "@damatjs/durability";
import { cancelJobRun, retryJobRun } from "../../client";
import type { JobRun } from "../../repositories";
import { publishJobWakeup } from "../../wakeup/publisher";
import type { ResolvedInspectionOptions } from "../config";
import { invalidTransition, notFound } from "./errors";

export async function cancelInspectedJob(
  id: string,
  actor: WorkActor,
  reason: string | undefined,
  options: ResolvedInspectionOptions,
): Promise<JobRun> {
  validateWorkActor(actor);
  return options.client.transaction(async (executor) => {
    const run = await cancelJobRun(id, {
      actor,
      ...(reason ? { reason } : {}),
      executor,
    });
    if (run) return run;
    const found = await executor.query<{ status: string }>(
      `SELECT "status" FROM "_damat_job_runs" WHERE "id"=$1`,
      [id],
    );
    if (!found.rowCount) throw notFound("job run", id);
    throw invalidTransition(
      `job run cannot cancel from ${found.rows[0]!.status}`,
    );
  });
}

export async function retryInspectedJob(
  id: string,
  actor: WorkActor,
  options: ResolvedInspectionOptions,
): Promise<JobRun> {
  validateWorkActor(actor);
  const run = await options.client.transaction(async (executor) => {
    const current = await executor.query<{ status: string }>(
      `SELECT "status" FROM "_damat_job_runs" WHERE "id"=$1 FOR UPDATE`,
      [id],
    );
    if (!current.rowCount) throw notFound("job run", id);
    if (current.rows[0]!.status !== "dead_lettered") {
      throw invalidTransition("only dead-lettered jobs can be retried");
    }
    return (await retryJobRun(id, { actor, executor }))!;
  });
  await publishJobWakeup(run.queue);
  return run;
}
