import type { DurabilityExecutor } from "@damatjs/durability";
import type { QueryResultRow } from "@damatjs/deps/pg";
import { validatePipelineSchema, type PipelineManifest } from "../definitions";
import { markPipelineRunTerminal } from "../repositories";
import { evaluatePipelineValue } from "../runtime";
import { loadEvaluationContext } from "../runtime/context";
import { loadPipelineRunRow } from "./load";
import { serializePipelineError } from "./outcome";

interface CompletedRunRow extends QueryResultRow {
  id: string;
  parent_run_id: string | null;
  name: string;
  output: unknown;
  manifest: PipelineManifest;
}

export async function completeIdlePipelineRuns(
  executor: DurabilityExecutor,
  limit: number,
): Promise<number> {
  const result = await executor.query<CompletedRunRow>(
    `WITH candidates AS (
       SELECT r."id",r."parent_run_id",r."definition_id",r."version_id",
         (SELECT n."output" FROM "_damat_pipeline_node_executions" n
           WHERE n."run_id"=r."id" AND n."phase"='forward' AND n."status"='succeeded'
           ORDER BY n."completed_at" DESC,n."id" DESC LIMIT 1) AS "output"
       FROM "_damat_pipeline_runs" r
       WHERE r."status" IN ('running','waiting')
         AND NOT EXISTS (SELECT 1 FROM "_damat_pipeline_node_executions" n
           WHERE n."run_id"=r."id" AND n."status" IN ('ready','queued','running','waiting'))
       ORDER BY r."updated_at",r."id" FOR UPDATE SKIP LOCKED LIMIT $1
     ) SELECT c."id",c."parent_run_id",c."output",d."name",v."manifest"
       FROM candidates c JOIN "_damat_pipeline_definitions" d ON d."id"=c."definition_id"
       JOIN "_damat_pipeline_versions" v ON v."id"=c."version_id"`,
    [limit],
  );
  for (const run of result.rows) {
    try {
      const stored = await loadPipelineRunRow(executor, run.id);
      const output =
        run.manifest.output === undefined
          ? run.output
          : evaluatePipelineValue(
              run.manifest.output,
              await loadEvaluationContext(executor, stored),
            );
      validatePipelineSchema(
        output,
        run.manifest.outputSchema,
        `pipeline.${run.name}.output`,
      );
      await markPipelineRunTerminal(executor, run.id, "succeeded", output);
    } catch (error) {
      await markPipelineRunTerminal(
        executor,
        run.id,
        "failed",
        undefined,
        serializePipelineError(error),
      );
    }
  }
  return result.rows.length;
}
