import { expect, test } from "bun:test";
import { cronFieldMatches } from "../src/triggers/cron-field";
import { nextCronOccurrence } from "../src";
import { processDuePipelineSchedules } from "../src/triggers/schedules";
import { recordTriggerReceipt } from "../src/triggers/receipt";

test("cron fields support ranges, lists, and steps", () => {
  expect(cronFieldMatches("1,5-10/2", 7, 0, 59)).toBe(true);
  expect(cronFieldMatches("*", 3, 0, 59)).toBe(true);
  expect(cronFieldMatches("*/2", 3, 0, 59)).toBe(false);
});

test("cron validation rejects malformed fields and impossible schedules", () => {
  expect(() => nextCronOccurrence("* * * *", new Date())).toThrow("five UTC fields");
  for (const field of ["", "*/0", "1-2-3", "x", "-2", "8-2", "61"]) {
    expect(() => cronFieldMatches(field, 1, 0, 59)).toThrow("Invalid cron");
  }
  expect(() => nextCronOccurrence("0 0 31 2 *", new Date("2026-01-01Z"))).toThrow("within two years");
});

test("due schedules ignore stale rows whose trigger no longer exists", async () => {
  const executor = {
    query: async () => ({ rows: [{
      version_id: "version",
      trigger_id: "gone",
      next_at: new Date(),
      name: "pipeline",
      manifest: { start: "node", nodes: [{ id: "node", kind: "delay", delayMs: 0 }], edges: [] },
    }], rowCount: 1 }),
  };
  expect(await processDuePipelineSchedules(executor as never, 1)).toBe(1);
});

test("trigger receipts report insert and replay outcomes", async () => {
  for (const rowCount of [1, 0]) {
    const executor = { query: async () => ({ rows: [], rowCount }) };
    expect(await recordTriggerReceipt(executor as never, "v", "t", "s", "r")).toBe(rowCount === 1);
  }
});
