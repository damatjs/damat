import { getDurabilityClient, type WorkActor } from "@damatjs/durability";
import { getAllPipelineDefinitions } from "../definitions";
import { syncCodeDefinition } from "../repositories";
import { validatePipelineComposition } from "./composition";

const actor: WorkActor = { id: "pipeline-bootstrap", type: "system" };

export async function syncPipelineDefinitions(): Promise<void> {
  const definitions = getAllPipelineDefinitions();
  await getDurabilityClient().transaction(async (executor) => {
    for (const definition of definitions) {
      await syncCodeDefinition(executor, definition, actor);
    }
    for (const definition of definitions) {
      const children = definition.manifest.nodes
        .filter(
          (node) =>
            node.kind === "child" ||
            node.kind === "foreach" ||
            node.kind === "loop",
        )
        .map((node) => node.pipeline);
      for (const name of new Set(children)) {
        const result = await executor.query(
          `SELECT 1 FROM "_damat_pipeline_definitions"
           WHERE "name"=$1 AND "active_version_id" IS NOT NULL`,
          [name],
        );
        if (!result.rowCount) {
          throw new Error(
            `Pipeline "${definition.name}" references unpublished child "${name}"`,
          );
        }
      }
    }
    await validatePipelineComposition(executor);
  });
}
