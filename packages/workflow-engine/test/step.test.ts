import { describe, it, expect } from "bun:test";
import { Effect, Scope, Exit, Cause } from "@damatjs/deps/effect";
import { createStep, executeStep, StepResponse } from "../src/step";
import {
  StepExecutionError,
  StepTimeoutError,
  DEFAULT_RETRY_POLICY,
} from "../src/index";
import { DEFAULT_STEP_CONFIG } from "../src/config";
import type { WorkflowContext } from "../src/types";

// -----------------------------------------------------------------------------
// Effect helpers: executeStep returns an Effect requiring a Scope, so we run it
// inside Effect.scoped(...) to completion and inspect the Exit. Keep all retry
// delays tiny so the suite stays fast and deterministic.
// -----------------------------------------------------------------------------

const ctx = (): WorkflowContext => ({
  executionId: "exec-1",
  workflowName: "test-wf",
  startedAt: new Date(),
  attempt: 1,
  metadata: {},
});

function runStep<O, E>(eff: Effect.Effect<O, E, Scope.Scope>) {
  return Effect.runPromiseExit(Effect.scoped(eff));
}

function squashError(exit: Exit.Exit<unknown, unknown>): unknown {
  if (Exit.isFailure(exit)) return Cause.squash(exit.cause);
  throw new Error("expected a failing exit");
}

// =============================================================================
// step/create
// =============================================================================

describe("step/create: createStep", () => {
  it("merges defaults into config when none provided", () => {
    const step = createStep<number, number>("s", async (n) => n + 1);

    expect(step.name).toBe("s");
    expect(step.config.timeoutMs).toBe(DEFAULT_STEP_CONFIG.timeoutMs);
    expect(step.config.idempotent).toBe(true);
    expect(step.config.description).toBe("");
    expect(step.config.retry).toEqual(DEFAULT_RETRY_POLICY);
    expect(typeof step.invoke).toBe("function");
  });

  it("omits compensate when not supplied", () => {
    const step = createStep<number, number>("s", async (n) => n);
    expect(step.compensate).toBeUndefined();
  });

  it("includes compensate when supplied", () => {
    const comp = async () => {};
    const step = createStep<number, number>("s", async (n) => n, comp);
    expect(step.compensate).toBe(comp);
  });

  it("overrides individual config fields and deep-merges the retry policy", () => {
    const step = createStep<number, number>("s", async (n) => n, undefined, {
      timeoutMs: 1234,
      description: "my step",
      idempotent: false,
      retry: { maxAttempts: 3, initialDelayMs: 5 }, // partial override
    });

    expect(step.config.timeoutMs).toBe(1234);
    expect(step.config.description).toBe("my step");
    expect(step.config.idempotent).toBe(false);
    // overridden fields
    expect(step.config.retry.maxAttempts).toBe(3);
    expect(step.config.retry.initialDelayMs).toBe(5);
    // inherited from DEFAULT_RETRY_POLICY
    expect(step.config.retry.maxDelayMs).toBe(DEFAULT_RETRY_POLICY.maxDelayMs);
    expect(step.config.retry.backoffMultiplier).toBe(
      DEFAULT_RETRY_POLICY.backoffMultiplier,
    );
  });

  it("preserves a custom isRetryable predicate through the merge", () => {
    const pred = () => true;
    const step = createStep<number, number>("s", async (n) => n, undefined, {
      retry: { maxAttempts: 1, isRetryable: pred },
    });
    expect(step.config.retry.isRetryable).toBe(pred);
  });
});

// =============================================================================
// step/execute — success
// =============================================================================

describe("step/execute: success path", () => {
  it("runs invoke once and returns its output", async () => {
    let calls = 0;
    const step = createStep<number, string>("ok", async (n) => {
      calls++;
      return `value-${n}`;
    });
    const exit = await runStep(executeStep(step, 7, ctx()));

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("value-7");
    expect(calls).toBe(1);
  });

  it("passes input and a context (with attempt) into invoke", async () => {
    let seenInput: unknown;
    let seenCtx: WorkflowContext | undefined;
    const step = createStep<{ id: number }, boolean>(
      "ctx",
      async (input, c) => {
        seenInput = input;
        seenCtx = c;
        return true;
      },
    );
    await runStep(executeStep(step, { id: 99 }, ctx()));

    expect(seenInput).toEqual({ id: 99 });
    expect(seenCtx?.workflowName).toBe("test-wf");
    expect(seenCtx?.attempt).toBe(1);
  });
});

