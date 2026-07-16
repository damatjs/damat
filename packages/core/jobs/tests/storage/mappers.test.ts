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
});
