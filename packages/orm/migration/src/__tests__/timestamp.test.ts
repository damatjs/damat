import { describe, it, expect } from "bun:test";
import { generateTimestamp } from "../utils/timestamp";

/**
 * `generateTimestamp` is pure: it formats a Date into a 14-char
 * `YYYYMMDDHHMMSS` string derived from the UTC ISO representation.
 */
describe("generateTimestamp", () => {
  it("formats a UTC date into YYYYMMDDHHMMSS", () => {
    expect(generateTimestamp(new Date("2026-03-16T10:30:45.123Z"))).toBe(
      "20260316103045",
    );
  });

  it("zero-pads single-digit month/day/hour/minute/second", () => {
    expect(generateTimestamp(new Date("2026-12-09T05:07:09.000Z"))).toBe(
      "20261209050709",
    );
  });

  it("drops milliseconds entirely", () => {
    // .999 ms must not bleed into the output
    expect(generateTimestamp(new Date("2026-01-01T00:00:00.999Z"))).toBe(
      "20260101000000",
    );
  });

  it("always produces exactly 14 numeric characters", () => {
    const ts = generateTimestamp(new Date("2030-11-30T23:59:59.000Z"));
    expect(ts).toHaveLength(14);
    expect(ts).toMatch(/^\d{14}$/);
  });

  it("uses UTC, not local time (input carries explicit Z)", () => {
    // toISOString is always UTC; a +02:00 input is normalised back to UTC.
    expect(generateTimestamp(new Date("2026-06-16T12:00:00+02:00"))).toBe(
      "20260616100000",
    );
  });

  it("is deterministic for the same instant", () => {
    const d = new Date("2026-06-16T08:15:30.000Z");
    expect(generateTimestamp(d)).toBe(generateTimestamp(new Date(d.getTime())));
  });

  it("handles the unix epoch", () => {
    expect(generateTimestamp(new Date(0))).toBe("19700101000000");
  });

  it("orders chronologically as a string (sortable)", () => {
    const earlier = generateTimestamp(new Date("2026-03-16T10:30:00.000Z"));
    const later = generateTimestamp(new Date("2026-03-16T10:31:00.000Z"));
    expect(earlier < later).toBe(true);
  });
});
