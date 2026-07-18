import { describe, expect, test } from "bun:test";
import { Effect, createStep, createWorkflow, executeStep } from "../src";

describe("timeout", () => {
  test("step timeout applies per attempt and is retryable", async () => {
    let attempts = 0;
    const slowThenFast = createStep(
      "slow-then-fast",
      async () => {
        attempts++;
        if (attempts === 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return "done";
      },
      undefined,
      { timeoutMs: 50, retry: { maxAttempts: 1, initialDelayMs: 1 } },
    );
    const workflow = createWorkflow("timeout-retry", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(slowThenFast, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
  });

  test("step timeout without retry fails with STEP_TIMEOUT", async () => {
    const slow = createStep(
      "slow",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "never";
      },
      undefined,
      { timeoutMs: 30 },
    );
    const workflow = createWorkflow("timeout-wf", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(slow, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toContain("timed out");
  });
});
