import { Pool } from "@damatjs/deps/pg";

interface WorkerRow {
  id: string;
  capabilities: string[];
  heartbeatAgeMs: number;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for worker health");
const expected = (
  process.env.EXPECTED_WORKER_CAPABILITIES ??
  "jobs:reports,jobs:damat-pipelines,events:"
).split(",");
const maxAge = Number(process.env.WORKER_MAX_HEARTBEAT_AGE_MS ?? 90_000);
const deadline =
  Date.now() + Number(process.env.WORKER_HEALTH_TIMEOUT_MS ?? 30_000);
const pool = new Pool({ connectionString: url });
let workers: WorkerRow[] = [];

try {
  while (Date.now() < deadline) {
    const result = await pool.query<WorkerRow>(`
      SELECT "id", "capabilities",
        EXTRACT(EPOCH FROM (NOW()-"last_heartbeat_at"))*1000 AS "heartbeatAgeMs"
      FROM "_damat_workers"
      WHERE "stopped_at" IS NULL AND "stopping_at" IS NULL`);
    workers = result.rows;
    const capabilities = workers.flatMap((worker) => worker.capabilities);
    const healthy = workers.every((worker) => worker.heartbeatAgeMs <= maxAge);
    if (
      healthy &&
      expected.every((prefix) =>
        capabilities.some((item) => item.startsWith(prefix)),
      )
    )
      break;
    await Bun.sleep(500);
  }
} finally {
  await pool.end();
}

const capabilities = workers.flatMap((worker) => worker.capabilities);
const missing = expected.filter(
  (prefix) => !capabilities.some((item) => item.startsWith(prefix)),
);
const stale = workers.filter((worker) => worker.heartbeatAgeMs > maxAge);
if (missing.length || stale.length)
  throw new Error(
    `worker health failed: missing=${missing.join(",")} stale=${stale.map((row) => row.id).join(",")}`,
  );
console.log(JSON.stringify({ workers, expected }, null, 2));
