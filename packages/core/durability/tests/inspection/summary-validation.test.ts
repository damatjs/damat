import { expect, test } from "bun:test";
import { validateWorkSummaryFilter } from "../../src";

const from = new Date("2026-07-17T00:00:00.000Z");

test("summary filters return a bounded aligned bucket count", () => {
  expect(
    validateWorkSummaryFilter({
      from,
      to: new Date("2026-07-17T00:14:59.999Z"),
      intervalMs: 300_000,
    }),
  ).toEqual({ bucketCount: 3 });
});

test("summary filters reject invalid ranges and bucket sizes", () => {
  expect(() =>
    validateWorkSummaryFilter({ from, to: new Date("invalid"), intervalMs: 1 }),
  ).toThrow(/valid dates/);
  expect(() =>
    validateWorkSummaryFilter({ from, to: from, intervalMs: 1.5 }),
  ).toThrow(/safe integer/);
  expect(() =>
    validateWorkSummaryFilter({ from, to: new Date(0), intervalMs: 1 }),
  ).toThrow(/range/);
});

test("summary filters allow exactly one thousand half-open buckets", () => {
  expect(
    validateWorkSummaryFilter({
      from,
      to: new Date(from.getTime() + 1_000),
      intervalMs: 1,
    }),
  ).toEqual({ bucketCount: 1_000 });
  expect(() =>
    validateWorkSummaryFilter({
      from,
      to: new Date(from.getTime() + 1_001),
      intervalMs: 1,
    }),
  ).toThrow(/1,000/);
  expect(validateWorkSummaryFilter({ from, to: from, intervalMs: 1 })).toEqual({
    bucketCount: 0,
  });
});

test("summary filters validate optional clock and stale threshold", () => {
  expect(() =>
    validateWorkSummaryFilter({
      from,
      to: from,
      intervalMs: 1,
      now: new Date("invalid"),
    }),
  ).toThrow(/valid dates/);
  expect(() =>
    validateWorkSummaryFilter({
      from,
      to: from,
      intervalMs: 1,
      staleAfterMs: 0,
    }),
  ).toThrow(/staleAfterMs/);
});
