import { describe, expect, test } from "bun:test";
import {
  Effect,
  MaxRetriesExceededError,
  createStep,
  createWorkflow,
  executeStep,
} from "../src";

describe("retry", () => {
  test("retries until success and increments ctx.attempt", async () => {
    const attempts: number[] = [];
    const flaky = createStep(
      "flaky",
      async (_input: {}, context) => {
        attempts.push(context.attempt);
        if (context.attempt < 3) throw new Error("transient");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 3, initialDelayMs: 1 } },
    );
    const workflow = createWorkflow("retrying", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(flaky, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(true);
    expect(attempts).toEqual([1, 2, 3]);
  });

  test("exhausted retries fail with MaxRetriesExceededError", async () => {
    let attempts = 0;
    const alwaysFails = createStep(
      "always-fails",
      async () => {
        attempts++;
        throw new Error("permanent");
      },
      undefined,
      { retry: { maxAttempts: 2, initialDelayMs: 1 } },
    );
    const workflow = createWorkflow("exhausted", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(alwaysFails, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(3);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(MaxRetriesExceededError);
      expect(result.error.code).toBe("MAX_RETRIES_EXCEEDED");
    }
  });
});
