import { describe, expect, test } from "bun:test";
import { Effect, createStep, createWorkflow, executeStep } from "../src";

describe("retry policy", () => {
  test("isRetryable receives the original error and can stop retries", async () => {
    let attempts = 0;
    const seen: unknown[] = [];
    const fatal = createStep(
      "fatal",
      async () => {
        attempts++;
        const error = new Error("do-not-retry");
        (error as any).fatal = true;
        throw error;
      },
      undefined,
      {
        retry: {
          maxAttempts: 5,
          initialDelayMs: 1,
          isRetryable: (error) => {
            seen.push(error);
            return !(error as any).fatal;
          },
        },
      },
    );
    const workflow = createWorkflow("non-retryable", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(fatal, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(1);
    expect((seen[0] as Error).message).toBe("do-not-retry");
  });

  test("maxDelayMs caps exponential backoff delays", async () => {
    let attempts = 0;
    const slowBackoff = createStep(
      "capped",
      async () => {
        attempts++;
        throw new Error("again");
      },
      undefined,
      {
        retry: {
          maxAttempts: 3,
          initialDelayMs: 1,
          backoffMultiplier: 1000,
          maxDelayMs: 20,
        },
      },
    );
    const workflow = createWorkflow("capped-wf", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(slowBackoff, input, context);
      }),
    );

    const start = Date.now();
    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(4);
    expect(Date.now() - start).toBeLessThan(2_000);
  });
});
