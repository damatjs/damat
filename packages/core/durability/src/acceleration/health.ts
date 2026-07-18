import type { QueryResultRow } from "@damatjs/deps/pg";
import { getDurabilityClient } from "../client/global";
import type { AccelerationMode } from "../coordinator";
import type { AccelerationHealth } from "./types";

interface HealthRow extends QueryResultRow {
  mode: AccelerationMode;
  last_success_at: Date | null;
  projection_checkpoint: string | null;
  last_rebuild_at: Date | null;
  fallback_interval_ms: number;
  pending_count: string;
}

export async function getAccelerationHealth(): Promise<AccelerationHealth> {
  const result = await getDurabilityClient().query<HealthRow>(
    `SELECT s.*,(SELECT COUNT(*) FROM "_damat_acceleration_outbox"
       WHERE "published_at" IS NULL) AS "pending_count"
     FROM "_damat_acceleration_state" s WHERE "id"=TRUE`,
  );
  const row = result.rows[0];
  if (!row) throw new Error("Acceleration state is not migrated");
  return {
    mode: row.mode,
    ...(row.last_success_at
      ? { lastSuccessfulPublication: row.last_success_at }
      : {}),
    pendingOutboxCount: Number(row.pending_count),
    ...(row.projection_checkpoint
      ? { projectionCheckpoint: String(row.projection_checkpoint) }
      : {}),
    ...(row.last_rebuild_at ? { lastRebuildAt: row.last_rebuild_at } : {}),
    fallbackPollIntervalMs: row.fallback_interval_ms,
  };
}

export async function updateAccelerationState(input: {
  mode: AccelerationMode;
  fallbackPollIntervalMs: number;
  checkpoint?: string;
  rebuilt?: boolean;
  published?: boolean;
}): Promise<void> {
  await getDurabilityClient().query(
    `UPDATE "_damat_acceleration_state" SET "mode"=$1,
       "fallback_interval_ms"=$2,
       "projection_checkpoint"=COALESCE($3,"projection_checkpoint"),
       "last_success_at"=CASE WHEN $5 THEN NOW() ELSE "last_success_at" END,
       "last_rebuild_at"=CASE WHEN $4 THEN NOW() ELSE "last_rebuild_at" END,
       "updated_at"=NOW() WHERE "id"=TRUE`,
    [input.mode, input.fallbackPollIntervalMs, input.checkpoint ?? null,
      input.rebuilt ?? false, input.published ?? false],
  );
}
