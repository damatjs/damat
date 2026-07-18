import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  definePipeline,
  findPipelineRun,
  startPipeline,
  syncPipelineDefinitions,
} from "../../src";
import { durability, ensureStorage, pool, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});

function defineSingle(name: string) {
  return definePipeline(name, {
    version: 1,
    start: "start",
    edges: [],
    nodes: [{ id: "start", kind: "delay", delayMs: 0 }],
  });
}

test("start pins a version and persists its ready signal atomically", async () => {
  const definition = defineSingle(uniqueName("pipeline-start"));
  await syncPipelineDefinitions();
  const run = await startPipeline(
    definition.name,
    { value: 1 },
    {
      idempotencyKey: "same-start",
      actor: { id: "test", type: "system" },
    },
  );
  const beforeReplay = await pool.query(
    `SELECT 1 FROM "_damat_acceleration_outbox"
     WHERE "resource_kind"='pipeline' AND "resource_id"=$1`,
    [run.id],
  );
  const replay = await startPipeline(
    definition.name,
    { value: 1 },
    {
      idempotencyKey: "same-start",
      actor: { id: "test", type: "system" },
    },
  );
  expect(replay.id).toBe(run.id);
  expect((await findPipelineRun(run.id))?.versionId).toBe(run.versionId);
  const signals = await pool.query(
    `SELECT 1 FROM "_damat_acceleration_outbox"
     WHERE "resource_kind"='pipeline' AND "resource_id"=$1`,
    [run.id],
  );
  expect(signals.rowCount).toBe(beforeReplay.rowCount);
});

test("caller transaction rollback removes the run, node, and wake-up", async () => {
  const definition = defineSingle(uniqueName("pipeline-rollback"));
  await syncPipelineDefinitions();
  let runId = "";
  await expect(
    durability.transaction(async (executor) => {
      runId = (await startPipeline(definition.name, {}, { executor })).id;
      throw new Error("rollback pipeline");
    }),
  ).rejects.toThrow("rollback pipeline");
  expect(await findPipelineRun(runId)).toBeUndefined();
  const signals = await pool.query(
    `SELECT 1 FROM "_damat_acceleration_outbox" WHERE "resource_id"=$1`,
    [runId],
  );
  expect(signals.rowCount).toBe(0);
});
