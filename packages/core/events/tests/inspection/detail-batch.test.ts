import { beforeEach, expect, test } from "bun:test";
import { getDurabilityClient } from "@damatjs/durability";
import {
  inspectionClient,
  pool,
  resetInspectionStorage,
  seedEvent,
} from "./fixture";

beforeEach(resetInspectionStorage);

test("detail batches attempt and log history across deliveries", async () => {
  const seeded = await seedEvent(["alpha", "beta"]);
  for (const delivery of seeded.deliveries) {
    await pool.query(
      `INSERT INTO "_damat_event_delivery_attempts"
         ("delivery_id","attempt_number","worker_id","lease_token")
       VALUES ($1,1,'worker-a',$2)`,
      [delivery.id, crypto.randomUUID()],
    );
    await pool.query(
      `INSERT INTO "_damat_event_logs"
         ("event_id","delivery_id","attempt_number","consumer","level",
          "message","sequence") VALUES ($1,$2,1,$3,'info',$3,1)`,
      [seeded.event.id, delivery.id, delivery.consumer],
    );
  }
  const base = getDurabilityClient();
  let historyQueries = 0;
  const client = inspectionClient({
    client: {
      pool: base.pool,
      query: base.query.bind(base),
      transaction: (callback: (executor: unknown) => Promise<unknown>) =>
        base.transaction((executor) =>
          callback({
            query: (sql: string, params?: unknown[]) => {
              if (
                sql.includes("_damat_event_delivery_attempts") ||
                sql.includes("_damat_event_logs")
              )
                historyQueries += 1;
              return executor.query(sql, params);
            },
          }),
        ),
    },
  });

  const detail = await client.getEvent(seeded.event.id);

  expect(historyQueries).toBe(2);
  expect(detail.deliveries.map(({ attempts }) => attempts.length)).toEqual([
    1, 1,
  ]);
  expect(detail.deliveries.map(({ logs }) => logs[0]?.message)).toEqual([
    "alpha",
    "beta",
  ]);
});
