import { createDurabilityClient } from "@damatjs/durability";
import { createJobInspectionClient } from "../../src/inspection";
import { ensureStorage, pool, uniqueName } from "../storage/context";

export { ensureStorage, pool, uniqueName };

export const database = createDurabilityClient({ pool });

export function inspection(options: Record<string, unknown> = {}) {
  return createJobInspectionClient({
    cursorSigningKey: "task-10-jobs-test-key",
    client: database,
    ...options,
  });
}

export async function insertRun(input: {
  status?: string;
  queue?: string;
  name?: string;
  createdAt?: Date;
  payload?: unknown;
}) {
  const id = crypto.randomUUID();
  const queue = input.queue ?? uniqueName("inspection-queue");
  const name = input.name ?? uniqueName("inspection-job");
  await pool.query(
    `INSERT INTO "_damat_job_runs"
      ("id","name","queue","status","payload","metadata","created_at")
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
    [
      id,
      name,
      queue,
      input.status ?? "queued",
      JSON.stringify(input.payload ?? { secret: "value" }),
      JSON.stringify({ source: "inspection" }),
      input.createdAt ?? new Date(),
    ],
  );
  return { id, queue, name };
}
