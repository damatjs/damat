import { beforeEach, expect, test } from "bun:test";
import { clearDurableEventDefinitions } from "../../src";
import { eventsSystemMigrations } from "../../src/durable/migrations/catalog";
import { pool, resetWorkerStorage } from "./context";
import { seedDelivery } from "./fixture";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("events catalog appends delivery retention integrity migration", () => {
  expect(eventsSystemMigrations.migrations.map(({ id }) => id)).toEqual([
    "001",
    "002",
    "003",
    "004",
    "005",
  ]);
  expect(eventsSystemMigrations.migrations.at(-1)?.order).toBeGreaterThan(600);
});

test("delivery retention cannot precede its availability", async () => {
  const item = await seedDelivery();
  await expect(
    pool.query(
      `UPDATE "_damat_event_deliveries"
     SET "retention_at"="available_at"-INTERVAL '1 millisecond'
     WHERE "id"=$1`,
      [item.id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
});
