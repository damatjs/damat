import { beforeEach, expect, test } from "bun:test";
import type { DurabilityClient } from "@damatjs/durability";
import {
  clearDurableEventDefinitions,
  publishDurableEvent,
  routeDurableEvents,
  runEventRetention,
} from "../../src";
import { durability, pool, resetWorkerStorage, uniqueEvent } from "./context";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("retention rolls back cleanup and completed audit before recording failure", async () => {
  const event = await publishDurableEvent(uniqueEvent("retention-failure"), {});
  await routeDurableEvents();
  const root = new Error("forced deletion failure");
  const actor = { id: crypto.randomUUID(), type: "system" as const };
  const client = failAfterCleanup(root);

  await expect(
    runEventRetention({
      actor,
      client,
      batchSize: 10,
      terminalBefore: new Date(Date.now() + 700_000_000),
    }),
  ).rejects.toBe(root);
  const retained = await pool.query(
    `SELECT 1 FROM "_damat_event_outbox" WHERE "id"=$1`,
    [event.id],
  );
  expect(retained.rowCount).toBe(1);
  const audit = await pool.query(
    `SELECT "status","details" FROM "_damat_maintenance_activity"
     WHERE "actor"->>'id'=$1 ORDER BY "id"`,
    [actor.id],
  );
  expect(audit.rows.map(({ status }) => status)).toEqual([
    "requested",
    "failed",
  ]);
  expect(audit.rows[1].details.message).toBe(root.message);
});

test("failed audit never masks the retention failure", async () => {
  const root = new Error("cleanup failed");
  const client = failAfterCleanup(root);
  const query = client.query.bind(client);
  client.query = (sql, params) => {
    if (params?.[3] === "failed")
      return Promise.reject(new Error("audit failed"));
    return query(sql, params);
  };
  await expect(
    runEventRetention({
      actor: { id: crypto.randomUUID(), type: "system" },
      client,
    }),
  ).rejects.toBe(root);
});

function failAfterCleanup(root: Error): DurabilityClient {
  return {
    ...durability,
    transaction: (callback) =>
      durability.transaction(async (executor) => {
        await callback(executor);
        throw root;
      }),
  };
}
