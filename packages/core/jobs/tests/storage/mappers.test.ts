import { expect, test } from "bun:test";
import { mapJobActivity, mapJobLog } from "../../src/repositories/map-records";
import { mapJobRun } from "../../src/repositories/map-run";
import { mapJobSchedule } from "../../src/repositories/map-schedule";
import { activityRow, logRow, runRow, scheduleRow } from "./mapper-fixtures";

test("mappers preserve empty optional strings", () => {
  expect(mapJobRun(runRow())).toMatchObject({
    correlationId: "",
    deduplicationKey: "",
  });
  expect(mapJobActivity(activityRow())).toMatchObject({
    workerId: "",
    leaseToken: "",
    reason: "",
  });
  expect(mapJobLog(logRow())).toMatchObject({
    workerId: "",
    correlationId: "",
    traceId: "",
  });
  expect(mapJobSchedule(scheduleRow())).toMatchObject({
    deduplicationKey: "",
  });
});

test("bigint millisecond values map to safe numbers", () => {
  expect(
    mapJobRun(runRow({ backoff_ms: "2592000000" as never })).backoffMs,
  ).toBe(2_592_000_000);
  expect(
    mapJobActivity(activityRow({ duration_ms: "2592000000" as never }))
      .durationMs,
  ).toBe(2_592_000_000);
});

test("unsafe bigint millisecond values are rejected", () => {
  expect(() =>
    mapJobRun(runRow({ backoff_ms: "9007199254740992" as never })),
  ).toThrow(/safe integer/i);
  expect(() =>
    mapJobRun(runRow({ backoff_ms: "not-an-integer" as never })),
  ).toThrow(/safe integer/i);
});

test("schedule mapper preserves every optional policy field", () => {
  const now = new Date();
  expect(
    mapJobSchedule(
      scheduleRow({
        run_at: now,
        interval_ms: "60000",
        next_occurrence_at: now,
        last_occurrence_at: now,
        deduplication_ttl_ms: "5000",
      }),
    ),
  ).toMatchObject({
    runAt: now,
    intervalMs: 60_000,
    nextOccurrenceAt: now,
    lastOccurrenceAt: now,
    deduplicationTtlMs: 5_000,
  });
});

test("run mapper exposes its scheduled occurrence identity", () => {
  const scheduledFor = new Date();
  const scheduleId = crypto.randomUUID();
  expect(
    mapJobRun(runRow({ schedule_id: scheduleId, scheduled_for: scheduledFor })),
  ).toMatchObject({
    scheduleId,
    scheduledFor,
  });
});
