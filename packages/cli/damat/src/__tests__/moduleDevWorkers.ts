import { Pool, type QueryResultRow } from "@damatjs/deps/pg";

interface WorkerRow extends QueryResultRow {
  id: string;
  stopping_at: Date | null;
  stopped_at: Date | null;
}

async function workerRows(databaseUrl: string): Promise<WorkerRow[]> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query<WorkerRow>(
      `SELECT "id", "stopping_at", "stopped_at" FROM "_damat_workers"`,
    );
    return result.rows;
  } finally {
    await pool.end();
  }
}

export async function activeWorkerIds(databaseUrl: string): Promise<string[]> {
  try {
    const rows = await workerRows(databaseUrl);
    return rows.filter((row) => !row.stopped_at).map((row) => row.id);
  } catch (error) {
    if ((error as { code?: string }).code === "42P01") return [];
    throw error;
  }
}

export async function stoppedWorkers(
  databaseUrl: string,
  ids: string[],
): Promise<WorkerRow[]> {
  const selected = new Set(ids);
  return (await workerRows(databaseUrl)).filter((row) => selected.has(row.id));
}
