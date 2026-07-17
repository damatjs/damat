export const jobs003ObservabilitySql = `
CREATE INDEX "_damat_job_activity_summary_idx"
  ON "_damat_job_activity" ("occurred_at", "type", "run_id");
CREATE INDEX "_damat_job_attempts_summary_idx"
  ON "_damat_job_attempts" ("finished_at", "duration_ms")
  WHERE "finished_at" IS NOT NULL;
ALTER TABLE "_damat_job_attempts"
  ADD COLUMN "available_at" TIMESTAMPTZ,
  ADD COLUMN "wait_ms" BIGINT,
  ADD CONSTRAINT "_damat_job_attempts_wait_ms_check" CHECK ("wait_ms" >= 0);
CREATE INDEX "_damat_job_attempts_waiting_summary_idx"
  ON "_damat_job_attempts" ("started_at", "wait_ms")
  WHERE "wait_ms" IS NOT NULL;
`.trim();
