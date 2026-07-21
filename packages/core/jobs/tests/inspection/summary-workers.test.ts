import { expect, test } from "bun:test";
import type { DurabilityExecutor } from "@damatjs/durability";
import { readJobWorkerSummary } from "../../src/inspection/summary/workers";

test("worker capacity includes active workers only", async () => {
  const now = new Date("2040-01-01T00:01:00Z");
  const base = {
    capabilities: ["jobs:default"],
    hostname: "localhost",
    process_id: 1,
    application: { token: "application" },
    deployment: { token: "deployment" },
    started_at: new Date("2040-01-01T00:00:00Z"),
  };
  const rows = [
    worker("active", base, now, 10, 4),
    worker("stale", base, new Date(now.getTime() - 60_000), 20, 8),
    worker("stopping", base, now, 30, 12, { stopping_at: now }),
    worker("stopped", base, now, 40, 16, { stopped_at: now }),
  ];
  const executor = {
    query: async () => ({ rows, rowCount: rows.length }),
  } as unknown as DurabilityExecutor;
  const summary = await readJobWorkerSummary(executor, now, 30_000, {
    visibility: "metadata",
    redaction: { keys: ["token"] },
  });
  expect(summary).toMatchObject({
    active: 1,
    stale: 1,
    concurrency: 10,
    inFlight: 4,
    oldestHeartbeatMs: 60_000,
  });
  expect(summary.records.map(({ state }) => state)).toEqual([
    "active",
    "stale",
  ]);
  expect(summary.records[0]).toMatchObject({
    capabilities: ["jobs:default"],
    application: { token: "[REDACTED]" },
    deployment: { token: "[REDACTED]" },
    concurrency: 10,
    inFlight: 4,
    heartbeatAgeMs: 0,
  });
  const hidden = await readJobWorkerSummary(executor, now, 30_000, {
    visibility: "hidden",
    redaction: {},
  });
  expect(hidden.records[0]).not.toHaveProperty("application");
  expect(hidden.records[0]).not.toHaveProperty("deployment");
});

function worker(
  id: string,
  base: Record<string, unknown>,
  heartbeat: Date,
  concurrency: number,
  inFlight: number,
  state: Record<string, Date> = {},
) {
  return {
    ...base,
    id,
    last_heartbeat_at: heartbeat,
    stopping_at: null,
    stopped_at: null,
    concurrency,
    in_flight: inFlight,
    ...state,
  };
}
