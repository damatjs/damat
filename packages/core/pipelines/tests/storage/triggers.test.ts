import { beforeEach, expect, test } from "bun:test";
import { defineDurableEvent, publishDurableEvent } from "@damatjs/events";
import {
  clearPipelineRuntime,
  definePipeline,
  listPipelineRuns,
  routePipelineCycle,
  syncPipelineDefinitions,
} from "../../src";
import { ensureStorage, pool, uniqueName } from "./context";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});

test("interval, cron, and event triggers create pinned auditable runs", async () => {
  const event = uniqueName("trigger-event");
  defineDurableEvent(event);
  const definition = definePipeline(uniqueName("trigger-pipeline"), {
    version: 1,
    start: "wait",
    nodes: [{ id: "wait", kind: "delay", delayMs: 0 }],
    edges: [],
    triggers: [
      { id: "interval", kind: "interval", everyMs: 60_000, input: { $ref: "trigger.scheduledFor" } },
      { id: "cron", kind: "cron", expression: "* * * * *" },
      { id: "event", kind: "event", event },
      { id: "disabled", kind: "event", event, enabled: false },
    ],
  });
  await syncPipelineDefinitions();
  await pool.query(
    `UPDATE "_damat_pipeline_schedules" SET "next_at"=
      CASE "trigger_id" WHEN 'interval' THEN NOW()-INTERVAL '2 minutes' ELSE NOW()-INTERVAL '1 minute' END
     WHERE "version_id"=(SELECT "active_version_id" FROM "_damat_pipeline_definitions" WHERE "name"=$1)`,
    [definition.name],
  );
  await publishDurableEvent(event, { value: 3 });
  expect((await routePipelineCycle(1)).count).toBeGreaterThanOrEqual(1);
  expect((await routePipelineCycle(20)).count).toBeGreaterThanOrEqual(2);
  const runs = await listPipelineRuns({ name: definition.name, limit: 20 });
  expect(runs.length).toBeGreaterThanOrEqual(3);
  const receipts = await pool.query(
    `SELECT "trigger_id" FROM "_damat_pipeline_trigger_receipts" WHERE "version_id"=$1`,
    [runs[0]!.versionId],
  );
  expect(receipts.rows.map((row) => row.trigger_id)).toEqual(expect.arrayContaining(["interval", "cron", "event"]));
});
