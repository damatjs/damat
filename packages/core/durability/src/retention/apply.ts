import type { DurabilityExecutor } from "../client/types";
import type { SetRetentionOverrideInput } from "./types";

export async function applyRetentionOverride(
  executor: DurabilityExecutor,
  input: SetRetentionOverrideInput,
): Promise<void> {
  if (input.workKind !== "event") return;
  const retention = input.retentionMs === "forever" ? null : input.retentionMs;
  await executor.query(
    `UPDATE "_damat_event_outbox" SET "retention_ms"=$2,
       "retention_at"=CASE WHEN $2::bigint IS NULL THEN NULL
         ELSE "available_at"+($2*INTERVAL '1 ms') END
     WHERE $1='*' OR "name"=$1`,
    [input.scope, retention],
  );
  await executor.query(
    `UPDATE "_damat_event_deliveries" d SET "retention_at"=o."retention_at",
       "updated_at"=NOW() FROM "_damat_event_outbox" o
     WHERE o."id"=d."event_id" AND ($1='*' OR o."name"=$1)`,
    [input.scope],
  );
}
