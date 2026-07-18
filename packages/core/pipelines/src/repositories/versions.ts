import type { DurabilityExecutor } from "@damatjs/durability";
import type { DefinitionRow, VersionRow } from "./rows";

export interface ActiveVersionRow extends VersionRow {
  name: string;
  source: "code" | "web";
}

export async function findActivePipelineVersion(
  executor: DurabilityExecutor,
  name: string,
  versionId?: string,
): Promise<ActiveVersionRow | undefined> {
  const result = await executor.query<ActiveVersionRow>(
    `SELECT v.*,d."name",d."source" FROM "_damat_pipeline_versions" v
     JOIN "_damat_pipeline_definitions" d ON d."id"=v."definition_id"
     WHERE d."name"=$1 AND v."id"=COALESCE($2::uuid,d."active_version_id")`,
    [name, versionId ?? null],
  );
  return result.rows[0];
}

export async function findPipelineDefinitionRow(
  executor: DurabilityExecutor,
  name: string,
): Promise<DefinitionRow | undefined> {
  const result = await executor.query<DefinitionRow>(
    `SELECT * FROM "_damat_pipeline_definitions" WHERE "name"=$1`,
    [name],
  );
  return result.rows[0];
}
