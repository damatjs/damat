import { expect, test } from "bun:test";
import { EventBus } from "../../src";
import { ensureEventStorage, pool } from "./storage-context";

test("ephemeral emit keeps direct and wildcard delivery", async () => {
  const bus = new EventBus();
  const seen: string[] = [];
  bus.on("account.created", async () => seen.push("direct"));
  bus.on("*", async (_payload, context) => seen.push(context.event));

  expect(await bus.emit("account.created", { id: "a1" })).toBe(2);
  expect(seen).toEqual(["direct", "account.created"]);
});

test("ephemeral emit only invokes its configured broadcaster", async () => {
  const bus = new EventBus();
  const published: Array<[string, unknown]> = [];
  bus.setBroadcaster(async (event, payload) => {
    published.push([event, payload]);
  });

  await bus.emit("account.updated", { id: "a1" });
  expect(published).toEqual([["account.updated", { id: "a1" }]]);
});

test("ordinary emit never writes the durable outbox", async () => {
  await ensureEventStorage();
  const before = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "_damat_event_outbox"`,
  );
  await new EventBus().emit("account.deleted", { id: "a1" });
  const after = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "_damat_event_outbox"`,
  );
  expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
});
