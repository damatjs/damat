import {
  getDurabilityClient,
  shouldRecordProgressActivity,
} from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import { assertCurrentLease } from "../worker/fence";
import type { ClaimedJobRun } from "../worker/types";

export async function recordJobProgress(
  claim: ClaimedJobRun,
  value: number | Record<string, unknown>,
  metadata: Record<string, unknown> = {},
  minimumIntervalMs = 1_000,
): Promise<void> {
  await getDurabilityClient().transaction(async (executor) => {
    await assertCurrentLease(executor, claim);
    const current = await executor.query<{
      progress: unknown;
      last_recorded_at: Date | null;
    }>(
      `SELECT r."progress", (
         SELECT MAX(a."occurred_at") FROM "_damat_job_activity" a
         WHERE a."run_id" = r."id" AND a."type" = 'progress'
       ) AS "last_recorded_at"
       FROM "_damat_job_runs" r WHERE r."id" = $1`,
      [claim.id],
    );
    const row = current.rows[0]!;
    const changed = JSON.stringify(row.progress) !== JSON.stringify(value);
    await executor.query(
      `UPDATE "_damat_job_runs" SET "progress" = $2::jsonb,
       "updated_at" = NOW() WHERE "id" = $1`,
      [claim.id, JSON.stringify(value)],
    );
    if (
      shouldRecordProgressActivity({
        changed,
        ...(row.last_recorded_at
          ? { lastRecordedAt: row.last_recorded_at }
          : {}),
        minimumIntervalMs,
      })
    ) {
      await appendJobActivity(executor, {
        runId: claim.id,
        attemptNumber: claim.attemptCount,
        type: "progress",
        previousStatus: "running",
        nextStatus: "running",
        workerId: claim.workerId,
        leaseToken: claim.leaseToken,
        metadata: { ...metadata, value },
      });
    }
  });
}
