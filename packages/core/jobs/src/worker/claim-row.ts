import type { QueryResultRow } from "@damatjs/deps/pg";
import type { JobRunRow } from "../repositories/map-run";
import { mapJobRun } from "../repositories/map-run";
import type { ClaimedJobRun } from "./types";

export interface ClaimCandidateRow extends JobRunRow {
  previous_status: "queued" | "retry_wait" | "running";
  cancellation_requested_at: Date | null;
}

interface ClaimedRow extends JobRunRow, QueryResultRow {
  lease_owner: string;
  lease_token: string;
  lease_expires_at: Date;
}

export function mapClaimedJob(row: ClaimedRow): ClaimedJobRun {
  return {
    ...mapJobRun(row),
    workerId: row.lease_owner,
    leaseToken: row.lease_token,
    leaseExpiresAt: row.lease_expires_at,
  };
}