// =============================================================================
// step/execute — failure (no retry)
// =============================================================================

describe("step/execute: failure path", () => {
  it("wraps a thrown Error in StepExecutionError with message + cause", async () => {
    const original = new Error("kaboom");
    const step = createStep<number, string>("fail", async () => {
      throw original;
    });
    const exit = await runStep(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepExecutionError);
    expect((err as StepExecutionError).message).toBe("kaboom");
    expect((err as StepExecutionError).stepName).toBe("fail");
    expect((err as StepExecutionError).workflowName).toBe("test-wf");
    expect((err as StepExecutionError).cause).toBe(original);
  });

  it("stringifies non-Error throws", async () => {
    const step = createStep<number, string>("fail-str", async () => {
      throw "plain string failure";
    });
    const err = squashError(await runStep(executeStep(step, 1, ctx())));
    expect(err).toBeInstanceOf(StepExecutionError);
    expect((err as StepExecutionError).message).toBe("plain string failure");
  });

  it("calls invoke exactly once when no retries are configured (default policy)", async () => {
    let calls = 0;
    const step = createStep<number, string>("once", async () => {
      calls++;
      throw new Error("x");
    });
    await runStep(executeStep(step, 1, ctx()));
    expect(calls).toBe(1);
  });
});

// =============================================================================
// step/execute — retry
// =============================================================================

describe("step/execute: retry behavior", () => {
  const fastRetry = {
    maxAttempts: 5,
    initialDelayMs: 1,
    maxDelayMs: 50,
    backoffMultiplier: 2,
  };

  it("retries until success and returns the eventual output", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "flaky",
      async (n) => {
        calls++;
        if (calls < 3) throw new Error(`transient ${calls}`);
        return `ok-${n}`;
      },
      undefined,
      { retry: fastRetry, timeoutMs: 5000 },
    );
    const exit = await runStep(executeStep(step, 42, ctx()));

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("ok-42");
    expect(calls).toBe(3); // 2 failures + 1 success
  });

  it("exhausting retries surfaces the last StepExecutionError", async () => {
    // NOTE: current engine surfaces the last StepExecutionError on exhaustion,
    // it does NOT throw MaxRetriesExceededError (see report).
    let calls = 0;
    const step = createStep<number, string>(
      "always-fail",
      async () => {
        calls++;
        throw new Error("permanent");
      },
      undefined,
      {
        retry: {
          maxAttempts: 2,
          initialDelayMs: 1,
          maxDelayMs: 50,
          backoffMultiplier: 2,
        },
        timeoutMs: 5000,
      },
    );
    const exit = await runStep(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepExecutionError);
    expect((err as StepExecutionError).message).toBe("permanent");
    // Schedule.recurs(maxAttempts): 1 initial + maxAttempts retries = 3 total
    expect(calls).toBe(3);
  });

  it("does not retry when isRetryable returns false", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "non-retryable",
      async () => {
        calls++;
        throw new Error("nope");
      },
      undefined,
      {
        retry: { maxAttempts: 3, initialDelayMs: 1, isRetryable: () => false },
      },
    );
    await runStep(executeStep(step, 1, ctx()));
    expect(calls).toBe(1);
  });

  it("retries when isRetryable returns true", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "retryable",
      async () => {
        calls++;
        if (calls < 2) throw new Error("retry me");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 3, initialDelayMs: 1, isRetryable: () => true } },
    );
    const exit = await runStep(executeStep(step, 1, ctx()));
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(calls).toBe(2);
  });

  it("default while-predicate does NOT retry ValidationError causes", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "validation",
      async () => {
        calls++;
        const e = new Error("invalid input");
        e.name = "ValidationError";
        throw e;
      },
      undefined,
      { retry: { maxAttempts: 3, initialDelayMs: 1 } },
    );
    await runStep(executeStep(step, 1, ctx()));
    expect(calls).toBe(1);
  });
});

// =============================================================================
// step/execute — timeout
// =============================================================================

