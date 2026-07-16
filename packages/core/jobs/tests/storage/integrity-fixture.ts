import { pool, uniqueName } from "./context";

export async function insertSchedule(): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO "_damat_job_schedules"
     ("id","name","job_name","kind","payload","queue")
     VALUES ($1,$2,'job','once','{}','default')`,
    [id, uniqueName("schedule-integrity")],
  );
  return id;
}

export function insertRun(options: {
  scheduleId?: string;
  scheduledFor?: Date;
}) {
  return pool.query(
    `INSERT INTO "_damat_job_runs"
     ("id","name","queue","payload","schedule_id","scheduled_for")
     VALUES ($1,'job','default','{}',$2,$3)`,
    [
      crypto.randomUUID(),
      options.scheduleId ?? null,
      options.scheduledFor ?? null,
    ],
  );
}
