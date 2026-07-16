import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  setDurabilityClient,
  withIdempotency,
} from "../../src";
import {
  cleanup,
  createTestContext,
  uniqueScope,
  type IdempotencyTestContext,
} from "./context";

let context: IdempotencyTestContext;

beforeAll(async () => {
  context = await createTestContext();
  setDurabilityClient(context.durability);
});

afterAll(async () => {
  clearDurabilityClient();
  await context.pool.end();
});

test("runs the first operation in the idempotency transaction", async () => {
  const scope = uniqueScope("first");
  try {
    const result = await withIdempotency({ scope, key: "same" }, async (tx) => {
      const inserted = await tx.query<{ value: number }>("SELECT 42 AS value");
      return { value: inserted.rows[0]!.value };
    });
    expect(result).toEqual({ value: { value: 42 }, replayed: false });
  } finally {
    await cleanup(context, scope);
  }
});

test("replaces an expired completed key", async () => {
  const scope = uniqueScope("expired");
  try {
    await context.pool.query(
      `INSERT INTO "_damat_idempotency_keys"
        ("scope", "key", "status", "result", "expires_at")
       VALUES ($1, 'same', 'completed', '{"old":true}', NOW() - INTERVAL '1 second')`,
      [scope],
    );
    const result = await context.durability.transaction((executor) =>
      withIdempotency({ scope, key: "same", executor }, async () => ({
        fresh: true,
      })),
    );
    expect(result).toEqual({ value: { fresh: true }, replayed: false });
  } finally {
    await cleanup(context, scope);
  }
});
