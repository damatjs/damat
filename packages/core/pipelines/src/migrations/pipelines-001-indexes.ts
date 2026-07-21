export const pipelines001IndexesSql = `
CREATE INDEX "_damat_pipeline_versions_active_idx"
  ON "_damat_pipeline_versions" ("definition_id","created_at" DESC);
CREATE INDEX "_damat_pipeline_runs_cursor_idx"
  ON "_damat_pipeline_runs" ("created_at" DESC,"id" DESC);
CREATE INDEX "_damat_pipeline_runs_status_idx"
  ON "_damat_pipeline_runs" ("status","updated_at");
CREATE INDEX "_damat_pipeline_runs_parent_idx"
  ON "_damat_pipeline_runs" ("parent_run_id","created_at");
CREATE INDEX "_damat_pipeline_runs_retention_idx"
  ON "_damat_pipeline_runs" ("retention_at")
  WHERE "retention_at" IS NOT NULL;
CREATE INDEX "_damat_pipeline_nodes_router_idx"
  ON "_damat_pipeline_node_executions" ("status","available_at","created_at")
  WHERE "status" IN ('ready','queued','running','waiting');
CREATE INDEX "_damat_pipeline_nodes_job_idx"
  ON "_damat_pipeline_node_executions" ("job_run_id")
  WHERE "job_run_id" IS NOT NULL;
CREATE INDEX "_damat_pipeline_nodes_child_idx"
  ON "_damat_pipeline_node_executions" ("child_run_id")
  WHERE "child_run_id" IS NOT NULL;
CREATE INDEX "_damat_pipeline_transitions_run_idx"
  ON "_damat_pipeline_transitions" ("run_id","id");
CREATE INDEX "_damat_pipeline_signals_pending_idx"
  ON "_damat_pipeline_signals" ("run_id","name","created_at")
  WHERE "consumed_at" IS NULL;
CREATE INDEX "_damat_pipeline_schedules_due_idx"
  ON "_damat_pipeline_schedules" ("next_at") WHERE "enabled";
CREATE INDEX "_damat_pipeline_activity_run_idx"
  ON "_damat_pipeline_activity" ("run_id","created_at","id");
`;
