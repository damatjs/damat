import { describe, it, expect, mock, beforeEach } from "bun:test";

// -----------------------------------------------------------------------------
// createWorkflow transitively imports the lock module (-> @damatjs/redis). Mock
// redis so workflow execution never touches a live server. Mocking getRedis is
// enough — the real lock helpers (extendLock/isLocked) call getRedis() internally.
// -----------------------------------------------------------------------------

const state = {
  acquireResult: "lock-value" as string | null,
  releaseResult: true,
};

const acquireLock = mock(async () => state.acquireResult);
const releaseLock = mock(async () => state.releaseResult);
const getRedis = mock(() => ({
  get: async () => null,
  eval: async () => 1,
}));

mock.module("@damatjs/redis", () => ({ acquireLock, releaseLock, getRedis }));

import { Effect, Scope, Exit, Cause } from "@damatjs/deps/effect";
import { createWorkflow } from "../src/workflow";
import { createStep, executeStep, StepResponse } from "../src/step";
import {
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  WorkflowError,
} from "../src/index";
import type { WorkflowContext, WorkflowEngineState } from "../src/types";

beforeEach(() => {
  state.acquireResult = "lock-value";
  state.releaseResult = true;
  acquireLock.mockClear();
  releaseLock.mockClear();
  getRedis.mockClear();
});

const ctx = (): WorkflowContext => ({
  executionId: "exec-edge",
  workflowName: "edge-wf",
  startedAt: new Date(),
  attempt: 1,
  metadata: {},
});

function runScoped<O, E>(eff: Effect.Effect<O, E, Scope.Scope>) {
  return Effect.runPromiseExit(Effect.scoped(eff));
}

function squashError(exit: Exit.Exit<unknown, unknown>): unknown {
  if (Exit.isFailure(exit)) return Cause.squash(exit.cause);
  throw new Error("expected a failing exit");
}

// =============================================================================
// step/execute — timeoutMs edge values (0 / negative)
// =============================================================================

describe("step/execute: timeoutMs = 0 / negative", () => {
  // VERIFIED EMPIRICALLY against the real engine: Effect.timeoutFail with a
  // zero/negative duration fires immediately for any work that yields to the
  // event loop, but lets a synchronously-resolving promise win the race.

  it("timeoutMs = 0 times out a step that awaits the event loop", async () => {
    const step = createStep<number, string>(
      "zero-timeout-async",
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return "too late";
      },
      undefined,
      { timeoutMs: 0 },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepTimeoutError);
    expect((err as StepTimeoutError).timeoutMs).toBe(0);
  });

  it("timeoutMs = 0 still lets a step that resolves without yielding succeed", async () => {
    // No `await` of a timer — the promise settles in the same microtask, so the
    // 0ms deadline never gets a chance to fire first.
    const step = createStep<number, string>(
      "zero-timeout-immediate",
      async () => "done",
      undefined,
      { timeoutMs: 0 },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("done");
  });

  it("a negative timeoutMs behaves like an already-expired deadline (times out)", async () => {
    const step = createStep<number, string>(
      "neg-timeout",
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return "too late";
      },
      undefined,
      { timeoutMs: -1 },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    expect(err).toBeInstanceOf(StepTimeoutError);
    expect((err as StepTimeoutError).timeoutMs).toBe(-1);
  });
});

// =============================================================================
// step/execute — retry exhaustion: step surfaces last error, engineState records
// the MaxRetriesExceededError so the WORKFLOW boundary can surface it.
// =============================================================================

