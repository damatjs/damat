import { createHmac } from "node:crypto";
import { expect, test } from "bun:test";
import { createTimeBuckets, decodeCursor, getTimeBucketStart } from "../../src";

const key = "edge-cursor-key";

test("cursor parsing rejects malformed and noncanonical payloads", () => {
  expect(() => decodeCursor("one-part", key)).toThrow("Invalid cursor");
  const payload = Buffer.from(
    '{ "v":1,"t":"2026-07-16T10:00:00.000Z","i":"9ccbb858-1055-440d-99bd-8babbf1fb891"}',
  ).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");
  expect(() => decodeCursor(`${payload}.${signature}`, key)).toThrow(
    "Invalid cursor",
  );
});

test("time buckets reject invalid intervals and reversed ranges", () => {
  expect(() => getTimeBucketStart(new Date(), 0)).toThrow(
    "interval must be positive",
  );
  expect(() =>
    createTimeBuckets({
      from: new Date("2026-07-17T00:00:00Z"),
      to: new Date("2026-07-16T00:00:00Z"),
      intervalMs: 1_000,
    }),
  ).toThrow("Invalid time bucket range");
});
