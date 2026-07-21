import type { DurabilityExecutor } from "@damatjs/durability";
import { getDurabilityClient } from "@damatjs/durability";

export const pipelineExecutor = (executor?: DurabilityExecutor) =>
  executor ?? getDurabilityClient();

export const RUN_SELECT = `SELECT r.*,d."name",v."source_version",v."manifest"
  FROM "_damat_pipeline_runs" r
  JOIN "_damat_pipeline_definitions" d ON d."id"=r."definition_id"
  JOIN "_damat_pipeline_versions" v ON v."id"=r."version_id"`;
