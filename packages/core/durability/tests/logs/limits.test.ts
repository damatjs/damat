import { expect, test } from "bun:test";
import { applyLogLimits } from "../../src";

const entries = [
  { level: "info" as const, message: "one" },
  { level: "warn" as const, message: "two" },
  { level: "error" as const, message: "three" },
];

test("log limits retain newest entries within count and bytes", () => {
  const counted = applyLogLimits(entries, { maxCount: 2, maxBytes: 1_000 });
  expect(counted.entries.map(({ message }) => message)).toEqual(["two", "three"]);
  expect(counted.droppedCount).toBe(1);
  expect(counted.truncated).toBe(true);

  const bytes = applyLogLimits(entries, {
    maxCount: 10,
    maxBytes: JSON.stringify(entries[2]).length,
  });
  expect(bytes.entries).toEqual([entries[2]]);
  expect(bytes.droppedCount).toBe(2);

  const oversizedNewest = applyLogLimits(entries, {
    maxCount: 10,
    maxBytes: 2,
  });
  expect(oversizedNewest.entries).toEqual([]);

  const gapped = [entries[0]!, { level: "info" as const, message: "x".repeat(200) }, entries[2]!];
  expect(applyLogLimits(gapped, { maxCount: 10, maxBytes: 100 }).entries)
    .toEqual([entries[2]]);
});

test("log limits require finite nonnegative integers", () => {
  for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() =>
      applyLogLimits(entries, { maxCount: invalid, maxBytes: 100 }),
    ).toThrow("finite nonnegative integers");
    expect(() =>
      applyLogLimits(entries, { maxCount: 10, maxBytes: invalid }),
    ).toThrow("finite nonnegative integers");
  }
});
