import type { QueryResultRow } from "@damatjs/deps/pg";
import { getDurabilityClient } from "../client/global";
import type { DurabilityExecutor } from "../client/types";
import type { ListWorkersOptions, WorkerRecord, WorkerState } from "./types";

export function workerExecutor(executor?: DurabilityExecutor) {
  return executor ?? getDurabilityClient();
}

interface WorkerRow extends QueryResultRow {
  id: string;
  capabilities: string[];
  hostname: string;
  process_id: number;
  application: Record<string, unknown>;
  deployment: Record<string, unknown>;
  started_at: Date;
  last_heartbeat_at: Date;
  stopping_at: Date | null;
  stopped_at: Date | null;
  concurrency: number;
  in_flight: number;
}

function workerState(
  row: WorkerRow,
  age: number,
  staleAfter: number,
): WorkerState {
  if (row.stopped_at) return "stopped";
  if (row.stopping_at) return "stopping";
  return age > staleAfter ? "stale" : "active";
}

function mapWorker(
  row: WorkerRow,
  now: Date,
  staleAfter: number,
): WorkerRecord {
  const heartbeatAgeMs = Math.max(
    0,
    now.getTime() - row.last_heartbeat_at.getTime(),
  );
  return {
    id: row.id,
    capabilities: row.capabilities,
    hostname: row.hostname,
    processId: row.process_id,
    application: row.application,
    deployment: row.deployment,
    startedAt: row.started_at,
    lastHeartbeatAt: row.last_heartbeat_at,
    ...(row.stopping_at ? { stoppingAt: row.stopping_at } : {}),
    ...(row.stopped_at ? { stoppedAt: row.stopped_at } : {}),
    concurrency: row.concurrency,
    inFlight: row.in_flight,
    heartbeatAgeMs,
    state: workerState(row, heartbeatAgeMs, staleAfter),
  };
}

export async function listWorkers(
  options: ListWorkersOptions = {},
): Promise<WorkerRecord[]> {
  const now = options.now ?? new Date();
  const staleAfter = options.staleAfterMs ?? 90_000;
  const ids = options.ids ?? [];
  const result = await workerExecutor(options.executor).query<WorkerRow>(
    `SELECT * FROM "_damat_workers"
     WHERE ($1::text[] IS NULL OR "id" = ANY($1))
     ORDER BY "started_at" DESC, "id" ASC`,
    [ids.length ? ids : null],
  );
  return result.rows.map((row) => mapWorker(row, now, staleAfter));
}
