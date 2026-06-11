import { describe, expect, test } from "bun:test";
import {
  createStep,
  createWorkflow,
  executeStep,
  runStep,
  skipStep,
  parallel,
  when,
  ifElse,
  Effect,
  MaxRetriesExceededError,
} from "../src";

describe("workflow execution", () => {
  test("runs steps in order and returns the result", async () => {
    const calls: string[] = [];
    const stepA = createStep("a", async (input: { n: number }) => {
      calls.push("a");
      return { n: input.n + 1 };
    });
    const stepB = createStep("b", async (input: { n: number }) => {
      calls.push("b");
      return { n: input.n * 2 };
    });

    const wf = createWorkflow("order", (input: { n: number }, ctx) =>
      Effect.gen(function* () {
        const a = yield* executeStep(stepA, input, ctx);
        const b = yield* executeStep(stepB, a, ctx);
        return b;
      }),
    );

    const result = await wf.execute({ n: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.result.n).toBe(4);
    expect(calls).toEqual(["a", "b"]);
    expect(result.executionId).toBeTruthy();
  });

  test("failure surfaces the workflow error with code", async () => {
    const boom = createStep("boom", async () => {
      throw new Error("kaput");
    });
    const wf = createWorkflow("failing", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(boom, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("kaput");
      expect(result.compensated).toBe(false);
      expect(result.compensationsFailed).toBe(0);
    }
  });
});

describe("retry", () => {
  test("retries until success and increments ctx.attempt", async () => {
    const attempts: number[] = [];
    const flaky = createStep(
      "flaky",
      async (_input: {}, ctx) => {
        attempts.push(ctx.attempt);
        if (ctx.attempt < 3) throw new Error("transient");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 3, initialDelayMs: 1 } },
    );

    const wf = createWorkflow("retrying", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(flaky, input, ctx);
      }),
    );

    const result = await wf.execute({});
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

    const wf = createWorkflow("exhausted", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(alwaysFails, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(3); // 1 initial + 2 retries
    if (!result.success) {
      expect(result.error).toBeInstanceOf(MaxRetriesExceededError);
      expect(result.error.code).toBe("MAX_RETRIES_EXCEEDED");
    }
  });

  test("isRetryable receives the original error and can stop retries", async () => {
    let attempts = 0;
    const seen: unknown[] = [];
    const fatal = createStep(
      "fatal",
      async () => {
        attempts++;
        const e = new Error("do-not-retry");
        (e as any).fatal = true;
        throw e;
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

    const wf = createWorkflow("non-retryable", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(fatal, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(1);
    // The predicate must see the original Error, not the engine wrapper
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
        // Uncapped this would wait 1ms + 1s + 1000s between attempts.
        retry: {
          maxAttempts: 3,
          initialDelayMs: 1,
          backoffMultiplier: 1000,
          maxDelayMs: 20,
        },
      },
    );

    const wf = createWorkflow("capped-wf", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(slowBackoff, input, ctx);
      }),
    );

    const start = Date.now();
    const result = await wf.execute({});
    const elapsed = Date.now() - start;

    expect(result.success).toBe(false);
    expect(attempts).toBe(4);
    expect(elapsed).toBeLessThan(2000);
  });
});

describe("timeout", () => {
  test("step timeout applies per attempt and is retryable", async () => {
    let attempts = 0;
    const slowThenFast = createStep(
      "slow-then-fast",
      async () => {
        attempts++;
        if (attempts === 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
        return "done";
      },
      undefined,
      { timeoutMs: 50, retry: { maxAttempts: 1, initialDelayMs: 1 } },
    );

    const wf = createWorkflow("timeout-retry", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(slowThenFast, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
  });

  test("step timeout without retry fails with STEP_TIMEOUT", async () => {
    const slow = createStep(
      "slow",
      async () => {
        await new Promise((r) => setTimeout(r, 200));
        return "never";
      },
      undefined,
      { timeoutMs: 30 },
    );

    const wf = createWorkflow("timeout-wf", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(slow, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(false);
    if (!result.success) {
      // The timeout surfaces as STEP_TIMEOUT (or wrapped by the workflow)
      expect(result.error.message).toContain("timed out");
    }
  });
});

describe("compensation (saga)", () => {
  test("runs compensations in reverse order on failure", async () => {
    const compensated: string[] = [];
    const stepA = createStep(
      "a",
      async () => "a-output",
      async () => {
        compensated.push("a");
      },
    );
    const stepB = createStep(
      "b",
      async () => "b-output",
      async () => {
        compensated.push("b");
      },
    );
    const boom = createStep("boom", async (): Promise<string> => {
      throw new Error("fail after a and b");
    });

    const wf = createWorkflow("saga", (input: {}, ctx) =>
      Effect.gen(function* () {
        yield* executeStep(stepA, input, ctx);
        yield* executeStep(stepB, input, ctx);
        return yield* executeStep(boom, input, ctx);
      }),
    );

    const result = await wf.execute({});
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
      async () => {
        compensated.push("a");
      },
    );

    const wf = createWorkflow("happy", (input: {}, ctx) =>
      Effect.gen(function* () {
        return yield* executeStep(stepA, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(true);
    expect(compensated).toEqual([]);
  });

  test("failed compensation is counted but does not mask the original error", async () => {
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

    const wf = createWorkflow("bad-comp", (input: {}, ctx) =>
      Effect.gen(function* () {
        yield* executeStep(stepA, input, ctx);
        return yield* executeStep(boom, input, ctx);
      }),
    );

    const result = await wf.execute({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("original failure");
      expect(result.compensated).toBe(false);
      expect(result.compensationsFailed).toBe(1);
    }
  });
});

describe("workflow defaultStepConfig", () => {
  test("workflow-level retry default applies to steps without their own", async () => {
    let attempts = 0;
    const flaky = createStep("flaky-default", async () => {
      attempts++;
      if (attempts < 2) throw new Error("transient");
      return "ok";
    });

    const wf = createWorkflow(
      "defaults",
      (input: {}, ctx) =>
        Effect.gen(function* () {
          return yield* executeStep(flaky, input, ctx);
        }),
      { defaultStepConfig: { retry: { maxAttempts: 2, initialDelayMs: 1 } } },
    );

    const result = await wf.execute({});
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

    const wf = createWorkflow(
      "override",
      (input: {}, ctx) =>
        Effect.gen(function* () {
          return yield* executeStep(noRetry, input, ctx);
        }),
      { defaultStepConfig: { retry: { maxAttempts: 5, initialDelayMs: 1 } } },
    );

    const result = await wf.execute({});
    expect(result.success).toBe(false);
    expect(attempts).toBe(1);
  });
});

describe("utilities", () => {
  test("parallel runs steps concurrently and preserves outputs", async () => {
    const mk = (name: string, value: number) =>
      createStep(name, async () => {
        await new Promise((r) => setTimeout(r, 20));
        return value;
      });

    const wf = createWorkflow("par", (input: {}, ctx) =>
      Effect.gen(function* () {
        const [a, b, c] = yield* parallel(
          runStep(mk("p1", 1), input, ctx),
          runStep(mk("p2", 2), input, ctx),
          runStep(mk("p3", 3), input, ctx),
        );
        return a + b + c;
      }),
    );

    const start = Date.now();
    const result = await wf.execute({});
    const elapsed = Date.now() - start;

    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe(6);
    expect(elapsed).toBeLessThan(100); // concurrent, not 3 × 20ms sequential
  });

  test("when / ifElse / skipStep behave conditionally", async () => {
    const yes = createStep("yes", async () => "yes");
    const no = createStep("no", async () => "no");

    const wf = createWorkflow("cond", (input: { flag: boolean }, ctx) =>
      Effect.gen(function* () {
        const a = yield* when(input.flag, yes, input, ctx, "default");
        const b = yield* ifElse(input.flag, yes, no, input, ctx);
        const c = input.flag
          ? yield* skipStep("skipped")
          : yield* runStep(no, input, ctx);
        return { a, b, c };
      }),
    );

    const onTrue = await wf.execute({ flag: true });
    expect(onTrue.success).toBe(true);
    if (onTrue.success)
      expect(onTrue.result).toEqual({ a: "yes", b: "yes", c: "skipped" });

    const onFalse = await wf.execute({ flag: false });
    expect(onFalse.success).toBe(true);
    if (onFalse.success)
      expect(onFalse.result).toEqual({ a: "default", b: "no", c: "no" });
  });
});
