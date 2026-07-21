import {
  findPipelineRun,
  listPipelineNodeExecutions,
  routePipelineCycle,
} from "../../src";
import { pool } from "./context";

export async function settleQueuedPipelineJobs(
  runId: string,
  status: "succeeded" | "dead_lettered" | "cancelled" = "succeeded",
  result: unknown = 3,
) {
  const nodes = await listPipelineNodeExecutions(runId);
  for (const node of nodes.filter(
    (value) => value.jobRunId && value.status === "queued",
  )) {
    await pool.query(
      `UPDATE "_damat_job_runs" SET "status"=$2,"result"=$3::jsonb,
       "last_error"=NULL,"completed_at"=NOW(),"updated_at"=NOW() WHERE "id"=$1`,
      [node.jobRunId, status, JSON.stringify(result)],
    );
  }
  return nodes;
}

export async function routeRunWithJobs(
  runId: string,
  status: "succeeded" | "dead_lettered" | "cancelled" = "succeeded",
  result: unknown = 3,
) {
  for (let cycle = 0; cycle < 20; cycle += 1) {
    await routePipelineCycle(100);
    await settleQueuedPipelineJobs(runId, status, result);
    const run = await findPipelineRun(runId);
    if (run?.completedAt) return run;
  }
  throw new Error(`Pipeline run ${runId} did not reach a terminal state`);
}