describe("step/execute: retry exhaustion records MaxRetriesExceededError", () => {
  it("on exhaustion the step itself fails with the LAST original error", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "always-fail",
      async () => {
        calls++;
        throw new Error(`fail-${calls}`);
      },
      undefined,
      { retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 5 } },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    // The step boundary keeps the original StepExecutionError (NOT MaxRetries).
    expect(err).toBeInstanceOf(StepExecutionError);
    expect(err).not.toBeInstanceOf(MaxRetriesExceededError);
    // 1 initial + 2 retries
    expect(calls).toBe(3);
  });

  it("records a MaxRetriesExceededError on engineState when attempts exceed maxAttempts", async () => {
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
    };
    const c: WorkflowContext = { ...ctx(), engineState };

    const step = createStep<number, string>(
      "exhaust",
      async () => {
        throw new Error("permanent");
      },
      undefined,
      { retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 5 } },
    );
    await runScoped(executeStep(step, 1, c));

    expect(engineState!.retriesExceeded).toBeInstanceOf(
      MaxRetriesExceededError,
    );
    expect(engineState!.retriesExceeded!.maxRetries).toBe(2);
    expect(engineState!.retriesExceeded!.stepName).toBe("exhaust");
    // lastError is threaded through as the cause.
    expect(
      (engineState!.retriesExceeded!.cause as StepExecutionError).message,
    ).toBe("permanent");
  });

  it("does NOT record retriesExceeded when isRetryable stops retries early (not exhaustion)", async () => {
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
    };
    const c: WorkflowContext = { ...ctx(), engineState };

    let calls = 0;
    const step = createStep<number, string>(
      "non-retryable-stop",
      async () => {
        calls++;
        throw new Error("nope");
      },
      undefined,
      {
        retry: { maxAttempts: 5, initialDelayMs: 1, isRetryable: () => false },
      },
    );
    await runScoped(executeStep(step, 1, c));

    // Only the first attempt ran; maxAttempts was never exhausted.
    expect(calls).toBe(1);
    expect(engineState!.retriesExceeded).toBeUndefined();
  });
});

// =============================================================================
// step/execute — timeoutMs applies PER ATTEMPT and a timeout is retryable
// =============================================================================

describe("step/execute: per-attempt timeout is retryable", () => {
  it("retries a timed-out attempt; a later fast attempt succeeds (fresh budget per attempt)", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "timeout-then-ok",
      async () => {
        calls++;
        if (calls === 1) {
          // First attempt blows the 25ms budget.
          await new Promise((r) => setTimeout(r, 100));
          return "too late";
        }
        return "recovered";
      },
      undefined,
      { timeoutMs: 25, retry: { maxAttempts: 2, initialDelayMs: 1 } },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("recovered");
    // Attempt 2 ran and completed — if the timeout were cumulative across
    // attempts, the second attempt would have had no budget left.
    expect(calls).toBe(2);
  });

  it("exhaustion by repeated timeouts records MaxRetriesExceededError with the StepTimeoutError cause", async () => {
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
    };
    const c: WorkflowContext = { ...ctx(), engineState };
    let calls = 0;
    const step = createStep<number, string>(
      "always-timeout",
      async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 100));
        return "never";
      },
      undefined,
      { timeoutMs: 10, retry: { maxAttempts: 1, initialDelayMs: 1 } },
    );
    const exit = await runScoped(executeStep(step, 1, c));
    const err = squashError(exit);

    // 1 initial + 1 retry, each burned by its own per-attempt timeout.
    expect(calls).toBe(2);
    // The step boundary keeps the LAST StepTimeoutError...
    expect(err).toBeInstanceOf(StepTimeoutError);
    expect((err as StepTimeoutError).timeoutMs).toBe(10);
    // ...while engineState records the exhaustion, cause = the timeout error.
    expect(engineState.retriesExceeded).toBeInstanceOf(MaxRetriesExceededError);
    expect(engineState.retriesExceeded!.maxRetries).toBe(1);
    expect(engineState.retriesExceeded!.cause).toBeInstanceOf(StepTimeoutError);
  });

  it("timeout exhaustion surfaces MAX_RETRIES_EXCEEDED at the workflow boundary", async () => {
    const step = createStep<number, string>(
      "wf-timeout-exhaust",
      async () => {
        await new Promise((r) => setTimeout(r, 100));
        return "never";
      },
      undefined,
      { timeoutMs: 10, retry: { maxAttempts: 1, initialDelayMs: 1 } },
    );
    const wf = createWorkflow<number, string>(
      "timeout-exhaust-wf",
      (input, c) => executeStep(step, input, c),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(MaxRetriesExceededError);
      expect(res.error.code).toBe("MAX_RETRIES_EXCEEDED");
      expect(
        (res.error as MaxRetriesExceededError).cause,
      ).toBeInstanceOf(StepTimeoutError);
    }
  });
});

