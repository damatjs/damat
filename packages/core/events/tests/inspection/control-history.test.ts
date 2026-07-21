import { beforeEach, expect, test } from "bun:test";
import { encodeEventConsumerScope } from "../../src";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("detail caps control history and reports truncation", async () => {
  const seeded = await seedEvent();
  const scope = encodeEventConsumerScope(seeded.name, "alpha");
  await pool.query(
    `INSERT INTO "_damat_work_control_activity"
       ("work_kind","scope","action","actor")
     SELECT 'event',$1,CASE WHEN value % 2 = 0 THEN 'paused' ELSE 'resumed' END,
       '{"id":"operator","type":"user"}'::jsonb
     FROM generate_series(1,501) value`,
    [scope],
  );

  const detail = await inspectionClient().getEvent(seeded.event.id);

  expect(detail.controls).toHaveLength(500);
  expect(detail.controlHistoryTruncated).toBe(true);
});

test("detail keeps control history globally ordered across consumers", async () => {
  const seeded = await seedEvent(["alpha", "beta"]);
  const alpha = encodeEventConsumerScope(seeded.name, "alpha");
  const beta = encodeEventConsumerScope(seeded.name, "beta");
  await pool.query(
    `INSERT INTO "_damat_work_control_activity"
       ("work_kind","scope","action","actor") VALUES
       ('event',$1,'paused','{"id":"a","type":"user"}'),
       ('event',$2,'paused','{"id":"b","type":"user"}'),
       ('event',$1,'resumed','{"id":"a","type":"user"}'),
       ('event',$2,'resumed','{"id":"b","type":"user"}')`,
    [alpha, beta],
  );

  const detail = await inspectionClient().getEvent(seeded.event.id);

  expect(detail.controls.map(({ scope }: { scope: string }) => scope)).toEqual([
    alpha,
    beta,
    alpha,
    beta,
  ]);
  expect(detail.controlHistoryTruncated).toBe(false);
});
