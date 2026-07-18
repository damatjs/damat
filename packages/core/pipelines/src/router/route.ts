import { getDurabilityClient } from "@damatjs/durability";
import { publishJobWakeup } from "@damatjs/jobs";
import { claimRoutableNodes, claimTerminalJobExecutions } from "./claims";
import { completeIdlePipelineRuns } from "./complete-runs";
import { processRoutableNode } from "./process";
import { projectTerminalJob } from "./terminal";
import type { QueryResultRow } from "@damatjs/deps/pg";
import { processPipelineTriggers } from "../triggers";
import { retainPipelineRuns } from "../retention";

interface NodeState extends QueryResultRow {
  status: string;
  updated_at: Date;
}
interface NextDelayRow extends QueryResultRow {
  available_at: Date | null;
}
export interface PipelineRouteCycle {
  count: number;
  nextDelayMs?: number;
}

export async function routePipelines(
  limit = 100,
  runRetention = false,
): Promise<number> {
  return (await routePipelineCycle(limit, runRetention)).count;
}

export async function routePipelineCycle(
  limit = 100,
  runRetention = false,
): Promise<PipelineRouteCycle> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("pipeline route limit must be between 1 and 1000");
  }
  const result = await getDurabilityClient().transaction(async (executor) => {
    const triggers = await processPipelineTriggers(executor, limit);
    const terminal = await claimTerminalJobExecutions(
      executor,
      Math.max(0, limit - triggers),
    );
    for (const execution of terminal)
      await projectTerminalJob(executor, execution);
    const remaining = Math.max(0, limit - triggers - terminal.length);
    const nodes = remaining
      ? await claimRoutableNodes(executor, remaining)
      : [];
    const queues = new Set<string>();
    let changed = 0;
    for (const node of nodes) {
      const queue = await processRoutableNode(executor, node);
      if (queue) queues.add(queue);
      const current = await executor.query<NodeState>(
        `SELECT "status","updated_at" FROM "_damat_pipeline_node_executions" WHERE "id"=$1`,
        [node.id],
      );
      const state = current.rows[0];
      if (
        state &&
        (state.status !== node.status ||
          state.updated_at.getTime() !== node.updated_at.getTime())
      )
        changed++;
    }
    const completed = await completeIdlePipelineRuns(executor, limit);
    const retained = runRetention
      ? await retainPipelineRuns(
          executor,
          null,
          limit,
          { id: "pipeline-retention", type: "system" },
          "scheduled retention",
        )
      : { deletedRuns: 0, deletedJobs: 0 };
    const due = await executor.query<NextDelayRow>(
      `SELECT MIN(n."available_at") AS "available_at"
       FROM "_damat_pipeline_node_executions" n
       JOIN "_damat_pipeline_runs" r ON r."id"=n."run_id"
       WHERE n."kind"='delay' AND n."status"='waiting'
         AND r."status" IN ('running','waiting')`,
    );
    return {
      count:
        triggers + terminal.length + changed + completed + retained.deletedRuns,
      queues: [...queues],
      nextAt: due.rows[0]?.available_at,
    };
  });
  for (const queue of result.queues) await publishJobWakeup(queue);
  return {
    count: result.count,
    ...(result.nextAt
      ? { nextDelayMs: Math.max(0, result.nextAt.getTime() - Date.now()) }
      : {}),
  };
}