// =============================================================================
// step/execute — `idempotent: false` gates automatic retries
// =============================================================================

describe("step/execute: idempotent gates retries", () => {
  it("a non-idempotent step is NOT retried — the first failure propagates", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "non-idem",
      async () => {
        calls++;
        throw new Error("side effect may have happened");
      },
      undefined,
      { idempotent: false, retry: { maxAttempts: 3, initialDelayMs: 1 } },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));
    const err = squashError(exit);

    expect(calls).toBe(1);
    expect(err).toBeInstanceOf(StepExecutionError);
  });

  it("an idempotent (default) step with the same retry policy IS retried", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "idem-default",
      async () => {
        calls++;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      undefined,
      { retry: { maxAttempts: 3, initialDelayMs: 1 } },
    );
    const exit = await runScoped(executeStep(step, 1, ctx()));

    expect(calls).toBe(3);
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("ok");
  });

  it("suppressed retries never record retriesExceeded on engineState", async () => {
    const engineState: WorkflowEngineState = {
      compensationsRun: 0,
      compensationsFailed: 0,
    };
    const c: WorkflowContext = { ...ctx(), engineState };
    const step = createStep<number, string>(
      "non-idem-state",
      async () => {
        throw new Error("no");
      },
      undefined,
      { idempotent: false, retry: { maxAttempts: 5, initialDelayMs: 1 } },
    );
    await runScoped(executeStep(step, 1, c));

    expect(engineState.retriesExceeded).toBeUndefined();
  });

  it("a per-call override can mark a single invocation non-idempotent", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "override-non-idem",
      async () => {
        calls++;
        throw new Error("no");
      },
      undefined,
      { retry: { maxAttempts: 2, initialDelayMs: 1 } },
    );
    await runScoped(executeStep(step, 1, ctx(), { idempotent: false }));

    expect(calls).toBe(1);
  });

  it("a non-idempotent failure goes straight to the compensation path", async () => {
    let invoked = 0;
    const compensated: string[] = [];
    const a = createStep<number, number>(
      "A",
      async (n) => new StepResponse(n, n),
      async () => {
        compensated.push("A");
      },
    );
    const boom = createStep<number, number>(
      "boom-non-idem",
      async () => {
        invoked++;
        throw new Error("charged the card, maybe");
      },
      undefined,
      { idempotent: false, retry: { maxAttempts: 5, initialDelayMs: 1 } },
    );
    const wf = createWorkflow<number, number>("non-idem-comp", (input, wctx) =>
      Effect.gen(function* () {
        const x = yield* executeStep(a, input, wctx);
        return yield* executeStep(boom, x, wctx);
      }),
    );
    const res = await wf.execute(1);

    expect(invoked).toBe(1);
    expect(compensated).toEqual(["A"]);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.compensated).toBe(true);
      // Retries were suppressed, not exhausted — the plain step error surfaces.
      expect(res.error.code).toBe("STEP_EXECUTION_FAILED");
    }
  });
});

// =============================================================================
// workflow/execute — MAX_RETRIES_EXCEEDED surfaces at the workflow boundary
// =============================================================================

