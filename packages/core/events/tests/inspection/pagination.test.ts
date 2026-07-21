import { beforeEach, expect, test } from "bun:test";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("paginates equal-millisecond events with a signed UUID cursor", async () => {
  const first = await seedEvent();
  const second = await seedEvent();
  await pool.query(
    `UPDATE "_damat_event_outbox"
     SET "created_at"='2026-01-02T03:04:05.123456Z'
     WHERE "id"=ANY($1::uuid[])`,
    [[first.event.id, second.event.id]],
  );
  const client = inspectionClient();

  const one = await client.listEvents({ limit: 1 });
  const two = await client.listEvents({ limit: 1, cursor: one.nextCursor });

  expect(one.items).toHaveLength(1);
  expect(two.items).toHaveLength(1);
  expect(two.items[0].id).not.toBe(one.items[0].id);
  expect(one.nextCursor).toBeString();
  expect(two.nextCursor).toBeUndefined();
  await expect(
    client.listEvents({ cursor: `${one.nextCursor}x` }),
  ).rejects.toThrow("Invalid cursor");
});
