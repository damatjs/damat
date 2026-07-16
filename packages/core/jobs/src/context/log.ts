import {
  getDurabilityClient,
  redactValue,
  type RedactionOptions,
  type WorkLogLevel,
  type WorkLogLimits,
} from "@damatjs/durability";
import { appendJobActivity } from "../repositories";
import { assertCurrentLease } from "../worker/fence";
import type { ClaimedJobRun } from "../worker/types";

const encoder = new TextEncoder();

export async function recordJobLog(
  claim: ClaimedJobRun,
  level: WorkLogLevel,
  message: string,
  context: Record<string, unknown>,
  limits: WorkLogLimits,
  redaction: RedactionOptions,
): Promise<void> {
  await getDurabilityClient().transaction(async (executor) => {
    await assertCurrentLease(executor, claim);
    const data = redactValue(context, redaction) as Record<string, unknown>;
    const size = encoder.encode(message + JSON.stringify(data)).byteLength;
    const totals = await executor.query<{ count: string; bytes: string }>(
      `SELECT COUNT(*)::text AS "count",
       COALESCE(SUM(OCTET_LENGTH("message")+OCTET_LENGTH("context"::text)),0)::text
         AS "bytes"
       FROM "_damat_job_logs"
       WHERE "run_id" = $1 AND "attempt_number" = $2`,
      [claim.id, claim.attemptCount],
    );
    const total = totals.rows[0]!;
    if (
      +total.count >= limits.maxCount ||
      +total.bytes + size > limits.maxBytes
    ) {
      await recordTruncation(executor, claim);
      return;
    }
    await executor.query(
      `INSERT INTO "_damat_job_logs"
       ("run_id","attempt_number","level","message","context","worker_id",
        "correlation_id","sequence")
       SELECT $1,$2,$3,$4,$5::jsonb,$6,"correlation_id",
         COALESCE((SELECT MAX("sequence")+1 FROM "_damat_job_logs"
           WHERE "run_id"=$1 AND "attempt_number"=$2),1)
       FROM "_damat_job_runs" WHERE "id"=$1`,
      [
        claim.id,
        claim.attemptCount,
        level,
        message,
        JSON.stringify(data),
        claim.workerId,
      ],
    );
  });
}

async function recordTruncation(
  executor: Parameters<typeof appendJobActivity>[0],
  claim: ClaimedJobRun,
): Promise<void> {
  const existing = await executor.query(
    `SELECT 1 FROM "_damat_job_activity"
     WHERE "run_id"=$1 AND "attempt_number"=$2 AND "type"='logs_truncated'`,
    [claim.id, claim.attemptCount],
  );
  if (!existing.rowCount) {
    await appendJobActivity(executor, {
      runId: claim.id,
      attemptNumber: claim.attemptCount,
      type: "logs_truncated",
      workerId: claim.workerId,
      leaseToken: claim.leaseToken,
    });
  }
}
