import { beforeEach, expect, test } from "bun:test";
import {
  clearPipelineRuntime,
  createPipelineAuthoringClient,
  createPipelineInspectionClient,
} from "../../src";
import { durability, ensureStorage, pool } from "./context";
import { routeToTerminal, startTestPipeline } from "./pipeline-fixture";

beforeEach(async () => {
  await ensureStorage();
  clearPipelineRuntime();
});
const key = "inspection-signing-key-with-32-characters";

test("inspection lists cursor pages and filters canonical runs", async () => {
  const first = await startTestPipeline("inspect-list-a");
  clearPipelineRuntime();
  const second = await startTestPipeline("inspect-list-b");
  const client = createPipelineInspectionClient({
    cursorSigningKey: key,
    client: durability,
  });
  const page = await client.listRuns({ limit: 1 });
  expect(page.items).toHaveLength(1);
  expect(page.nextCursor).toBeString();
  expect(
    (await client.listRuns({ limit: 1, cursor: page.nextCursor })).items,
  ).toHaveLength(1);
  expect(
    (
      await client.listRuns({
        name: second.name,
        status: "running",
        limit: 999,
      })
    ).items[0]?.id,
  ).toBe(second.id);
  expect(
    (await client.listRuns({ name: first.name, limit: 0 })).items,
  ).toHaveLength(1);
});

test("detail snapshots include graph records and respect visibility", async () => {
  const started = await startTestPipeline("inspect-detail");
  const completed = await routeToTerminal(started.id);
  await pool.query(
    `INSERT INTO "_damat_pipeline_signals"
       ("id","run_id","name","payload","idempotency_key","actor","reason")
     VALUES ($1,$2,'approve',$3::jsonb,'inspection',$4::jsonb,'test')`,
    [
      crypto.randomUUID(),
      started.id,
      JSON.stringify({ secret: "signal" }),
      JSON.stringify({ id: "actor" }),
    ],
  );
  const authoring = createPipelineAuthoringClient({ client: durability });
  await authoring.saveLayout(
    completed.versionId,
    { x: 1 },
    {
      actor: { id: "editor", type: "user" },
      reason: "inspection layout",
      idempotencyKey: "layout",
    },
  );
  const full = createPipelineInspectionClient({
    cursorSigningKey: key,
    visibility: "full",
    redaction: { keys: ["secret"] },
    client: durability,
  });
  const detail = await full.getRun(started.id);
  expect(detail).toMatchObject({ id: started.id, layout: { x: 1 } });
  expect(detail?.input).toEqual({ secret: "[REDACTED]", visible: true });
  expect(detail?.nodes.length).toBe(2);
  expect(detail?.transitions.length).toBeGreaterThan(0);
  expect(detail?.signals).toHaveLength(1);
  expect(detail?.activity.length).toBeGreaterThan(0);
  expect(await full.getRun(crypto.randomUUID())).toBeNull();
  const hidden = createPipelineInspectionClient({
    cursorSigningKey: key,
    visibility: "hidden",
    client: durability,
  });
  expect((await hidden.getRun(started.id))?.input).toBeUndefined();
});

test("operational summary reports statuses and completed duration", async () => {
  const run = await startTestPipeline("inspect-summary");
  const client = createPipelineInspectionClient({
    cursorSigningKey: key,
    client: durability,
  });
  expect((await client.getSummary()).statuses.running).toBeGreaterThan(0);
  await routeToTerminal(run.id);
  expect((await client.getSummary()).averageDurationMs).toBeNumber();
});
