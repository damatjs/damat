import { getDurabilityClient } from "../client/global";
import { mapActivity, mapMaintenance } from "./rows";
import type { ActivityRow, MaintenanceRow } from "./rows";
import type {
  ListWorkControlActivityOptions,
  MaintenanceActivity,
  RecordMaintenanceActivityOptions,
  WorkControlActivity,
} from "./types";

export async function listWorkControlActivity(
  options: ListWorkControlActivityOptions,
): Promise<WorkControlActivity[]> {
  const executor = options.executor ?? getDurabilityClient();
  const result = await executor.query<ActivityRow>(
    `SELECT * FROM "_damat_work_control_activity"
     WHERE "work_kind" = $1 AND "scope" = $2
     ORDER BY "created_at" ASC, "id" ASC LIMIT $3`,
    [options.kind, options.scope, options.limit ?? 100],
  );
  return result.rows.map(mapActivity);
}

export async function recordMaintenanceActivity(
  options: RecordMaintenanceActivityOptions,
): Promise<MaintenanceActivity> {
  const executor = options.executor ?? getDurabilityClient();
  const result = await executor.query<MaintenanceRow>(
    `INSERT INTO "_damat_maintenance_activity"
      ("operation", "work_kind", "scope", "status", "actor", "details",
       "completed_at")
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
     RETURNING *`,
    [
      options.operation,
      options.kind ?? null,
      options.scope ?? null,
      options.status,
      JSON.stringify(options.actor),
      JSON.stringify(options.details ?? {}),
      options.completedAt ?? null,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Maintenance activity was not recorded");
  return mapMaintenance(row);
}
