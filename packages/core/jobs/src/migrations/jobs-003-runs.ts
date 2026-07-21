export const jobs003RunsSql = `
CREATE INDEX "_damat_job_runs_inspection_cursor_idx"
  ON "_damat_job_runs"
  (date_trunc('milliseconds', "created_at" AT TIME ZONE 'UTC'), "id");
CREATE INDEX "_damat_job_runs_status_cursor_idx"
  ON "_damat_job_runs" ("status", "created_at", "id");
CREATE INDEX "_damat_job_runs_queue_cursor_idx"
  ON "_damat_job_runs" ("queue", "created_at", "id");
CREATE INDEX "_damat_job_runs_correlation_idx"
  ON "_damat_job_runs" ("correlation_id")
  WHERE "correlation_id" IS NOT NULL;
CREATE INDEX "_damat_job_runs_schedule_idx"
  ON "_damat_job_runs" ("schedule_id") WHERE "schedule_id" IS NOT NULL;
CREATE INDEX "_damat_job_runs_deduplication_idx"
  ON "_damat_job_runs" ("deduplication_key")
  WHERE "deduplication_key" IS NOT NULL;
CREATE INDEX "_damat_job_runs_lease_idx"
  ON "_damat_job_runs" ("lease_owner", "lease_expires_at")
  WHERE "status" = 'running';
CREATE INDEX "_damat_job_runs_terminal_idx"
  ON "_damat_job_runs" ("completed_at", "status")
  WHERE "completed_at" IS NOT NULL;
`.trim();
