import { beforeEach, expect, test } from "bun:test";
import type { DurabilityClient, DurabilityExecutor } from "@damatjs/durability";
import {
  clearDurableEventDefinitions,
  defineDurableEventHandler,
  publishDurableEvent,
  routeDurableEvents,
} from "../../src";
import { durability, pool, resetWorkerStorage, uniqueEvent } from "./context";

beforeEach(async () => {
  await resetWorkerStorage();
  clearDurableEventDefinitions();
});

test("routing activity failure rolls back fan-out and routed_at", async () => {
  const name = uniqueEvent("routing-rollback");
  defineDurableEventHandler(name, "consumer", async () => {});
  const event = await publishDurableEvent(name, {});
  const root = new Error("forced routing activity failure");
  const client = failingActivityClient(root);

  await expect(routeDurableEvents({ client })).rejects.toBe(root);
  const outbox = await pool.query(
    `SELECT "routed_at" FROM "_damat_event_outbox" WHERE "id"=$1`,
    [event.id],
  );
  const deliveries = await pool.query(
    `SELECT 1 FROM "_damat_event_deliveries" WHERE "event_id"=$1`,
    [event.id],
  );
  expect(outbox.rows[0].routed_at).toBeNull();
  expect(deliveries.rowCount).toBe(0);
});

function failingActivityClient(root: Error): DurabilityClient {
  return {
    ...durability,
    transaction: (callback) =>
      durability.transaction((executor) =>
        callback(failingActivityExecutor(executor, root)),
      ),
  };
}

function failingActivityExecutor(
  executor: DurabilityExecutor,
  root: Error,
): DurabilityExecutor {
  return {
    query: (sql, params) => {
      if (sql.includes(`INSERT INTO "_damat_event_activity"`)) throw root;
      return executor.query(sql, params);
    },
  };
}
