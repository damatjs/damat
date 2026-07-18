import { describe, expect, test } from "bun:test";
import { Effect, createStep, createWorkflow, executeStep } from "../src";

describe("compensation (saga)", () => {
  test("runs compensations in reverse order on failure", async () => {
    const compensated: string[] = [];
    const stepA = createStep(
      "a",
      async () => "a-output",
      async () => void compensated.push("a"),
    );
    const stepB = createStep(
      "b",
      async () => "b-output",
      async () => void compensated.push("b"),
    );
    const boom = createStep("boom", async (): Promise<string> => {
      throw new Error("fail after a and b");
    });
    const workflow = createWorkflow("saga", (input: {}, context) =>
      Effect.gen(function* () {
        yield* executeStep(stepA, input, context);
        yield* executeStep(stepB, input, context);
        return yield* executeStep(boom, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    expect(compensated).toEqual(["b", "a"]);
    if (!result.success) {
      expect(result.compensated).toBe(true);
      expect(result.compensationsFailed).toBe(0);
    }
  });

  test("does not run compensation on success", async () => {
    const compensated: string[] = [];
    const stepA = createStep(
      "a",
      async () => "ok",
      async () => void compensated.push("a"),
    );
    const workflow = createWorkflow("happy", (input: {}, context) =>
      Effect.gen(function* () {
        return yield* executeStep(stepA, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(true);
    expect(compensated).toEqual([]);
  });

  test("failed compensation preserves the original error", async () => {
    const stepA = createStep(
      "a",
      async () => "ok",
      async () => {
        throw new Error("compensation broke");
      },
    );
    const boom = createStep("boom", async (): Promise<string> => {
      throw new Error("original failure");
    });
    const workflow = createWorkflow("bad-comp", (input: {}, context) =>
      Effect.gen(function* () {
        yield* executeStep(stepA, input, context);
        return yield* executeStep(boom, input, context);
      }),
    );

    const result = await workflow.execute({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("original failure");
      expect(result.compensated).toBe(false);
      expect(result.compensationsFailed).toBe(1);
    }
  });
});
