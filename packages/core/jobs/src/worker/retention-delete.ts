import type { DurabilityExecutor } from "@damatjs/durability";

export async function deleteExpiredDeduplication(
  executor: DurabilityExecutor,
  before: Date,
  limit: number,
  queue?: string,
): Promise<number> {
  const result = await executor.query(
    `DELETE FROM "_damat_job_deduplication" WHERE ("queue","job_name","deduplication_key") IN (
       SELECT "queue","job_name","deduplication_key" FROM "_damat_job_deduplication"
       WHERE "expires_at" IS NOT NULL AND "expires_at" <= $1
         AND ($3::text IS NULL OR "queue"=$3)
       ORDER BY "expires_at" LIMIT $2)`,
    [before, limit, queue ?? null],
  );
  return result.rowCount ?? 0;
}

export async function deleteTerminalJobRuns(
  executor: DurabilityExecutor,
  before: Date,
  limit: number,
  queue?: string,
): Promise<number> {
  const result = await executor.query(
    `DELETE FROM "_damat_job_runs" WHERE "id" IN (
       SELECT "id" FROM "_damat_job_runs"
       WHERE "status" IN ('succeeded','dead_lettered','cancelled')
         AND "completed_at" IS NOT NULL AND "completed_at" <= $1
         AND ($3::text IS NULL OR "queue"=$3)
       ORDER BY "completed_at","id" LIMIT $2)`,
    [before, limit, queue ?? null],
  );
  return result.rowCount ?? 0;
}
