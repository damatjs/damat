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

test("serializes concurrent duplicates and commits one effect", async () => {
  const scope = uniqueScope("concurrent");
  const run = () =>
    context.durability.transaction((executor) =>
      withIdempotency({ scope, key: "same", executor }, async (tx) => {
        await tx.query("SELECT pg_sleep(0.1)");
        const effect = await tx.query<{ count: number }>(
          `INSERT INTO "_damat_idempotency_test_effects" ("scope", "count")
           VALUES ($1, 1)
           ON CONFLICT ("scope") DO UPDATE SET "count" =
             "_damat_idempotency_test_effects"."count" + 1
           RETURNING "count"`,
          [scope],
        );
        return { count: effect.rows[0]!.count };
      }),
    );
  try {
    const results = await Promise.all([run(), run()]);
    expect(results).toContainEqual({ value: { count: 1 }, replayed: false });
    expect(results).toContainEqual({ value: { count: 1 }, replayed: true });
    const effect = await context.pool.query<{ count: number }>(
      `SELECT "count" FROM "_damat_idempotency_test_effects"
       WHERE "scope" = $1`,
      [scope],
    );
    expect(effect.rows[0]!.count).toBe(1);
  } finally {
    await cleanup(context, scope);
  }
});