describe("workflow/execute: MAX_RETRIES_EXCEEDED at boundary", () => {
  it("surfaces MaxRetriesExceededError (not the raw step error) when retries are exhausted", async () => {
    let calls = 0;
    const step = createStep<number, string>(
      "flaky-exhaust",
      async () => {
        calls++;
        throw new Error("still broken");
      },
      undefined,
      { retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 5 } },
    );
    const wf = createWorkflow<number, string>("exhaust-wf", (input, c) =>
      executeStep(step, input, c),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(MaxRetriesExceededError);
      expect(res.error.code).toBe("MAX_RETRIES_EXCEEDED");
      expect(res.error.message).toBe(
        "Step 'flaky-exhaust' failed after 2 retries",
      );
    }
    expect(calls).toBe(3);
  });

  it("a non-exhaustion failure keeps the plain StepExecutionError code", async () => {
    const step = createStep<number, string>("hard-fail", async () => {
      throw new Error("immediate");
    });
    const wf = createWorkflow<number, string>("plain-fail-wf", (input, c) =>
      executeStep(step, input, c),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(StepExecutionError);
      expect(res.error.code).toBe("STEP_EXECUTION_FAILED");
    }
  });
});

// =============================================================================
// workflow/execute — compensation reverse order with 3 steps + a throwing
// compensation in the middle (logged, counted, not swallowed into success)
// =============================================================================

