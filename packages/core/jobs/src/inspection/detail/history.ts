import {
  listWorkControlActivity,
  listWorkers,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type { JobAttempt } from "../../repositories";
import type { JobLeaseSummary } from "../types";
import type { DetailRunRow } from "./rows";

export async function readOperationalHistory(
  executor: DurabilityExecutor,
  row: DetailRunRow,
  attempts: JobAttempt[],
  staleAfterMs: number,
) {
  const workerIds = [...new Set(attempts.map(({ workerId }) => workerId))];
  const workers = await listWorkers({
    ids: workerIds,
    staleAfterMs,
    now: row.inspected_at,
    executor,
  });
  const controlHistory = await listWorkControlActivity({
    kind: "job",
    scope: row.queue,
    limit: 501,
    executor,
  });
  const controlActivity = controlHistory.slice(0, 500);
  const controlHistoryTruncated = controlHistory.length > 500;
  const leaseHistory: JobLeaseSummary[] = attempts.map((attempt) => {
    const current = row.lease_token === attempt.leaseToken;
    return {
      workerId: attempt.workerId,
      leaseToken: attempt.leaseToken,
      ...(current && row.lease_expires_at
        ? { expiresAt: row.lease_expires_at }
        : {}),
      ...(attempt.heartbeatAt ? { heartbeatAt: attempt.heartbeatAt } : {}),
      state:
        current &&
        row.lease_expires_at &&
        row.lease_expires_at > row.inspected_at
          ? "active"
          : "stale",
    };
  });
  return {
    workers,
    controlActivity,
    controlHistoryTruncated,
    leaseHistory,
  };
}
