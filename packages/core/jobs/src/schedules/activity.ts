import type { DurabilityExecutor } from "@damatjs/durability";

export async function appendScheduleActivity(
  executor: DurabilityExecutor,
  scheduleId: string,
  type: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await executor.query(
    `INSERT INTO "_damat_job_schedule_activity"
       ("schedule_id","type","metadata")
     VALUES ($1::uuid,$2::text,$3::jsonb)`,
    [scheduleId, type, JSON.stringify(metadata)],
  );
}