describe("workflow/execute: compensation ordering & failure handling", () => {
  it("runs compensations in strict reverse registration order (3 steps)", async () => {
    const order: string[] = [];
    const mk = (name: string) =>
      createStep<number, number>(
        name,
        async (n) => new StepResponse(n + 1, n + 1),
        async () => {
          order.push(name);
        },
      );
    const a = mk("A");
    const b = mk("B");
    const c = mk("C");
    const boom = createStep<number, number>("boom", async () => {
      throw new Error("explode");
    });

    const wf = createWorkflow<number, number>("rev3", (input, wctx) =>
      Effect.gen(function* () {
        const x = yield* executeStep(a, input, wctx);
        const y = yield* executeStep(b, x, wctx);
        const z = yield* executeStep(c, y, wctx);
        return yield* executeStep(boom, z, wctx);
      }),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    // Reverse of registration order A,B,C -> C,B,A.
    expect(order).toEqual(["C", "B", "A"]);
    if (!res.success) {
      expect(res.compensated).toBe(true);
      expect(res.compensationsFailed).toBe(0);
    }
  });

  it("a throwing compensation is logged + counted but does not mask the primary error nor abort sibling compensations", async () => {
    const order: string[] = [];
    const stepA = createStep<number, number>(
      "A",
      async (n) => new StepResponse(n, n),
      async () => {
        order.push("A-comp");
      },
    );
    const stepB = createStep<number, number>(
      "B",
      async (n) => new StepResponse(n, n),
      async () => {
        order.push("B-comp-throws");
        throw new Error("rollback B failed");
      },
    );
    const boom = createStep<number, number>("boom", async () => {
      throw new Error("primary failure");
    });

    const wf = createWorkflow<number, number>("comp-throw", (input, wctx) =>
      Effect.gen(function* () {
        const x = yield* executeStep(stepA, input, wctx);
        const y = yield* executeStep(stepB, x, wctx);
        return yield* executeStep(boom, y, wctx);
      }),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      // Primary failure is preserved, NOT the compensation error.
      expect(res.error.message).toBe("primary failure");
      // B's compensation threw -> counted as failed.
      expect(res.compensationsFailed).toBe(1);
      // A's compensation still ran (B's throw did not abort the rollback chain),
      // so compensated is true (at least one ran).
      expect(res.compensated).toBe(true);
    }
    // Reverse order: B (throws) then A (still runs).
    expect(order).toEqual(["B-comp-throws", "A-comp"]);
  });

  it("when EVERY compensation throws, compensated is false but the primary error survives", async () => {
    const stepA = createStep<number, number>(
      "A",
      async (n) => new StepResponse(n, n),
      async () => {
        throw new Error("A rollback failed");
      },
    );
    const boom = createStep<number, number>("boom", async () => {
      throw new Error("the real failure");
    });
    const wf = createWorkflow<number, number>("all-comp-throw", (input, wctx) =>
      Effect.gen(function* () {
        const x = yield* executeStep(stepA, input, wctx);
        return yield* executeStep(boom, x, wctx);
      }),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toBe("the real failure");
      // No compensation succeeded.
      expect(res.compensated).toBe(false);
      expect(res.compensationsFailed).toBe(1);
    }
  });
});

// =============================================================================
// step/execute — retry predicate sees the ORIGINAL error (unwrapped)
// =============================================================================

describe("step/execute: isRetryable receives the original error", () => {
  it("hands the predicate the thrown Error, not the StepExecutionError wrapper", async () => {
    const seen: unknown[] = [];
    const sentinel = new Error("original-cause");
    const step = createStep<number, string>(
      "predicate-arg",
      async () => {
        throw sentinel;
      },
      undefined,
      {
        retry: {
          maxAttempts: 2,
          initialDelayMs: 1,
          isRetryable: (e) => {
            seen.push(e);
            return false; // stop after first
          },
        },
      },
    );
    await runScoped(executeStep(step, 1, ctx()));

    expect(seen.length).toBe(1);
    // Exact identity: the original thrown error, not a wrapper.
    expect(seen[0]).toBe(sentinel);
    expect(seen[0]).not.toBeInstanceOf(StepExecutionError);
  });

  it("for a timeout, the predicate receives the StepTimeoutError itself (no underlying cause)", async () => {
    const seen: unknown[] = [];
    const step = createStep<number, string>(
      "timeout-predicate",
      async () => {
        await new Promise((r) => setTimeout(r, 100));
        return "late";
      },
      undefined,
      {
        timeoutMs: 10,
        retry: {
          maxAttempts: 2,
          initialDelayMs: 1,
          isRetryable: (e) => {
            seen.push(e);
            return false;
          },
        },
      },
    );
    await runScoped(executeStep(step, 1, ctx()));

    expect(seen.length).toBe(1);
    expect(seen[0]).toBeInstanceOf(StepTimeoutError);
  });
});

// =============================================================================
// workflow/execute — defect (raw throw) wrapping into WORKFLOW_FAILED
// =============================================================================

describe("workflow/execute: non-WorkflowError wrapping", () => {
  it("wraps a non-Error rejection value into a WORKFLOW_FAILED WorkflowError with String() message", async () => {
    const wf = createWorkflow<number, number>("string-fail", () =>
      Effect.fail("just a string" as unknown as WorkflowError),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(WorkflowError);
      expect(res.error.code).toBe("WORKFLOW_FAILED");
      expect(res.error.message).toBe("just a string");
      // The raw value is preserved as the cause.
      expect(res.error.cause).toBe("just a string");
    }
  });
});

// =============================================================================
// step/execute — resolveStepConfig fallback for steps without rawConfig
// =============================================================================

describe("step/execute: step built without rawConfig", () => {
  // Steps constructed outside createStep don't carry `rawConfig`; the resolver
  // must fall back to the step's pre-merged `config` and skip workflow-level
  // layering, while still honouring a per-call override.

  it("uses the step's pre-merged config verbatim when there is no override", async () => {
    const step = createStep<number, number>(
      "no-raw",
      async (n) => n + 1,
      undefined,
      {
        timeoutMs: 1234,
      },
    );
    // Simulate a step assembled outside createStep.
    delete (step as { rawConfig?: unknown }).rawConfig;

    const exit = await runScoped(executeStep(step, 1, ctx()));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe(2);
  });

  it("layers a per-call override on top of the step's config (no rawConfig)", async () => {
    const step = createStep<number, number>(
      "no-raw-override",
      async (n) => n + 1,
      undefined,
      { timeoutMs: 5000, retry: { maxAttempts: 1 } },
    );
    delete (step as { rawConfig?: unknown }).rawConfig;

    // Wrap invoke to observe the timeout actually used would require internals;
    // instead we simply assert the override path runs and the step still works.
    const exit = await runScoped(
      executeStep(step, 1, ctx(), {
        timeoutMs: 9999,
        retry: { maxAttempts: 2 },
      }),
    );
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe(2);
  });
});
