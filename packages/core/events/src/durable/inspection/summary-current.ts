import type { DurabilityExecutor } from "@damatjs/durability";

interface CurrentRow {
  status_counts: Record<string, number>;
  oldest_wait_ms: string | null;
  next_work_at: Date | null;
  active_leases: string;
  stale_leases: string;
}

export async function queryEventCurrentSummary(
  executor: DurabilityExecutor,
  now: Date,
) {
  const result = await executor.query<CurrentRow>(
    `SELECT
      COALESCE((SELECT jsonb_object_agg(s."status",s."total") FROM
        (SELECT "status",COUNT(*)::int AS "total"
         FROM "_damat_event_deliveries" GROUP BY "status") s),'{}'::jsonb)
        AS "status_counts",
      (SELECT MAX(w."wait_ms") FROM (
        SELECT GREATEST(0,EXTRACT(EPOCH FROM ($1-d."available_at"))*1000)
          AS "wait_ms" FROM "_damat_event_deliveries" d
          WHERE d."status" IN ('pending','retry_wait') AND d."available_at"<=$1
        UNION ALL
        SELECT GREATEST(0,EXTRACT(EPOCH FROM ($1-o."available_at"))*1000)
          FROM "_damat_event_outbox" o
          WHERE o."routed_at" IS NULL AND o."available_at"<=$1
       ) w) AS "oldest_wait_ms",
      (SELECT MIN(w."available_at") FROM (
        SELECT "available_at" FROM "_damat_event_deliveries"
          WHERE "status" IN ('pending','retry_wait')
        UNION ALL SELECT "available_at" FROM "_damat_event_outbox"
          WHERE "routed_at" IS NULL) w) AS "next_work_at",
      COUNT(*) FILTER (WHERE d."status"='running'
        AND d."lease_expires_at">$1)::text AS "active_leases",
      COUNT(*) FILTER (WHERE d."status"='running'
        AND d."lease_expires_at"<=$1)::text AS "stale_leases"
     FROM "_damat_event_deliveries" d`,
    [now],
  );
  const row = result.rows[0]!;
  return {
    statusCounts: Object.fromEntries(
      Object.entries(row.status_counts).map(([key, value]) => [key, +value]),
    ),
    ...(row.oldest_wait_ms !== null
      ? { oldestWaitMs: +row.oldest_wait_ms }
      : {}),
    ...(row.next_work_at ? { nextWorkAt: row.next_work_at } : {}),
    leases: { active: +row.active_leases, stale: +row.stale_leases },
  };
}
