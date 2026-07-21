export const jobs001RunsSql = `
CREATE TABLE "_damat_job_runs" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL, "queue" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "payload" JSONB NOT NULL, "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "backoff_ms" BIGINT NOT NULL DEFAULT 1000,
  "backoff_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "lease_owner" TEXT, "lease_token" UUID, "lease_expires_at" TIMESTAMPTZ,
  "heartbeat_at" TIMESTAMPTZ, "cancellation_requested_at" TIMESTAMPTZ,
  "schedule_id" UUID, "scheduled_for" TIMESTAMPTZ,
  "deduplication_key" TEXT, "progress" JSONB, "result" JSONB,
  "correlation_id" TEXT, "last_error" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "started_at" TIMESTAMPTZ, "completed_at" TIMESTAMPTZ,
  CONSTRAINT "_damat_job_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_job_runs_status_check" CHECK ("status" IN
    ('queued','running','retry_wait','succeeded','dead_lettered','cancelled')),
  CONSTRAINT "_damat_job_runs_attempt_count_check" CHECK ("attempt_count" >= 0),
  CONSTRAINT "_damat_job_runs_max_attempts_check" CHECK ("max_attempts" > 0),
  CONSTRAINT "_damat_job_runs_backoff_ms_check" CHECK ("backoff_ms" >= 0),
  CONSTRAINT "_damat_job_runs_backoff_multiplier_check"
    CHECK ("backoff_multiplier" >= 1),
  CONSTRAINT "_damat_job_runs_schedule_pair_check" CHECK (
    ("schedule_id" IS NULL AND "scheduled_for" IS NULL) OR
    ("schedule_id" IS NOT NULL AND "scheduled_for" IS NOT NULL))
);
CREATE INDEX "_damat_job_runs_due_idx" ON "_damat_job_runs"
  ("queue", "status", "available_at", "priority", "created_at");
CREATE INDEX "_damat_job_runs_name_idx" ON "_damat_job_runs"
  ("name", "created_at");
`.trim();
