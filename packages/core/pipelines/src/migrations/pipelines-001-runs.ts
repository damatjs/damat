export const pipelines001RunsSql = `
CREATE TABLE "_damat_pipeline_runs" (
  "id" UUID NOT NULL,
  "definition_id" UUID NOT NULL,
  "version_id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "paused_from" TEXT,
  "input" JSONB NOT NULL,
  "output" JSONB,
  "error" JSONB,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "trigger" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "correlation_id" TEXT,
  "idempotency_key" TEXT,
  "parent_run_id" UUID,
  "parent_node_execution_id" UUID,
  "retention_ms" BIGINT,
  "retention_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "_damat_pipeline_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_pipeline_runs_definition_fkey" FOREIGN KEY
    ("definition_id") REFERENCES "_damat_pipeline_definitions"("id"),
  CONSTRAINT "_damat_pipeline_runs_version_fkey" FOREIGN KEY
    ("version_id") REFERENCES "_damat_pipeline_versions"("id"),
  CONSTRAINT "_damat_pipeline_runs_parent_fkey" FOREIGN KEY
    ("parent_run_id") REFERENCES "_damat_pipeline_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "_damat_pipeline_runs_status_check" CHECK ("status" IN
    ('running','waiting','paused','compensating','succeeded','failed',
     'cancelled','compensated','compensation_failed')),
  CONSTRAINT "_damat_pipeline_runs_paused_from_check" CHECK ("paused_from" IS NULL OR
    "paused_from" IN ('running','waiting','compensating'))
);
CREATE UNIQUE INDEX "_damat_pipeline_runs_idempotency_uidx" ON
  "_damat_pipeline_runs" ("definition_id","idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE "_damat_pipeline_node_executions" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "node_id" TEXT NOT NULL,
  "activation_key" TEXT NOT NULL DEFAULT 'main',
  "phase" TEXT NOT NULL DEFAULT 'forward',
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "error" JSONB,
  "job_run_id" UUID,
  "child_run_id" UUID,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "_damat_pipeline_node_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "_damat_pipeline_node_executions_run_fkey" FOREIGN KEY
    ("run_id") REFERENCES "_damat_pipeline_runs"("id") ON DELETE CASCADE,
  CONSTRAINT "_damat_pipeline_node_executions_job_fkey" FOREIGN KEY
    ("job_run_id") REFERENCES "_damat_job_runs"("id") ON DELETE RESTRICT,
  CONSTRAINT "_damat_pipeline_node_executions_child_fkey" FOREIGN KEY
    ("child_run_id") REFERENCES "_damat_pipeline_runs"("id") ON DELETE SET NULL,
  CONSTRAINT "_damat_pipeline_node_executions_phase_check"
    CHECK ("phase" IN ('forward','compensation')),
  CONSTRAINT "_damat_pipeline_node_executions_status_check" CHECK ("status" IN
    ('ready','queued','running','waiting','succeeded','failed','skipped',
     'cancelled','compensated','compensation_failed')),
  CONSTRAINT "_damat_pipeline_node_executions_identity_key"
    UNIQUE ("run_id","node_id","activation_key","phase")
);
`;
