import { redactValue } from "@damatjs/durability";
import { mapNodeExecution, mapPipelineRun, RUN_SELECT } from "../repositories";
import type { ActivityRow, NodeExecutionRow } from "../repositories";
import type { RunRow } from "../repositories";
import {
  inspectionOptionsForManifest,
  type ResolvedPipelineInspectionOptions,
} from "./config";
import type { LayoutRow, SignalRow, TransitionRow } from "./detail-rows";
import { readPipelineJobRecords } from "./job-records";
import type { PipelineRunDetail } from "./types";
import { visibleManifest, visibleTransitions } from "./manifest";
import { visibleNode, visibleRun } from "./visibility";

export function getInspectedPipelineRun(
  id: string,
  options: ResolvedPipelineInspectionOptions,
): Promise<PipelineRunDetail | null> {
  return options.client.transaction(async (executor) => {
    await executor.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const rows = await executor.query<RunRow>(`${RUN_SELECT} WHERE r."id"=$1`, [
      id,
    ]);
    const row = rows.rows[0];
    if (!row) return null;
    const visibility = inspectionOptionsForManifest(options, row.manifest);
    const nodes = await executor.query<NodeExecutionRow>(
      `SELECT * FROM "_damat_pipeline_node_executions" WHERE "run_id"=$1 ORDER BY "created_at","id"`,
      [id],
    );
    const transitions = await executor.query<TransitionRow>(
      `SELECT * FROM "_damat_pipeline_transitions" WHERE "run_id"=$1 ORDER BY "id"`,
      [id],
    );
    const signals = await executor.query<SignalRow>(
      `SELECT * FROM "_damat_pipeline_signals" WHERE "run_id"=$1 ORDER BY "created_at","id"`,
      [id],
    );
    const activity = await executor.query<ActivityRow>(
      `SELECT * FROM "_damat_pipeline_activity" WHERE "run_id"=$1 ORDER BY "created_at","id"`,
      [id],
    );
    const layout = await executor.query<LayoutRow>(
      `SELECT "layout" FROM "_damat_pipeline_layouts" WHERE "version_id"=$1
       ORDER BY "revision" DESC LIMIT 1`,
      [row.version_id],
    );
    const visibleNodes = nodes.rows
      .map(mapNodeExecution)
      .map((node) => visibleNode(node, visibility));
    const jobs = await readPipelineJobRecords(
      executor,
      visibleNodes,
      visibility,
    );
    return {
      ...visibleRun(mapPipelineRun(row), visibility),
      manifest: visibleManifest(row.manifest, visibility),
      ...(layout.rows[0] ? { layout: layout.rows[0].layout } : {}),
      nodes: visibleNodes,
      transitions: visibleTransitions(transitions.rows, visibility),
      signals: visibleSignals(signals.rows, visibility),
      activity: visibleActivity(activity.rows, visibility),
      jobs,
    };
  });
}

function visibleActivity(
  rows: ActivityRow[],
  options: ResolvedPipelineInspectionOptions,
) {
  if (options.visibility === "full")
    return redactValue(rows, options.redaction) as unknown[];
  return rows.map(({ details: _, actor, ...row }) => ({
    ...row,
    ...(options.visibility === "metadata" ? { actor } : {}),
  }));
}

function visibleSignals(
  rows: SignalRow[],
  options: ResolvedPipelineInspectionOptions,
): unknown[] {
  if (options.visibility === "full")
    return redactValue(rows, options.redaction) as unknown[];
  return rows.map(({ payload: _, actor, ...row }) => ({
    ...row,
    ...(options.visibility === "metadata" ? { actor } : {}),
  }));
}
