import { beforeAll, expect, test } from "bun:test";
import { getDurableEvent, publishDurableEvent } from "../../src";
import {
  durability,
  ensureEventStorage,
  pool,
  uniqueEvent,
} from "./storage-context";

beforeAll(async () => {
  await ensureEventStorage();
  await pool.query(`CREATE TABLE IF NOT EXISTS "_damat_event_test_domain" (
    "id" UUID PRIMARY KEY, "value" TEXT NOT NULL)`);
});

test("domain write and outbox publish commit together", async () => {
  const domainId = crypto.randomUUID();
  const event = await durability.transaction(async (executor) => {
    await executor.query(
      `INSERT INTO "_damat_event_test_domain" ("id","value") VALUES ($1,$2)`,
      [domainId, "committed"],
    );
    return publishDurableEvent(
      uniqueEvent("domain.changed"),
      { domainId },
      {
        executor,
      },
    );
  });
  const domain = await pool.query(
    `SELECT 1 FROM "_damat_event_test_domain" WHERE "id" = $1`,
    [domainId],
  );
  expect(domain.rowCount).toBe(1);
  expect(await getDurableEvent(event.id)).toBeDefined();
});

test("domain write and outbox publish roll back together", async () => {
  const domainId = crypto.randomUUID();
  let eventId = "";
  await expect(
    durability.transaction(async (executor) => {
      await executor.query(
        `INSERT INTO "_damat_event_test_domain" ("id","value") VALUES ($1,$2)`,
        [domainId, "rolled-back"],
      );
      eventId = (
        await publishDurableEvent(
          uniqueEvent("domain.rollback"),
          {},
          {
            executor,
          },
        )
      ).id;
      throw new Error("rollback domain and event");
    }),
  ).rejects.toThrow("rollback domain and event");
  const domain = await pool.query(
    `SELECT 1 FROM "_damat_event_test_domain" WHERE "id" = $1`,
    [domainId],
  );
  expect(domain.rowCount).toBe(0);
  expect(await getDurableEvent(eventId)).toBeUndefined();
});
