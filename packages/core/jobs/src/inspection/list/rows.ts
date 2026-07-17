import type { QueryResultRow } from "@damatjs/deps/pg";
import { applyInspectionVisibility, redactValue } from "@damatjs/durability";
import { mapJobRun, type JobRunRow } from "../../repositories/map-run";
import type { ResolvedInspectionOptions } from "../config";
import type { JobRunSummary, JobRunView } from "../types";

export interface InspectionRunRow extends JobRunRow, QueryResultRow {
  cursor_at: Date;
  inspected_at: Date;
  recovered: boolean;
  lease_owner: string | null;
  lease_token: string | null;
  lease_expires_at: Date | null;
  heartbeat_at: Date | null;
}

const views: Record<string, JobRunView> = {
  queued: "upcoming",
  running: "processing",
  retry_wait: "retrying",
  dead_lettered: "failed",
  succeeded: "completed",
  cancelled: "completed",
};

export function mapRunSummary(
  row: InspectionRunRow,
  options: ResolvedInspectionOptions,
): JobRunSummary {
  const run = mapJobRun(row);
  const visible = applyInspectionVisibility(
    redactValue(
      { payload: run.payload, metadata: run.metadata },
      options.redaction,
    ) as { payload: unknown; metadata: Record<string, unknown> },
    options.visibility,
  );
  const lease = row.lease_owner && row.lease_token;
  return {
    id: run.id,
    name: run.name,
    queue: run.queue,
    status: run.status,
    view: views[run.status]!,
    recovered: row.recovered,
    ...visible,
    priority: run.priority,
    availableAt: run.availableAt,
    attemptCount: run.attemptCount,
    maxAttempts: run.maxAttempts,
    ...(lease
      ? {
          currentLease: {
            workerId: row.lease_owner!,
            leaseToken: row.lease_token!,
            ...(row.lease_expires_at
              ? { expiresAt: row.lease_expires_at }
              : {}),
            ...(row.heartbeat_at ? { heartbeatAt: row.heartbeat_at } : {}),
            state:
              row.lease_expires_at && row.lease_expires_at > row.inspected_at
                ? "active"
                : "stale",
          },
        }
      : {}),
    ...(run.correlationId ? { correlationId: run.correlationId } : {}),
    ...(run.scheduleId ? { scheduleId: run.scheduleId } : {}),
    ...(run.deduplicationKey ? { deduplicationKey: run.deduplicationKey } : {}),
    createdAt: run.createdAt,
    ...(run.startedAt ? { startedAt: run.startedAt } : {}),
    ...(run.completedAt ? { completedAt: run.completedAt } : {}),
  };
}
