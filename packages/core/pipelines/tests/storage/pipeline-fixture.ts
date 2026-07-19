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

export async function routeUntil<T>(
  read: () => Promise<T>,
  reached: (value: T) => boolean,
  description: string,
  maxCycles = 32,
) {
  let value = await read();
  for (let cycle = 0; cycle < maxCycles && !reached(value); cycle += 1) {
    await routePipelineCycle(1_000);
    value = await read();
  }
  if (!reached(value))
    throw new Error(
      `Router did not reach ${description} in ${maxCycles} cycles`,
    );
  return value;
}

export async function routeToTerminal(id: string) {
  const run = await routeUntil(
    () => findPipelineRun(id),
    (value) => Boolean(value?.completedAt),
    `a terminal state for pipeline run ${id}`,
  );
  if (!run) throw new Error(`Pipeline run ${id} disappeared while routing`);
  return run;
}
