import {
  getDurabilityClient,
  type AccelerationActor,
  type DurabilityExecutor,
} from "@damatjs/durability";

export async function auditAccelerationRebuild(
  actor: AccelerationActor,
  status: "requested" | "completed" | "failed",
  details: Record<string, unknown> = {},
  executor: DurabilityExecutor = getDurabilityClient(),
): Promise<void> {
  await executor.query(
    `INSERT INTO "_damat_maintenance_activity"
      ("operation","status","actor","details","completed_at")
     VALUES ('acceleration_projection_rebuild',$1,$2::jsonb,$3::jsonb,
       CASE WHEN $1='requested' THEN NULL ELSE NOW() END)`,
    [status, JSON.stringify(actor), JSON.stringify(details)],
  );
}
