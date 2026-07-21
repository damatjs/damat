import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import {
  compareCursorPositions,
  decodeCursor,
  encodeCursor,
  validateCursorSigningKey,
} from "../../src";

const key = "cursor-test-key";
const wrongKey = "wrong-cursor-key";
const position = {
  sortTimestamp: "2026-07-16T10:00:00.000Z",
  id: "9ccbb858-1055-440d-99bd-8babbf1fb891",
};

function sign(payload: string, signingKey = key): string {
  return createHmac("sha256", signingKey).update(payload).digest("base64url");
}

function signedData(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

describe("inspection cursor", () => {
  test("rejects empty signing keys before cursor use", () => {
    expect(() => validateCursorSigningKey("")).toThrow("cannot be empty");
    expect(() => validateCursorSigningKey(new Uint8Array())).toThrow(
      "cannot be empty",
    );
    expect(() => validateCursorSigningKey(new Uint8Array([1]))).not.toThrow();
  });

  test("round trips stable signed timestamp and UUID state", () => {
    const cursor = encodeCursor(position, key);
    expect(decodeCursor(cursor, key)).toEqual(position);
    expect(cursor).toBe(encodeCursor(position, key));
  });

  test("rejects altered payloads, signatures, and wrong keys", () => {
    const cursor = encodeCursor(position, key);
    const [payload, signature] = cursor.split(".");
    const data = JSON.parse(Buffer.from(payload!, "base64url").toString());
    data.t = "2026-07-17T10:00:00.000Z";
    const altered = Buffer.from(JSON.stringify(data)).toString("base64url");
    expect(() => decodeCursor(`${altered}.${signature}`, key)).toThrow(
      "Invalid cursor signature",
    );
    expect(() => decodeCursor(`${payload}.${signature}x`, key)).toThrow();
    expect(() => decodeCursor(cursor, wrongKey)).toThrow(
      "Invalid cursor signature",
    );
  });

  test("rejects unknown versions and noncanonical positions", () => {
    expect(() =>
      decodeCursor(
        signedData({ v: 2, t: position.sortTimestamp, i: position.id }),
        key,
      ),
    ).toThrow("Unsupported cursor version");
    expect(() =>
      encodeCursor({ ...position, sortTimestamp: "July 16, 2026" }, key),
    ).toThrow("canonical ISO timestamp");
    expect(() =>
      encodeCursor({ ...position, id: "-".repeat(36) }, key),
    ).toThrow("canonical UUID");
    expect(() =>
      encodeCursor({ ...position, id: position.id.toUpperCase() }, key),
    ).toThrow("canonical UUID");
  });

  test("orders equal timestamps by UUID for stable pagination", () => {
    const later = { ...position, id: "accbb858-1055-440d-99bd-8babbf1fb891" };
    expect(compareCursorPositions(position, later)).toBeLessThan(0);
    expect(compareCursorPositions(later, position)).toBeGreaterThan(0);
  });
});
