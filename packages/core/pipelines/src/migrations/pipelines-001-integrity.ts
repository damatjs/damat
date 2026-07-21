export const pipelines001IntegritySql = `
ALTER TABLE "_damat_pipeline_versions"
  ADD CONSTRAINT "_damat_pipeline_versions_definition_id_key" UNIQUE ("definition_id","id");
ALTER TABLE "_damat_pipeline_definitions"
  ADD CONSTRAINT "_damat_pipeline_definitions_active_owner_fkey"
  FOREIGN KEY ("id","active_version_id")
  REFERENCES "_damat_pipeline_versions"("definition_id","id");
ALTER TABLE "_damat_pipeline_runs"
  ADD CONSTRAINT "_damat_pipeline_runs_version_owner_fkey"
  FOREIGN KEY ("definition_id","version_id")
  REFERENCES "_damat_pipeline_versions"("definition_id","id");

ALTER TABLE "_damat_pipeline_node_executions"
  ADD CONSTRAINT "_damat_pipeline_node_executions_run_id_key" UNIQUE ("run_id","id");
ALTER TABLE "_damat_pipeline_runs"
  ADD CONSTRAINT "_damat_pipeline_runs_parent_pair_check" CHECK
  (("parent_run_id" IS NULL) = ("parent_node_execution_id" IS NULL));
ALTER TABLE "_damat_pipeline_runs"
  ADD CONSTRAINT "_damat_pipeline_runs_parent_execution_fkey"
  FOREIGN KEY ("parent_run_id","parent_node_execution_id")
  REFERENCES "_damat_pipeline_node_executions"("run_id","id") ON DELETE CASCADE;

ALTER TABLE "_damat_pipeline_transitions"
  ADD CONSTRAINT "_damat_pipeline_transitions_from_fkey"
  FOREIGN KEY ("run_id","from_execution_id")
  REFERENCES "_damat_pipeline_node_executions"("run_id","id") ON DELETE CASCADE;
ALTER TABLE "_damat_pipeline_transitions"
  ADD CONSTRAINT "_damat_pipeline_transitions_to_fkey"
  FOREIGN KEY ("run_id","to_execution_id")
  REFERENCES "_damat_pipeline_node_executions"("run_id","id") ON DELETE CASCADE;
ALTER TABLE "_damat_pipeline_signals"
  ADD CONSTRAINT "_damat_pipeline_signals_consumed_execution_fkey"
  FOREIGN KEY ("run_id","consumed_by")
  REFERENCES "_damat_pipeline_node_executions"("run_id","id");
ALTER TABLE "_damat_pipeline_activity"
  ADD CONSTRAINT "_damat_pipeline_activity_node_run_check"
  CHECK ("node_execution_id" IS NULL OR "run_id" IS NOT NULL);
ALTER TABLE "_damat_pipeline_activity"
  ADD CONSTRAINT "_damat_pipeline_activity_node_run_fkey"
  FOREIGN KEY ("run_id","node_execution_id")
  REFERENCES "_damat_pipeline_node_executions"("run_id","id") ON DELETE CASCADE;
`;
