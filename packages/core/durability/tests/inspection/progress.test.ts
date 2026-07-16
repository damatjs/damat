import { expect, test } from "bun:test";
import { shouldRecordProgressActivity } from "../../src";

test("progress records changed samples by interval and always records terminal", () => {
  const base = {
    changed: true,
    lastRecordedAt: new Date("2026-07-16T10:00:00Z"),
    minimumIntervalMs: 1_000,
  };
  expect(
    shouldRecordProgressActivity({
      ...base,
      now: new Date("2026-07-16T10:00:00.500Z"),
    }),
  ).toBe(false);
  expect(
    shouldRecordProgressActivity({
      ...base,
      now: new Date("2026-07-16T10:00:01Z"),
    }),
  ).toBe(true);
  expect(
    shouldRecordProgressActivity({ ...base, changed: false, terminal: true }),
  ).toBe(true);
});
