import { describe, it, expect } from "bun:test";
import { Effect, Scope, Exit } from "@damatjs/deps/effect";
import { createStep, executeStep } from "../src/step";
import { RetryPolicies, DEFAULT_RETRY_POLICY } from "../src/config";
import type { WorkflowContext, WorkflowEngineState, RetryPolicy } from "../src/types";

const ctx = (engineState?: WorkflowEngineState): WorkflowContext => ({
  executionId: "exec-cfg",
  workflowName: "cfg-wf",
  startedAt: new Date(),
  attempt: 1,
  metadata: {},
  engineState,
});

function runScoped<O, E>(eff: Effect.Effect<O, E, Scope.Scope>) {
  return Effect.runPromiseExit(Effect.scoped(eff));
}

// =============================================================================
// config/retry — backoff timing (observed via real retry delays)
// =============================================================================

describe("config/retry: exponential backoff timing", () => {
  it("waits roughly initialDelay, then initialDelay*multiplier between attempts", async () => {
    const timestamps: number[] = [];
    const step = createStep<number, string>(
      "backoff",
      async () => {
        timestamps.push(Date.now());
        throw new Error("retry");
      },
      undefined,
      {
        // 3 retries; delays should be ~30, ~60, ~120 (capped at 500).
        retry: {
          maxAttempts: 3,
          initialDelayMs: 30,
          backoffMultiplier: 2,
          maxDelayMs: 500,
        },
      },
    );
    await runScoped(executeStep(step, 1, ctx()));

    // 1 initial + 3 retries.
    expect(timestamps.length).toBe(4);
    const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i]!);
    // Each gap grows: gap[1] should be noticeably larger than gap[0].
    expect(gaps[0]).toBeGreaterThanOrEqual(20);
    expect(gaps[1]).toBeGreaterThan(gaps[0]! - 5);
    expect(gaps[2]).toBeGreaterThan(gaps[1]! - 5);
  });

  it("caps each delay at maxDelayMs even with a huge multiplier", async () => {
    let attempts = 0;
    const step = createStep<number, string>(
      "capped-backoff",
      async () => {
        attempts++;
        throw new Error("again");
      },
      undefined,
      {
        // Uncapped the 3rd delay would be 1*1000*1000 = 1,000,000ms.
        retry: {
          maxAttempts: 3,
          initialDelayMs: 1,
          backoffMultiplier: 1000,
          maxDelayMs: 20,
        },
      },
    );

    const start = Date.now();
    await runScoped(executeStep(step, 1, ctx()));
    const elapsed = Date.now() - start;

    expect(attempts).toBe(4); // 1 + 3 retries
    // Total wait is bounded by maxDelayMs per gap (~ a handful of 20ms gaps).
    expect(elapsed).toBeLessThan(1000);
  });

  it("initialDelayMs = 0 retries immediately (no measurable delay)", async () => {
    let attempts = 0;
    const step = createStep<number, string>(
      "zero-delay",
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("transient");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 10 } },
    );

    const start = Date.now();
    const exit = await runScoped(executeStep(step, 1, ctx()));
    const elapsed = Date.now() - start;

    expect(Exit.isSuccess(exit)).toBe(true);
    expect(attempts).toBe(3);
    expect(elapsed).toBeLessThan(200);
  });
});

// =============================================================================
// config/retry — policy selection via the layering in resolveStepConfig
// engine defaults < workflow defaults < step config < per-call override
// =============================================================================

describe("config/retry: policy layering precedence", () => {
  it("a preset merged over DEFAULT supplies the missing fields", async () => {
    let attempts = 0;
    // RetryPolicies.once = { maxAttempts: 1, initialDelayMs: 0 } — relies on the
    // engine default for maxDelayMs/backoffMultiplier.
    const merged: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...RetryPolicies.once };
    const step = createStep<number, string>(
      "once-preset",
      async () => {
        attempts++;
        throw new Error("fail");
      },
      undefined,
      { retry: merged },
    );
    await runScoped(executeStep(step, 1, ctx()));
    // once = exactly 1 retry -> 2 total invocations.
    expect(attempts).toBe(2);
  });

  it("workflow defaultStepConfig.retry applies when the step omits its own retry", async () => {
    let attempts = 0;
    // Step created WITHOUT a retry policy. The workflow default supplies it via
    // engineState.defaultStepConfig (the layer resolveStepConfig reads).
    const step = createStep<number, string>("no-own-retry", async () => {
      attempts++;
      if (attempts < 2) throw new Error("transient");
      return "ok";
    });
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
      defaultStepConfig: { retry: { maxAttempts: 3, initialDelayMs: 1 } },
    };
    const exit = await runScoped(executeStep(step, 1, ctx(engineState)));

    expect(Exit.isSuccess(exit)).toBe(true);
    expect(attempts).toBe(2);
  });

  it("a step's own retry policy overrides the workflow default", async () => {
    let attempts = 0;
    const step = createStep<number, string>(
      "own-wins",
      async () => {
        attempts++;
        throw new Error("fail");
      },
      undefined,
      { retry: { maxAttempts: 0 } }, // step says: no retries
    );
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
      defaultStepConfig: { retry: { maxAttempts: 5, initialDelayMs: 1 } },
    };
    await runScoped(executeStep(step, 1, ctx(engineState)));

    // Step's maxAttempts: 0 wins over workflow default 5.
    expect(attempts).toBe(1);
  });

  it("a per-call override is the highest-priority retry layer", async () => {
    let attempts = 0;
    const step = createStep<number, string>(
      "override-top",
      async () => {
        attempts++;
        if (attempts < 4) throw new Error("transient");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 1, initialDelayMs: 1 } }, // would give up after 2 tries
    );
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
      defaultStepConfig: { retry: { maxAttempts: 0 } },
    };
    // Per-call override bumps attempts to 4 — beats both step and workflow layers.
    const exit = await runScoped(
      executeStep(step, 1, ctx(engineState), { retry: { maxAttempts: 4 } }),
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    expect(attempts).toBe(4);
  });

  it("RetryPolicies presets expose the documented attempt counts", () => {
    expect(RetryPolicies.none.maxAttempts).toBe(0);
    expect(RetryPolicies.once.maxAttempts).toBe(1);
    expect(RetryPolicies.standard.maxAttempts).toBe(3);
    expect(RetryPolicies.aggressive.maxAttempts).toBe(5);
    expect(RetryPolicies.patient.maxAttempts).toBe(3);
  });
});
