import { describe, expect, test } from "bun:test";
import { Effect, createStep, createWorkflow, executeStep } from "../src";

describe("workflow defaultStepConfig", () => {
  test("workflow-level retry default applies to steps without their own", async () => {
    let attempts = 0;
    const flaky = createStep("flaky-default", async () => {
      attempts++;
      if (attempts < 2) throw new Error("transient");
      return "ok";
    });
    const workflow = createWorkflow(
      "defaults",
      (input: {}, context) =>
        Effect.gen(function* () {
          return yield* executeStep(flaky, input, context);
        }),
      { defaultStepConfig: { retry: { maxAttempts: 2, initialDelayMs: 1 } } },
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
  });

  test("step-level config overrides workflow defaults", async () => {
    let attempts = 0;
    const noRetry = createStep(
      "no-retry",
      async () => {
        attempts++;
        throw new Error("fail");
      },
      undefined,
      { retry: { maxAttempts: 0 } },
    );
    const workflow = createWorkflow(
      "override",
      (input: {}, context) =>
        Effect.gen(function* () {
          return yield* executeStep(noRetry, input, context);
        }),
      { defaultStepConfig: { retry: { maxAttempts: 5, initialDelayMs: 1 } } },
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(1);
  });
});
