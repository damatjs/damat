export const listRunsSql = `
SELECT r.*, (date_trunc('milliseconds',r."created_at" AT TIME ZONE 'UTC')
  AT TIME ZONE 'UTC') AS "cursor_at",
  NOW() AS "inspected_at", EXISTS (
    SELECT 1 FROM "_damat_job_activity" a
    WHERE a."run_id"=r."id" AND a."type"='lease_recovered') AS "recovered"
FROM "_damat_job_runs" r
WHERE ($1::text[] IS NULL OR r."status"=ANY($1))
  AND ($2::text[] IS NULL OR r."status"=ANY($2))
  AND ($3::boolean IS NULL OR EXISTS (
    SELECT 1 FROM "_damat_job_activity" a
    WHERE a."run_id"=r."id" AND a."type"='lease_recovered')=$3)
  AND ($4::text[] IS NULL OR r."queue"=ANY($4))
  AND ($5::text[] IS NULL OR r."name"=ANY($5))
  AND ($6::text[] IS NULL OR r."lease_owner"=ANY($6))
  AND ($7::text IS NULL OR CASE $7
    WHEN 'active' THEN r."status"='running' AND r."lease_expires_at">NOW()
    WHEN 'stale' THEN r."status"='running' AND r."lease_expires_at"<=NOW()
    WHEN 'none' THEN r."lease_token" IS NULL ELSE FALSE END)
  AND ($8::timestamptz IS NULL OR r."available_at">=$8)
  AND ($9::timestamptz IS NULL OR r."available_at"<$9)
  AND ($10::timestamptz IS NULL OR r."created_at">=$10)
  AND ($11::timestamptz IS NULL OR r."created_at"<$11)
  AND ($12::timestamptz IS NULL OR r."started_at">=$12)
  AND ($13::timestamptz IS NULL OR r."started_at"<$13)
  AND ($14::timestamptz IS NULL OR r."completed_at">=$14)
  AND ($15::timestamptz IS NULL OR r."completed_at"<$15)
  AND (($16::timestamptz IS NULL AND $17::timestamptz IS NULL) OR EXISTS (
    SELECT 1 FROM "_damat_job_activity" f WHERE f."run_id"=r."id"
      AND f."type" IN ('retry_wait','dead_lettered')
      AND ($16::timestamptz IS NULL OR f."occurred_at">=$16)
      AND ($17::timestamptz IS NULL OR f."occurred_at"<$17)))
  AND ($18::text[] IS NULL OR r."correlation_id"=ANY($18))
  AND ($19::uuid[] IS NULL OR r."schedule_id"=ANY($19))
  AND ($20::text[] IS NULL OR r."deduplication_key"=ANY($20))
  AND ($21::timestamptz IS NULL OR
    (date_trunc('milliseconds',r."created_at" AT TIME ZONE 'UTC'),r."id")
      <(($21::timestamptz AT TIME ZONE 'UTC'),$22::uuid))
ORDER BY date_trunc('milliseconds',r."created_at" AT TIME ZONE 'UTC') DESC,
  r."id" DESC
LIMIT $23
`.trim();
