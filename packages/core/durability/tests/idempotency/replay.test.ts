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

test("returns a completed result without rerunning the operation", async () => {
  const scope = uniqueScope("replay");
  let calls = 0;
  const run = () =>
    context.durability.transaction((executor) =>
      withIdempotency({ scope, key: "same", executor }, async () => ({
        call: ++calls,
      })),
    );
  try {
    expect(await run()).toEqual({ value: { call: 1 }, replayed: false });
    expect(await run()).toEqual({ value: { call: 1 }, replayed: true });
    expect(calls).toBe(1);
  } finally {
    await cleanup(context, scope);
  }
});

test("rejects a runtime value that is not JSON-safe", async () => {
  const scope = uniqueScope("json");
  try {
    await expect(
      context.durability.transaction((executor) =>
        withIdempotency({ scope, key: "same", executor }, async () => {
          return { invalid: 1n } as never;
        }),
      ),
    ).rejects.toThrow(/JSON/i);
    const stored = await context.pool.query(
      `SELECT 1 FROM "_damat_idempotency_keys" WHERE "scope" = $1`,
      [scope],
    );
    expect(stored.rowCount).toBe(0);
  } finally {
    await cleanup(context, scope);
  }
});
