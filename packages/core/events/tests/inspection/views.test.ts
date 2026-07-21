import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("filters every derived operational view", async () => {
  const upcoming = await seedEvent();
  const delayedRetry = await seedEvent();
  const retrying = await seedEvent();
  const failed = await seedEvent();
  const completed = await seedEvent();
  await setState(upcoming.event.id, "pending", "1 hour");
  await setState(delayedRetry.event.id, "retry_wait", "1 hour");
  await setState(retrying.event.id, "retry_wait");
  await setState(failed.event.id, "dead_lettered");
  await setState(completed.event.id, "succeeded");
  const client = inspectionClient();
  const cases = [
    ["upcoming", upcoming.event.id],
    ["retrying", retrying.event.id],
    ["failed", failed.event.id],
    ["completed", completed.event.id],
  ];
  for (const [view, id] of cases) {
    const page = await client.listEvents({ views: [view] });
    expect(page.items.map((item: { id: string }) => item.id)).toContain(id);
  }
  const all = await client.listEvents();
  const item = (id: string) =>
    all.items.find((value: { id: string }) => value.id === id);
  expect(item(upcoming.event.id)?.views).toEqual(["upcoming"]);
  expect(item(delayedRetry.event.id)?.views).toEqual(["upcoming", "retrying"]);
});

async function setState(eventId: string, status: string, future?: string) {
  await pool.query(
    `UPDATE "_damat_event_deliveries" SET "status"=$2,
       "available_at"=CASE WHEN $3::text IS NULL THEN "available_at"
         ELSE NOW()+($3::text)::interval END,
       "completed_at"=CASE WHEN $2 IN ('succeeded','dead_lettered')
         THEN NOW() ELSE NULL END WHERE "event_id"=$1`,
    [eventId, status, future ?? null],
  );
}