describe("step/execute: timeout", () => {
  it("fails with StepTimeoutError when invoke exceeds timeoutMs", async () => {
    const step = createStep<number, string>(
      "slow",
      async () => {
        await new Promise((r) => setTimeout(r, 200));
        return "too late";
      },
      undefined,
      { timeoutMs: 20 },
    );
    const exit = await runStep(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepTimeoutError);
    expect((err as StepTimeoutError).timeoutMs).toBe(20);
    expect((err as StepTimeoutError).stepName).toBe("slow");
    expect((err as StepTimeoutError).message).toBe(
      "Step 'slow' timed out after 20ms",
    );
  });

  it("does not time out a fast step", async () => {
    const step = createStep<number, string>(
      "fast",
      async () => "done",
      undefined,
      { timeoutMs: 1000 },
    );
    const exit = await runStep(executeStep(step, 1, ctx()));
    expect(Exit.isSuccess(exit)).toBe(true);
  });
});

// =============================================================================
// step/execute — compensation registration (finalizer)
// =============================================================================

describe("step/execute: compensation finalizer", () => {
  it("does NOT run compensation when the scope exits successfully", async () => {
    let compensated = false;
    const step = createStep<number, string>(
      "comp-ok",
      async () => "result",
      async () => {
        compensated = true;
      },
    );
    const exit = await runStep(executeStep(step, 1, ctx()));
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(compensated).toBe(false);
  });

  it("delivers the StepResponse compensateInput to compensation (not input/output)", async () => {
    let compensated = false;
    let received: unknown = "unset";
    let receivedCtx: WorkflowContext | undefined;
    const step = createStep<number, string, { undo: string }>(
      "comp-run",
      // output flows downstream; the 2nd arg is the rollback payload.
      async () => new StepResponse("step-output", { undo: "token-1" }),
      async (compensateInput, c) => {
        compensated = true;
        received = compensateInput;
        receivedCtx = c;
      },
    );

    // Run the step then deliberately fail within the same scope so the
    // finalizer observes a failing exit.
    const program = Effect.scoped(
      Effect.gen(function* () {
        yield* executeStep(step, 123, ctx());
        return yield* Effect.fail(new StepExecutionError("downstream", "boom"));
      }),
    );
    const exit = await Effect.runPromiseExit(program);

    expect(Exit.isFailure(exit)).toBe(true);
    expect(compensated).toBe(true);
    // compensate receives (compensateInput, ctx) — the payload, plus context.
    expect(received).toEqual({ undo: "token-1" });
    expect(receivedCtx?.workflowName).toBe("test-wf");
  });

  it("gives compensation `undefined` when no compensateInput was provided (no output fallback)", async () => {
    let received: unknown = "unset";
    const step = createStep<number, string>(
      "comp-none",
      async () => new StepResponse("the-output"),
      async (compensateInput) => {
        received = compensateInput;
      },
    );
    const program = Effect.scoped(
      Effect.gen(function* () {
        yield* executeStep(step, 1, ctx());
        return yield* Effect.fail(new StepExecutionError("ds", "boom"));
      }),
    );
    await Effect.runPromiseExit(program);

    // The compensation gets nothing — explicitly NOT the output ("the-output").
    expect(received).toBeUndefined();
  });

  it("swallows compensation errors (does not change the original failure)", async () => {
    const step = createStep<number, string>(
      "comp-throws",
      async () => "out",
      async () => {
        throw new Error("compensation itself failed");
      },
    );
    const program = Effect.scoped(
      Effect.gen(function* () {
        yield* executeStep(step, 1, ctx());
        return yield* Effect.fail(
          new StepExecutionError("ds", "primary failure"),
        );
      }),
    );
    const exit = await Effect.runPromiseExit(program);
    const err = squashError(exit);

    // The surfaced error is still the primary failure, not the compensation error.
    expect(err).toBeInstanceOf(StepExecutionError);
    expect((err as StepExecutionError).message).toBe("primary failure");
  });
});

// =============================================================================
// step/execute — StepResponse unwrapping
// =============================================================================

