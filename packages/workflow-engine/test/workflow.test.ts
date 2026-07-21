import { describe, it, expect, mock, beforeEach } from "bun:test";

// -----------------------------------------------------------------------------
// createWorkflow transitively imports the lock module (-> @damatjs/redis) for
// executeWithLock. Mock redis so executeWithLock never touches a live server.
// state.acquireResult controls whether the lock is granted.
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

import { Effect } from "@damatjs/deps/effect";
import { createWorkflow } from "../src/workflow";
import { createStep, executeStep, StepResponse } from "../src/step";
import { runStep, parallel, when, skipStep } from "../src/utils";
import {
  WorkflowError,
  WorkflowLockError,
  StepExecutionError,
} from "../src/index";
import type { WorkflowContext } from "../src/types";

beforeEach(() => {
  state.acquireResult = "lock-value";
  state.releaseResult = true;
  acquireLock.mockClear();
  releaseLock.mockClear();
  getRedis.mockClear();
});

// =============================================================================
// workflow/create — config merging & shape
// =============================================================================

describe("workflow/create: createWorkflow shape", () => {
  it("returns a definition with name, merged config, execute & executeWithLock", () => {
    const wf = createWorkflow<number, number>("wf", (n) => Effect.succeed(n));
    expect(wf.name).toBe("wf");
    expect(typeof wf.execute).toBe("function");
    expect(typeof wf.executeWithLock).toBe("function");
    expect(wf.config.timeoutMs).toBe(300_000); // default
    expect(wf.config.defaultStepConfig.timeoutMs).toBe(30_000);
  });

  it("merges custom timeoutMs and deep-merges defaultStepConfig.retry", () => {
    const wf = createWorkflow<number, number>("wf", (n) => Effect.succeed(n), {
      timeoutMs: 1000,
      defaultStepConfig: { retry: { maxAttempts: 4 } },
    });
    expect(wf.config.timeoutMs).toBe(1000);
    expect(wf.config.defaultStepConfig.retry.maxAttempts).toBe(4);
    // inherited default retry fields
    expect(wf.config.defaultStepConfig.retry.backoffMultiplier).toBe(2);
  });
});

// =============================================================================
// workflow/execute — success (no lock)
// =============================================================================

