import { afterEach, expect, test } from "bun:test";
import {
  claimAccelerationSignals,
  clearDurabilityClient,
  setDurabilityClient,
  type DurabilityClient,
  type DurabilityExecutor,
} from "../../src";

const availableAt = new Date("2026-01-01T00:00:00.000Z");

function signalRow(revision: string) {
  return {
    id: crypto.randomUUID(),
    revision,
    topic: "damat:jobs:wakeup",
    resource_kind: "job",
    resource_id: null,
    scope: null,
    payload: {},
    available_at: availableAt,
    claim_token: crypto.randomUUID(),
  };
}

afterEach(clearDurabilityClient);

test("claimed acceleration signals are revision ordered", async () => {
  const params: unknown[][] = [];
  const rows = [signalRow("1"), signalRow("3"), signalRow("2"), signalRow("1")];
  const executor = {
    query: async (_sql: string, values?: unknown[]) => {
      params.push(values ?? []);
      return { rows, rowCount: rows.length };
    },
  } as unknown as DurabilityExecutor;
  setDurabilityClient({
    pool: {} as DurabilityClient["pool"],
    query: executor.query,
    transaction: (callback) => callback(executor),
  });

  const claimed = await claimAccelerationSignals(4, 1_000, []);

  expect(claimed.map(({ revision }) => revision)).toEqual(["1", "1", "2", "3"]);
  expect(claimed.every(({ resourceId, scope }) => !resourceId && !scope)).toBeTrue();
  expect(params[0]).toEqual([4, expect.any(String), 1_000, null]);
});
