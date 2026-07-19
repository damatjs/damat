import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  findActivePipelineVersion,
  findNodeExecution,
  findPipelineDefinitionRow,
  listPipelineNodeExecutions,
  listPipelineRuns,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { durability, ensureStorage, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});

test("repository readers expose definitions, versions, runs, and nodes", async () => {
  const definition = definePipeline(uniqueName("repository"), {
    version: 1,
    start: "start",
    edges: [],
    nodes: [{ id: "start", kind: "delay", delayMs: 0 }],
  });
  await syncPipelineDefinitions();
  const run = await startPipeline(definition.name, {});
  const nodes = await listPipelineNodeExecutions(run.id);
  expect(nodes).toHaveLength(1);
  expect(await findNodeExecution(nodes[0]!.id)).toEqual(nodes[0]);
  expect(await findNodeExecution(crypto.randomUUID())).toBeUndefined();
  const runs = await listPipelineRuns({
    name: definition.name,
    status: "running",
    limit: 500,
  });
  expect(runs.map((value) => value.id)).toContain(run.id);
  expect(await listPipelineRuns({ limit: 0 })).toBeArray();
  await durability.transaction(async (executor) => {
    const row = await findPipelineDefinitionRow(executor, definition.name);
    expect(row?.name).toBe(definition.name);
    expect(
      await findPipelineDefinitionRow(executor, uniqueName("missing")),
    ).toBeUndefined();
    expect(
      (await findActivePipelineVersion(executor, definition.name))?.id,
    ).toBe(run.versionId);
    expect(
      (
        await findActivePipelineVersion(
          executor,
          definition.name,
          run.versionId,
        )
      )?.id,
    ).toBe(run.versionId);
  });
});
