import {
  pauseWork,
  resumeWork,
  validateWorkActor,
  type DurabilityExecutor,
  type WorkActor,
} from "@damatjs/durability";
import { publishJobWakeup } from "../../wakeup/publisher";
import type { ResolvedInspectionOptions } from "../config";
import { invalidTransition } from "./errors";

async function lockControl(
  executor: DurabilityExecutor,
  queue: string,
): Promise<boolean | undefined> {
  await executor.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('job:'||$1,0))`,
    [queue],
  );
  const result = await executor.query<{ paused: boolean }>(
    `SELECT "paused" FROM "_damat_work_controls"
     WHERE "work_kind"='job' AND "scope"=$1 FOR UPDATE`,
    [queue],
  );
  return result.rows[0]?.paused;
}

export async function setQueuePaused(
  queue: string,
  paused: boolean,
  actor: WorkActor,
  reason: string | undefined,
  options: ResolvedInspectionOptions,
): Promise<void> {
  validateWorkActor(actor);
  await options.client.transaction(async (executor) => {
    const current = await lockControl(executor, queue);
    if (current === paused || (!paused && current === undefined)) {
      throw invalidTransition(
        `job queue is already ${paused ? "paused" : "active"}`,
      );
    }
    const change = paused ? pauseWork : resumeWork;
    await change({
      kind: "job",
      scope: queue,
      actor,
      ...(reason ? { reason } : {}),
      executor,
    });
  });
  if (!paused) await publishJobWakeup(queue);
}
