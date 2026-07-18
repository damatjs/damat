import { afterEach, expect, mock, test } from "bun:test";
import { clearDurabilityClient, setDurabilityClient } from "@damatjs/framework";
import {
  inspectByCorrelationId,
  referenceDurabilityClient,
} from "@/examples/inspectWork";

afterEach(clearDurabilityClient);

test("inspection client delegates to the configured durability client", async () => {
  const pool = { name: "pool" };
  const query = mock(async () => ({ rows: [{ ok: true }] }));
  const transaction = mock(async (run: (value: object) => unknown) =>
    run(pool),
  );
  setDurabilityClient({ pool, query, transaction } as never);

  expect(referenceDurabilityClient.pool).toBe(pool);
  expect(await referenceDurabilityClient.query("SELECT 1", [])).toEqual({
    rows: [{ ok: true }],
  });
  expect(
    await referenceDurabilityClient.transaction(async (value) => value),
  ).toBe(pool);
});

test("correlation inspection queries jobs and events together", async () => {
  const listRuns = mock(async () => ({ items: ["job"] }));
  const listEvents = mock(async () => ({ items: ["event"] }));
  const create = mock(() => ({ jobs: { listRuns }, events: { listEvents } }));

  expect(
    await inspectByCorrelationId("corr_1", "secret", create as never),
  ).toEqual({
    jobs: { items: ["job"] },
    events: { items: ["event"] },
  });
  expect(create).toHaveBeenCalledWith("secret");
  expect(listRuns).toHaveBeenCalledWith({
    correlationIds: ["corr_1"],
    limit: 25,
  });
  expect(listEvents).toHaveBeenCalledWith({
    correlationId: "corr_1",
    limit: 25,
  });
});
