import type { DurabilityExecutor } from "@damatjs/durability";
import { RUN_SELECT, type RunRow } from "../repositories";

export async function loadPipelineRunRow(
  executor: DurabilityExecutor,
  runId: string,
): Promise<RunRow> {
  const result = await executor.query<RunRow>(
    `${RUN_SELECT} WHERE r."id"=$1 FOR UPDATE OF r`,
    [runId],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`Pipeline run "${runId}" was not found`);
  return row;
}
