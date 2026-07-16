import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  setDurabilityClient,
} from "../../src/client/global";
import { cleanupExpiredIdempotency } from "../../src/idempotency";
import { createTestContext, type IdempotencyTestContext } from "./context";

let context: IdempotencyTestContext;

beforeAll(async () => {
  context = await createTestContext();
  setDurabilityClient(context.durability);
});
afterAll(async () => {
  clearDurabilityClient();
  await context.pool.end();
});

describe("idempotency retention", () => {
  test("deletes expired keys in bounded batches", async () => {
    const scope = `cleanup:${crypto.randomUUID()}`;
    for (const key of ["one", "two"]) {
      await context.pool.query(
        `INSERT INTO "_damat_idempotency_keys"
         ("scope","key","status","expires_at")
         VALUES ($1,$2,'completed',NOW()-INTERVAL '1 second')`,
        [scope, key],
      );
    }
    expect(await cleanupExpiredIdempotency({ limit: 1 })).toBe(1);
    const remaining = await context.pool.query(
      `SELECT 1 FROM "_damat_idempotency_keys" WHERE "scope"=$1`,
      [scope],
    );
    expect(remaining.rowCount).toBe(1);
    await context.pool.query(
      `DELETE FROM "_damat_idempotency_keys" WHERE "scope"=$1`,
      [scope],
    );
  });

  test("rejects invalid batch sizes before querying", async () => {
    for (const limit of [0, 1.5, Number.NaN]) {
      await expect(cleanupExpiredIdempotency({ limit })).rejects.toThrow(
        "positive safe integer",
      );
    }
  });
});
