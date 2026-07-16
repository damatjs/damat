import { describe, expect, test } from "bun:test";
import { compareCursorPositions, decodeCursor, encodeCursor } from "../../src";

const position = {
  sortTimestamp: "2026-07-16T10:00:00.000Z",
  id: "9ccbb858-1055-440d-99bd-8babbf1fb891",
};

describe("inspection cursor", () => {
  test("round trips a stable timestamp and UUID position", () => {
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
    expect(encodeCursor(position)).toBe(encodeCursor(position));
  });

  test("rejects tampering and unknown versions", () => {
    const cursor = encodeCursor(position);
    expect(() => decodeCursor(`${cursor}x`)).toThrow("Invalid cursor");
    const changed = JSON.parse(Buffer.from(cursor, "base64url").toString());
    changed.t = "2026-07-17T10:00:00.000Z";
    const tampered = Buffer.from(JSON.stringify(changed)).toString("base64url");
    expect(() => decodeCursor(tampered)).toThrow("Invalid cursor");
    const unknown = Buffer.from(
      JSON.stringify({ v: 2, t: position.sortTimestamp, i: position.id }),
    ).toString("base64url");
    expect(() => decodeCursor(unknown)).toThrow("Unsupported cursor version");
  });

  test("orders equal timestamps by UUID for stable pagination", () => {
    const later = { ...position, id: "accbb858-1055-440d-99bd-8babbf1fb891" };
    expect(compareCursorPositions(position, later)).toBeLessThan(0);
    expect(compareCursorPositions(later, position)).toBeGreaterThan(0);
  });
});