describe("workflow/execute: success", () => {
  it("returns a success result with output, executionId and durationMs", async () => {
    const wf = createWorkflow<number, number>("double", (n) =>
      Effect.succeed(n * 2),
    );
    const res = await wf.execute(21);

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.result).toBe(42);
      expect(typeof res.executionId).toBe("string");
      expect(res.executionId.length).toBeGreaterThan(0);
      expect(res.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("executes steps sequentially and threads output between them", async () => {
    const order: string[] = [];
    const stepA = createStep<number, number>("A", async (n) => {
      order.push("A");
      return n + 1;
    });
    const stepB = createStep<number, number>("B", async (n) => {
      order.push("B");
      return n * 10;
    });
    const wf = createWorkflow<number, number>("seq", (input, ctx) =>
      Effect.gen(function* () {
        const a = yield* executeStep(stepA, input, ctx);
        const b = yield* executeStep(stepB, a, ctx);
        return b;
      }),
    );
    const res = await wf.execute(4);

    expect(res.success).toBe(true);
    if (res.success) expect(res.result).toBe(50); // (4+1)*10
    expect(order).toEqual(["A", "B"]);
  });

  it("propagates metadata into the workflow context", async () => {
    let seenCtx: WorkflowContext | undefined;
    const probe = createStep<number, number>("probe", async (n, ctx) => {
      seenCtx = ctx;
      return n;
    });
    const wf = createWorkflow<number, number>("meta", (input, ctx) =>
      executeStep(probe, input, ctx),
    );
    await wf.execute(1, { tenant: "acme", trace: 99 });

    expect(seenCtx?.metadata).toEqual({ tenant: "acme", trace: 99 });
    expect(seenCtx?.workflowName).toBe("meta");
  });
});

// =============================================================================
// workflow/execute — failure & compensation
// =============================================================================

describe("workflow/execute: failure & compensation", () => {
  it("returns failure with the WorkflowError and compensated:false when nothing was compensated", async () => {
    const wf = createWorkflow<number, number>("boom", () =>
      Effect.fail(
        new StepExecutionError("s", "step blew up", undefined, "boom"),
      ),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(WorkflowError);
      expect(res.error.message).toBe("step blew up");
      // No step ran, so no compensation executed — compensated reflects reality.
      expect(res.compensated).toBe(false);
      expect(res.compensationsFailed).toBe(0);
    }
  });

  it("wraps a non-WorkflowError defect into a generic WORKFLOW_FAILED error", async () => {
    const wf = createWorkflow<number, number>("defect", () =>
      // bypass typing to simulate a raw failure leaking through
      Effect.fail(new Error("raw failure") as unknown as WorkflowError),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(WorkflowError);
      expect(res.error.code).toBe("WORKFLOW_FAILED");
      expect(res.error.message).toBe("raw failure");
    }
  });

  it("runs compensation for completed steps when a later step fails (saga rollback)", async () => {
    const events: string[] = [];
    const stepA = createStep<number, string, string>(
      "A",
      async () => {
        events.push("A-run");
        // output flows downstream; the 2nd arg is the rollback payload the
        // compensation will receive.
        return new StepResponse("a-out", "a-out");
      },
      async (compensateInput) => {
        events.push(`A-comp(${compensateInput})`);
      },
    );
    const stepB = createStep<string, string>(
      "B",
      async () => {
        events.push("B-run");
        throw new Error("B failed");
      },
      async () => {
        events.push("B-comp");
      },
    );
    const wf = createWorkflow<number, string>("saga", (input, ctx) =>
      Effect.gen(function* () {
        const a = yield* executeStep(stepA, input, ctx);
        return yield* executeStep(stepB, a, ctx);
      }),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    // A succeeded -> its compensation runs; B never produced output so its
    // finalizer is never registered (only registered after a successful result).
    expect(events).toEqual(["A-run", "B-run", "A-comp(a-out)"]);
    // No compensation failed, so the result carries an empty error list.
    if (!res.success) {
      expect(res.compensationsFailed).toBe(0);
      expect(res.compensationErrors).toEqual([]);
    }
  });

  it("surfaces failed compensations on the result via compensationErrors", async () => {
    const stepA = createStep<number, string, string>(
      "A",
      async () => new StepResponse("a-out", "a-out"),
      async () => {
        throw new Error("rollback A blew up");
      },
    );
    const stepB = createStep<string, string, string>(
      "B",
      async () => new StepResponse("b-out", "b-out"),
      async () => {
        /* compensates cleanly */
      },
    );
    const stepC = createStep<string, string>("C", async () => {
      throw new Error("C failed");
    });
    const wf = createWorkflow<number, string>("comp-errors", (input, ctx) =>
      Effect.gen(function* () {
        const a = yield* executeStep(stepA, input, ctx);
        const b = yield* executeStep(stepB, a, ctx);
        return yield* executeStep(stepC, b, ctx);
      }),
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      // The workflow's own error is still C's failure — compensation errors
      // never cascade or replace it.
      expect(res.error.message).toBe("C failed");
      // B compensated fine, A's compensation threw.
      expect(res.compensated).toBe(true);
      expect(res.compensationsFailed).toBe(1);
      expect(res.compensationErrors).toHaveLength(1);
      expect(res.compensationErrors[0]!.stepName).toBe("A");
      expect(res.compensationErrors[0]!.message).toContain(
        "rollback A blew up",
      );
    }
  });
});

// =============================================================================
// workflow/execute — workflow-level timeout
// =============================================================================

describe("workflow/execute: timeout", () => {
  it("fails with a WORKFLOW_TIMEOUT WorkflowError when the workflow exceeds timeoutMs", async () => {
    const slow = createStep<number, number>(
      "slow",
      async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 1;
      },
      undefined,
      { timeoutMs: 1000 },
    );
    const wf = createWorkflow<number, number>(
      "tmo",
      (input, ctx) => executeStep(slow, input, ctx),
      { timeoutMs: 20 },
    );
    const res = await wf.execute(1);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe("WORKFLOW_TIMEOUT");
      expect(res.error.message).toContain("timed out after 20ms");
    }
  });
});

// =============================================================================
// workflow/executeWithLock — using mocked redis
// =============================================================================

describe("workflow/executeWithLock", () => {
  it("acquires the lock, runs the workflow, then releases the lock", async () => {
    state.acquireResult = "lv-1";
    const wf = createWorkflow<number, number>("locked", (n) =>
      Effect.succeed(n + 1),
    );
    const res = await wf.executeWithLock(10, { lockId: "order-1" });

    expect(res.success).toBe(true);
    if (res.success) expect(res.result).toBe(11);
    expect(acquireLock).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledTimes(1);
    // executionId stays unique per execution (NOT the repeatable lockId); the
    // lockId is correlated separately via metadata (see test below).
    expect(typeof res.executionId).toBe("string");
    expect(res.executionId.length).toBeGreaterThan(0);
    expect(res.executionId).not.toBe("order-1");
  });

  it("releases the lock even when the workflow fails", async () => {
    state.acquireResult = "lv-2";
    const wf = createWorkflow<number, number>("locked-fail", () =>
      Effect.fail(
        new StepExecutionError("s", "fail", undefined, "locked-fail"),
      ),
    );
    const res = await wf.executeWithLock(1, { lockId: "order-2" });

    expect(res.success).toBe(false);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("returns a WorkflowLockError failure (without running) when lock is denied", async () => {
    state.acquireResult = null; // redis refuses the lock
    let ran = false;
    const wf = createWorkflow<number, number>("contended", (n) => {
      ran = true;
      return Effect.succeed(n);
    });
    const res = await wf.executeWithLock(1, { lockId: "busy", maxRetries: 0 });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(WorkflowLockError);
      expect(res.error.code).toBe("WORKFLOW_LOCKED");
      expect(res.compensated).toBe(false);
      expect(res.durationMs).toBe(0);
    }
    expect(ran).toBe(false);
    // No lock to release when acquisition failed
    expect(releaseLock).not.toHaveBeenCalled();
  });

  it("threads lockId into workflow metadata", async () => {
    state.acquireResult = "lv-3";
    let seenMeta: Record<string, unknown> | undefined;
    const probe = createStep<number, number>("p", async (n, ctx) => {
      seenMeta = ctx.metadata;
      return n;
    });
    const wf = createWorkflow<number, number>("meta-lock", (input, ctx) =>
      executeStep(probe, input, ctx),
    );
    await wf.executeWithLock(1, { lockId: "lock-abc" }, { extra: "x" });

    expect(seenMeta).toEqual({ extra: "x", lockId: "lock-abc" });
  });
});

// =============================================================================
// workflow + utils integration (parallel / when / skipStep within a workflow)
// =============================================================================

describe("workflow + utils integration", () => {
  it("parallel runs steps concurrently inside a workflow and aggregates results", async () => {
    // Barrier instead of sleep-overlap timing: only concurrent execution can
    // open it, so a loaded machine can't flake this (sequential = deadlock →
    // loud timeout failure).
    let started = 0;
    let release!: () => void;
    const allStarted = new Promise<void>((r) => (release = r));
    const mk = (name: string, val: number) =>
      createStep<void, number>(name, async () => {
        started++;
        if (started === 3) release();
        await allStarted;
        return val;
      });

    const wf = createWorkflow<void, { a: number; b: number; c: number }>(
      "par",
      (_input, ctx) =>
        Effect.gen(function* () {
          const [a, b, c] = yield* parallel(
            runStep(mk("a", 1), undefined as never, ctx),
            runStep(mk("b", 2), undefined as never, ctx),
            runStep(mk("c", 3), undefined as never, ctx),
          );
          return { a, b, c };
        }),
    );
    const res = await wf.execute(undefined as never);

    expect(res.success).toBe(true);
    if (res.success) expect(res.result).toEqual({ a: 1, b: 2, c: 3 });
    expect(started).toBe(3); // the barrier only opens when all ran concurrently
  });

  it("when() conditionally runs (true) or returns default (false) inside a workflow", async () => {
    let ran = 0;
    const step = createStep<number, string>("opt", async (n) => {
      ran++;
      return `ran-${n}`;
    });

    const wf = createWorkflow<{ flag: boolean }, string>("cond", (input, ctx) =>
      when(input.flag, step, 5, ctx, "default-value"),
    );

    const yes = await wf.execute({ flag: true });
    const no = await wf.execute({ flag: false });

    expect(yes.success && yes.result).toBe("ran-5");
    expect(no.success && no.result).toBe("default-value");
    expect(ran).toBe(1); // step only ran for the true branch
  });

  it("skipStep short-circuits with an immediate value", async () => {
    const wf = createWorkflow<boolean, { skipped: boolean }>("skip", (skip) =>
      skip ? skipStep({ skipped: true }) : Effect.succeed({ skipped: false }),
    );
    const res = await wf.execute(true);
    expect(res.success && res.result).toEqual({ skipped: true });
  });
});
