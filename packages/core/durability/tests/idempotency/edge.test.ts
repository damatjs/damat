import { afterAll, beforeAll, expect, test } from "bun:test";
import { withIdempotency } from "../../src";
import {
  cleanup,
  createTestContext,
  uniqueScope,
  type IdempotencyTestContext,
} from "./context";

let context: IdempotencyTestContext;
beforeAll(async () => (context = await createTestContext()));
afterAll(async () => context.pool.end());

test("reports a duplicate operation that is still running", async () => {
  const scope = uniqueScope("running");
  try {
    await context.pool.query(
      `INSERT INTO "_damat_idempotency_keys" ("scope","key","status")
       VALUES ($1,'same','running')`,
      [scope],
    );
    await expect(
      context.durability.transaction((executor) =>
        withIdempotency({ scope, key: "same", executor }, async () => null),
      ),
    ).rejects.toThrow(`still running: ${scope}/same`);
  } finally {
    await cleanup(context, scope);
  }
});

test("stores JSON-safe array results", async () => {
  const scope = uniqueScope("array");
  try {
    await expect(
      context.durability.transaction((executor) =>
        withIdempotency({ scope, key: "same", executor }, async () => [
          1,
          { saved: true },
        ]),
      ),
    ).resolves.toEqual({ value: [1, { saved: true }], replayed: false });
  } finally {
    await cleanup(context, scope);
  }
});
