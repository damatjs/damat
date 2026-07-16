import { expect, test } from "bun:test";
import { createTimeBuckets, getTimeBucketStart } from "../../src";

test("time buckets align timestamps and include every requested interval", () => {
  expect(getTimeBucketStart(new Date("2026-07-16T10:07:30Z"), 300_000)).toEqual(
    new Date("2026-07-16T10:05:00Z"),
  );
  expect(
    createTimeBuckets({
      from: new Date("2026-07-16T10:02:00Z"),
      to: new Date("2026-07-16T10:12:00Z"),
      intervalMs: 300_000,
    }),
  ).toEqual([
    new Date("2026-07-16T10:00:00Z"),
    new Date("2026-07-16T10:05:00Z"),
    new Date("2026-07-16T10:10:00Z"),
  ]);
});
