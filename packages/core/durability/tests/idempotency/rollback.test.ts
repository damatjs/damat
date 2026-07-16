import { afterAll, beforeAll, expect, test } from "bun:test";
import { withIdempotency } from "../../src";
import {
  cleanup,
  createTestContext,
  uniqueScope,
  type IdempotencyTestContext,
} from "./context";

let context: IdempotencyTestContext;

beforeAll(async () => {
  context = await createTestContext();
});

afterAll(async () => context.pool.end());

test("rolls back the claim and operation before a successful retry", async () => {
  const scope = uniqueScope("rollback");
  const attempt = (fail: boolean) =>
    context.durability.transaction((executor) =>
      withIdempotency({ scope, key: "same", executor }, async (tx) => {
        await tx.query(
          `INSERT INTO "_damat_idempotency_test_effects" ("scope", "count")
           VALUES ($1, 1)`,
          [scope],
        );
        if (fail) throw new Error("operation failed");
        return { saved: true };
      }),
    );
  try {
    await expect(attempt(true)).rejects.toThrow("operation failed");
    const afterFailure = await context.pool.query(
      `SELECT 1 FROM "_damat_idempotency_test_effects" WHERE "scope" = $1`,
      [scope],
    );
    expect(afterFailure.rowCount).toBe(0);
    expect(await attempt(false)).toEqual({
      value: { saved: true },
      replayed: false,
    });
  } finally {
    await cleanup(context, scope);
  }
});
