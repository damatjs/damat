import { beforeAll, describe, expect, test } from "bun:test";
import { ensureStorage, insertRun, inspection, pool } from "./context";

beforeAll(ensureStorage);

describe("job inspection list", () => {
  test("derives views and keeps recovery orthogonal", async () => {
    const queued = await insertRun({ status: "queued" });
    const recovered = await insertRun({ status: "succeeded" });
    await pool.query(
      `INSERT INTO "_damat_job_activity" ("run_id","type")
       VALUES ($1,'lease_recovered')`,
      [recovered.id],
    );
    const client = inspection();
    const upcoming = await client.listRuns({
      queues: [queued.queue],
      views: ["upcoming"],
    });
    const recoveredPage = await client.listRuns({
      queues: [recovered.queue],
      recovered: true,
    });
    expect(upcoming.items[0]).toMatchObject({
      id: queued.id,
      view: "upcoming",
      recovered: false,
      metadata: { source: "inspection" },
    });
    expect(upcoming.items[0]).not.toHaveProperty("payload");
    expect(recoveredPage.items[0]).toMatchObject({
      id: recovered.id,
      view: "completed",
      recovered: true,
    });
  });

  test("paginates equal millisecond timestamps by UUID", async () => {
    const createdAt = new Date("2031-01-01T00:00:00.123Z");
    const queue = `cursor-${crypto.randomUUID()}`;
    await insertRun({ queue, createdAt });
    await insertRun({ queue, createdAt });
    await insertRun({ queue, createdAt });
    const client = inspection();
    const first = await client.listRuns({ queues: [queue], limit: 2 });
    const second = await client.listRuns({
      queues: [queue],
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(1);
    expect(
      new Set([...first.items, ...second.items].map(({ id }) => id)).size,
    ).toBe(3);
  });
});
