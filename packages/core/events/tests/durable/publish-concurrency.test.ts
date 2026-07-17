import { beforeAll, expect, test } from "bun:test";
import { listDurableEventActivity, publishDurableEvent } from "../../src";
import { ensureEventStorage, pool, uniqueEvent } from "./storage-context";

beforeAll(ensureEventStorage);

test("concurrent idempotent publishes create one event and activity", async () => {
  const name = uniqueEvent("concurrent");
  const options = { idempotencyKey: crypto.randomUUID() };
  const [left, right] = await Promise.all([
    publishDurableEvent(name, { side: "left" }, options),
    publishDurableEvent(name, { side: "right" }, options),
  ]);
  expect(right.id).toBe(left.id);
  expect(await listDurableEventActivity(left.id)).toHaveLength(1);
  const count = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "_damat_event_outbox"
     WHERE "name" = $1 AND "idempotency_key" = $2`,
    [name, options.idempotencyKey],
  );
  expect(count.rows[0]!.count).toBe("1");
});
