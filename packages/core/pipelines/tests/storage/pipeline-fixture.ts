import {
  definePipeline,
  findPipelineRun,
  routePipelineCycle,
  startPipeline,
  syncPipelineDefinitions,
  type PipelineManifest,
} from "../../src";
import { uniqueName } from "./context";

export async function startTestPipeline(
  prefix: string,
  manifest: PipelineManifest = {
    start: "first",
    nodes: [
      { id: "first", kind: "delay", delayMs: 0 },
      { id: "last", kind: "delay", delayMs: 0 },
    ],
    edges: [{ from: "first", to: "last" }],
  },
) {
  const definition = definePipeline(uniqueName(prefix), {
    version: 1,
    ...manifest,
  });
  await syncPipelineDefinitions();
  return startPipeline(
    definition.name,
    { secret: "input", visible: true },
    {
      metadata: { secret: "metadata", trace: "yes" },
    },
  );
}

export async function routeToTerminal(id: string) {
  for (let cycle = 0; cycle < 12; cycle += 1) {
    await routePipelineCycle(100);
    const run = await findPipelineRun(id);
    if (run?.completedAt) return run;
  }
  throw new Error(`Pipeline run ${id} did not complete`);
}
