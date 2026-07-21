import { describe, expect, test } from "bun:test";
import {
  createJobSchedule,
  nextScheduleOccurrence,
  validateJobScheduleInput,
} from "../../src/schedules";
import { reconcileJobSchedules } from "../../src/worker/reconcileSchedules";

describe("job schedule validation", () => {
  test("accepts one-time and interval schedules", () => {
    const at = new Date("2030-01-01T00:00:00Z");
    expect(validateJobScheduleInput({ kind: "once", at })).toEqual({
      kind: "once",
      at,
    });
    expect(
      validateJobScheduleInput({ kind: "interval", everyMs: 1_000 }),
    ).toEqual({ kind: "interval", everyMs: 1_000 });
  });

  test("rejects cron and invalid interval values", () => {
    expect(() =>
      validateJobScheduleInput({
        kind: "cron",
        expression: "* * * * *",
      } as never),
    ).toThrow("cron schedules are not supported");
    expect(() =>
      validateJobScheduleInput({ kind: "interval", everyMs: 0 }),
    ).toThrow("everyMs must be a positive safe integer");
  });

  test("calculates the next occurrence without drift", () => {
    const start = new Date("2030-01-01T00:00:00Z");
    const after = new Date("2030-01-01T00:00:03.500Z");
    expect(
      nextScheduleOccurrence(
        { kind: "interval", everyMs: 1_000, startsAt: start },
        after,
      ),
    ).toEqual(new Date("2030-01-01T00:00:04Z"));
    expect(
      nextScheduleOccurrence({ kind: "once", at: start }, start),
    ).toBeUndefined();
  });

  test("rejects blank deduplication keys", async () => {
    await expect(
      createJobSchedule({
        name: "blank-dedup",
        jobName: "job",
        payload: {},
        schedule: { kind: "once", at: new Date() },
        deduplication: { key: "   ", ttlMs: 1_000 },
      }),
    ).rejects.toThrow("deduplication key must not be blank");
  });

  test("rejects invalid dates and deduplication TTL", async () => {
    expect(() =>
      validateJobScheduleInput({ kind: "once", at: new Date("invalid") }),
    ).toThrow("at must be a valid Date");
    expect(() =>
      validateJobScheduleInput({
        kind: "interval",
        everyMs: 1,
        startsAt: new Date("invalid"),
      }),
    ).toThrow("startsAt must be a valid Date");
    await expect(
      createJobSchedule({
        name: "invalid-ttl",
        jobName: "job",
        payload: {},
        schedule: { kind: "once", at: new Date() },
        deduplication: { key: "key", ttlMs: -1 },
      }),
    ).rejects.toThrow("ttlMs must be a nonnegative safe integer");
  });

  test("rejects invalid reconciliation limits before querying", async () => {
    for (const limit of [0, Number.NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(reconcileJobSchedules({ limit })).rejects.toThrow(
        "positive safe integer",
      );
    }
  });
});
