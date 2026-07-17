import { beforeAll, expect, test } from "bun:test";
import { ensureStorage, inspection } from "./context";

beforeAll(ensureStorage);

test("zero-length summary range has no throughput rows", async () => {
  const point = new Date("2052-01-01T00:00:00Z");
  const result = await inspection().getSummary({
    from: point,
    to: point,
    intervalMs: 60_000,
    now: point,
  });
  expect(result.throughput).toEqual([]);
});
