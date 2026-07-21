import { beforeEach, expect, test } from "bun:test";
import {
  configureEventWakeupPublisher,
  encodeEventConsumerScope,
} from "../../src";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);
const actor = { id: "operator-3", type: "system" as const };

test("pauses and resumes a consumer with exact audit and wake-up", async () => {
  const seeded = await seedEvent();
  const scope = encodeEventConsumerScope(seeded.name, "alpha");
  const messages: string[] = [];
  configureEventWakeupPublisher({
    publish: async (_channel, message) => {
      messages.push(message);
      return 1;
    },
  });
  const client = inspectionClient();

  await client.pauseConsumer(seeded.name, "alpha", actor, "maintenance");
  await expect(
    client.pauseConsumer(seeded.name, "alpha", actor),
  ).rejects.toHaveProperty("name", "DurableEventTransitionError");
  await client.resumeConsumer(seeded.name, "alpha", actor);

  const control = await pool.query(
    `SELECT "paused" FROM "_damat_work_controls"
     WHERE "work_kind"='event' AND "scope"=$1`,
    [scope],
  );
  const activity = await pool.query(
    `SELECT "action","actor" FROM "_damat_work_control_activity"
     WHERE "work_kind"='event' AND "scope"=$1 ORDER BY "id"`,
    [scope],
  );
  expect(control.rows[0].paused).toBe(false);
  expect(activity.rows).toEqual([
    { action: "paused", actor },
    { action: "resumed", actor },
  ]);
  expect(messages.map((value) => JSON.parse(value))).toEqual([
    expect.objectContaining({ event: seeded.name, consumer: "alpha" }),
  ]);
});