describe("step/execute: StepResponse", () => {
  it("unwraps the StepResponse so downstream receives the output, not the wrapper", async () => {
    const step = createStep<number, string, string>(
      "unwrap",
      async () => new StepResponse("real-output", "rollback-token"),
    );
    const exit = await runStep(executeStep(step, 1, ctx()));

    expect(Exit.isSuccess(exit)).toBe(true);
    // The workflow sees the plain output — never the StepResponse instance.
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toBe("real-output");
      expect(StepResponse.isStepResponse(exit.value)).toBe(false);
    }
  });

  it("isStepResponse detects instances via the brand and rejects look-alikes", () => {
    expect(StepResponse.isStepResponse(new StepResponse("x", "y"))).toBe(true);
    expect(StepResponse.isStepResponse(new StepResponse("x"))).toBe(true);
    // A structural look-alike without the brand is NOT a StepResponse.
    expect(
      StepResponse.isStepResponse({ output: "x", compensateInput: "y" }),
    ).toBe(false);
    expect(StepResponse.isStepResponse(null)).toBe(false);
    expect(StepResponse.isStepResponse("x")).toBe(false);
    expect(StepResponse.isStepResponse(undefined)).toBe(false);
  });
});

// =============================================================================
// step/execute — per-call config override (optional 4th arg / 3rd callable arg)
// Retry/timeout stay available when calling a step directly: pass them per-call
// instead of baking them into the step definition. The override is the
// highest-priority layer, so it beats the step's own config in either direction.
// =============================================================================

describe("step/execute: per-call config override", () => {
  it("a per-call timeout override tightens a generous step timeout (shorter wins → times out)", async () => {
    // The step itself comfortably allows a 100ms task...
    const step = createStep<number, string>(
      "slow-overridden",
      async () => {
        await new Promise((r) => setTimeout(r, 100));
        return "too late";
      },
      undefined,
      { timeoutMs: 5000 },
    );
    // ...but this one call tightens the timeout to 20ms.
    const exit = await runStep(executeStep(step, 1, ctx(), { timeoutMs: 20 }));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepTimeoutError);
    expect((err as StepTimeoutError).timeoutMs).toBe(20);
  });

  it("a per-call timeout override can also RELAX a tight step timeout (longer wins → succeeds)", async () => {
    const step = createStep<number, string>(
      "tight-relaxed",
      async () => {
        await new Promise((r) => setTimeout(r, 60));
        return "made it";
      },
      undefined,
      { timeoutMs: 20 }, // on its own this would time out the 60ms task
    );
    const exit = await runStep(
      executeStep(step, 1, ctx(), { timeoutMs: 1000 }),
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("made it");
  });

  it("a per-call retry override adds retries to a step that has none by default", async () => {
    let calls = 0;
    // Default policy = no retries; without an override the first throw is fatal.
    const step = createStep<number, string>("flaky-no-retry", async (n) => {
      calls++;
      if (calls < 3) throw new Error(`transient ${calls}`);
      return `ok-${n}`;
    });
    const exit = await runStep(
      executeStep(step, 7, ctx(), {
        retry: { maxAttempts: 5, initialDelayMs: 1, maxDelayMs: 10 },
      }),
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("ok-7");
    expect(calls).toBe(3); // 2 failures + 1 success, enabled purely by the override
  });

  it("a per-call retry override deep-merges over the step's own retry policy", async () => {
    let calls = 0;
    // Step allows only 1 retry; the override bumps maxAttempts to 4 while
    // keeping the step's fast initialDelayMs.
    const step = createStep<number, string>(
      "bump-attempts",
      async () => {
        calls++;
        if (calls < 4) throw new Error("transient");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 1, initialDelayMs: 1, maxDelayMs: 10 } },
    );
    const exit = await runStep(
      executeStep(step, 1, ctx(), { retry: { maxAttempts: 4 } }),
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    expect(calls).toBe(4); // 3 failures + 1 success — attempts came from the override
  });

  it("the callable form forwards the override: step(input, ctx, override)", async () => {
    const step = createStep<number, string>(
      "callable-override",
      async () => {
        await new Promise((r) => setTimeout(r, 100));
        return "too late";
      },
      undefined,
      { timeoutMs: 5000 },
    );
    // Direct-call shorthand carrying a per-call override.
    const exit = await runStep(step(1, ctx(), { timeoutMs: 20 }));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepTimeoutError);
    expect((err as StepTimeoutError).timeoutMs).toBe(20);
  });

  it("omitting the override leaves the step's own config untouched", async () => {
    const step = createStep<number, string>(
      "no-override",
      async () => {
        await new Promise((r) => setTimeout(r, 100));
        return "too late";
      },
      undefined,
      { timeoutMs: 20 },
    );
    // No 4th arg → the step's own 20ms timeout still applies.
    const exit = await runStep(executeStep(step, 1, ctx()));
    expect(squashError(exit)).toBeInstanceOf(StepTimeoutError);
  });
});
