import { describe, it, expect, mock, beforeEach } from "bun:test";

// -----------------------------------------------------------------------------
// Mock @damatjs/redis BEFORE importing anything that touches locks. We mock the
// low-level helpers acquireLock/releaseLock and getRedis(). The workflow-engine
// extend/check wrappers call the real extendLock/isLocked, which in turn call
// getRedis() — so mocking getRedis intercepts those too (verified empirically).
// -----------------------------------------------------------------------------

const state: {
  acquireResults: (string | null)[];
  acquireThrows: boolean;
  releaseResult: boolean;
  releaseThrows: boolean;
  redisEvalResult: number;
  redisEvalThrows: boolean;
  redisGetValue: string | null;
} = {
  acquireResults: [],
  acquireThrows: false,
  releaseResult: true,
  releaseThrows: false,
  redisEvalResult: 1,
  redisEvalThrows: false,
  redisGetValue: null,
};

const acquireLock = mock(async (_key: string, _ttl: number) => {
  if (state.acquireThrows) throw new Error("redis connection lost");
  return state.acquireResults.length
    ? state.acquireResults.shift()!
    : "lock-value";
});
const releaseLock = mock(async (_key: string, _value: string) => {
  if (state.releaseThrows) throw new Error("redis connection lost");
  return state.releaseResult;
});
const redisEval = mock(async (..._args: unknown[]) => {
  if (state.redisEvalThrows) throw new Error("redis eval failed");
  return state.redisEvalResult;
});
const redisGet = mock(async (_key: string) => state.redisGetValue);
const getRedis = mock(() => ({ get: redisGet, eval: redisEval }));

mock.module("@damatjs/redis", () => ({ acquireLock, releaseLock, getRedis }));

import { Effect } from "@damatjs/deps/effect";
import { createWorkflow } from "../src/workflow";
import { createStep, executeStep } from "../src/step";
import {
  acquireWorkflowLock,
  releaseWorkflowLock,
  extendWorkflowLock,
  getLockKey,
} from "../src/lock";
import { StepExecutionError, WorkflowLockError } from "../src/index";

beforeEach(() => {
  state.acquireResults = [];
  state.acquireThrows = false;
  state.releaseResult = true;
  state.releaseThrows = false;
  state.redisEvalResult = 1;
  state.redisEvalThrows = false;
  state.redisGetValue = null;
  acquireLock.mockClear();
  releaseLock.mockClear();
  redisEval.mockClear();
  redisGet.mockClear();
  getRedis.mockClear();
});

// =============================================================================
// lock/acquire — retry/contention edge cases
// =============================================================================

describe("lock/acquire: contention edges", () => {
  it("maxRetries = 0 attempts exactly once and gives up immediately", async () => {
    state.acquireResults = [null];
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 0,
    });

    expect(res.acquired).toBe(false);
    expect(res.lockValue).toBeUndefined();
    expect(acquireLock).toHaveBeenCalledTimes(1);
  });

  it("succeeds on the very last allowed retry (maxRetries=2 -> 3rd attempt wins)", async () => {
    state.acquireResults = [null, null, "won-on-3"];
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 2,
      retryDelayMs: 0,
    });

    expect(res.acquired).toBe(true);
    expect(res.lockValue).toBe("won-on-3");
    expect(acquireLock).toHaveBeenCalledTimes(3);
  });

  it("does NOT call acquireLock again after success (short-circuits remaining retries)", async () => {
    state.acquireResults = ["immediate"];
    await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 5,
      retryDelayMs: 0,
    });
    expect(acquireLock).toHaveBeenCalledTimes(1);
  });

  it("empty string lock value is treated as a denial (falsy) and triggers retries", async () => {
    // acquireLock returning "" is falsy -> not acquired.
    state.acquireResults = ["" as unknown as string, "real"];
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 1,
      retryDelayMs: 0,
    });
    expect(res.acquired).toBe(true);
    expect(res.lockValue).toBe("real");
    expect(acquireLock).toHaveBeenCalledTimes(2);
  });

  it("waits ~retryDelayMs between attempts while the lock is held, then wins when it frees", async () => {
    // Held on attempts 1 and 2, freed by attempt 3 — the two inter-attempt
    // waits (~25ms each) must actually elapse (every other retry test uses 0).
    state.acquireResults = [null, null, "freed-up"];
    const start = Date.now();
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 2,
      retryDelayMs: 25,
    });
    const elapsed = Date.now() - start;

    expect(res.acquired).toBe(true);
    expect(res.lockValue).toBe("freed-up");
    expect(acquireLock).toHaveBeenCalledTimes(3);
    // Two denials -> two delays of ~25ms (allow timer slop).
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

// =============================================================================
// lock/release — idempotent semantics
// =============================================================================

describe("lock/release: edges", () => {
  it("returns false (not throw) when the lock was already released/expired", async () => {
    state.releaseResult = false;
    const ok = await releaseWorkflowLock("wf", "id", "stale");
    expect(ok).toBe(false);
    expect(releaseLock).toHaveBeenCalledTimes(1);
    // The stale/wrong token is passed through verbatim to redis releaseLock —
    // the compare-and-delete decision belongs to redis, never the wrapper.
    expect(releaseLock).toHaveBeenCalledWith(getLockKey("wf", "id"), "stale");
  });
});

// =============================================================================
// lock/extend — via the mocked redis eval script
// =============================================================================

describe("lock/extend: edges", () => {
  it("returns false when the script reports the lock is no longer held (eval -> 0)", async () => {
    state.redisEvalResult = 0;
    const ok = await extendWorkflowLock("wf", "id", "lock-value", 60000);
    expect(ok).toBe(false);
  });

  it("returns true when the script reports a successful extension (eval -> 1)", async () => {
    state.redisEvalResult = 1;
    const ok = await extendWorkflowLock("wf", "id", "lock-value", 60000);
    expect(ok).toBe(true);
  });
});

// =============================================================================
// workflow/executeWithLock — contention, release-on-failure, autoExtend
// =============================================================================

describe("workflow/executeWithLock: edges", () => {
  it("releases the lock even when the workflow body throws", async () => {
    state.acquireResults = ["lv"];
    const wf = createWorkflow<number, number>("locked-throw", () =>
      Effect.fail(
        new StepExecutionError("s", "boom", undefined, "locked-throw"),
      ),
    );
    const res = await wf.executeWithLock(1, { lockId: "id" });

    expect(res.success).toBe(false);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("does NOT release (nothing to release) when acquisition was denied", async () => {
    state.acquireResults = [null];
    let ran = false;
    const wf = createWorkflow<number, number>("contended", (n) => {
      ran = true;
      return Effect.succeed(n);
    });
    const res = await wf.executeWithLock(1, { lockId: "busy", maxRetries: 0 });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(WorkflowLockError);
      expect(res.durationMs).toBe(0);
    }
    expect(ran).toBe(false);
    expect(releaseLock).not.toHaveBeenCalled();
  });

  it("returns a structured failure (never throws) when the lock backend is down", async () => {
    // acquireLock throwing (e.g. Redis unreachable) must not escape
    // executeWithLock as a raw rejection — it resolves to a WorkflowResult.
    state.acquireThrows = true;
    let ran = false;
    const wf = createWorkflow<number, number>("lock-backend-down", (n) => {
      ran = true;
      return Effect.succeed(n);
    });
    const res = await wf.executeWithLock(1, { lockId: "id" });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBeInstanceOf(Error);
      // Distinct from WorkflowLockError (contention) — this is an infra outage.
      expect((res.error as { code?: string }).code).toBe(
        "LOCK_BACKEND_UNAVAILABLE",
      );
      expect(res.error.message).toContain("redis connection lost");
      expect((res.error as { cause?: unknown }).cause).toBeInstanceOf(Error);
      expect(res.durationMs).toBe(0);
      expect(res.compensated).toBe(false);
    }
    expect(ran).toBe(false);
    expect(releaseLock).not.toHaveBeenCalled();
  });

  it("autoExtend fires the heartbeat (extendLock via redis eval) during a long run", async () => {
    state.acquireResults = ["lv"];
    state.redisEvalResult = 1;
    // Workflow runs ~600ms; heartbeat interval = max(1000, ttl/2) = 1000ms for a
    // 2000ms ttl... too slow. Use a ttl whose half is small but >= 1000 floor is
    // enforced, so instead make the run long enough for one tick at the 1s floor.
    const slow = createStep<number, number>(
      "slow",
      async () => {
        await new Promise((r) => setTimeout(r, 1200));
        return 1;
      },
      undefined,
      { timeoutMs: 5000 },
    );
    const wf = createWorkflow<number, number>(
      "auto-extend",
      (input, ctx) => executeStep(slow, input, ctx),
      { timeoutMs: 5000 },
    );
    await wf.executeWithLock(1, {
      lockId: "id",
      ttlMs: 2000,
      autoExtend: true,
    });

    // Heartbeat at ttl/2 = 1000ms fires at least once during the 1.2s run.
    expect(redisEval).toHaveBeenCalled();
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("logs a warning when an autoExtend heartbeat fails to extend the lock", async () => {
    state.acquireResults = ["lv"];
    // eval -> 0 means the extension script reports the lock is no longer held,
    // so extendWorkflowLock resolves false and the heartbeat takes the warn path.
    state.redisEvalResult = 0;
    const slow = createStep<number, number>(
      "slow-extend-fail",
      async () => {
        await new Promise((r) => setTimeout(r, 1200));
        return 1;
      },
      undefined,
      { timeoutMs: 5000 },
    );
    const wf = createWorkflow<number, number>(
      "auto-extend-fail",
      (input, ctx) => executeStep(slow, input, ctx),
      { timeoutMs: 5000 },
    );
    const res = await wf.executeWithLock(1, {
      lockId: "id",
      ttlMs: 2000,
      autoExtend: true,
    });

    // The failed extension only warns; the workflow still completes and the
    // lock is released in the finally block.
    expect(redisEval).toHaveBeenCalled();
    expect(res.success).toBe(true);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("swallows a rejected autoExtend heartbeat without failing the workflow", async () => {
    state.acquireResults = ["lv"];
    // The redis eval rejects, so extendWorkflowLock rejects and the heartbeat's
    // rejection handler (a deliberate no-op) is exercised.
    state.redisEvalThrows = true;
    const slow = createStep<number, number>(
      "slow-extend-reject",
      async () => {
        await new Promise((r) => setTimeout(r, 1200));
        return 1;
      },
      undefined,
      { timeoutMs: 5000 },
    );
    const wf = createWorkflow<number, number>(
      "auto-extend-reject",
      (input, ctx) => executeStep(slow, input, ctx),
      { timeoutMs: 5000 },
    );
    const res = await wf.executeWithLock(1, {
      lockId: "id",
      ttlMs: 2000,
      autoExtend: true,
    });

    expect(redisEval).toHaveBeenCalled();
    // The rejected extension is swallowed; the workflow still succeeds.
    expect(res.success).toBe(true);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("autoExtend defaults ON: the heartbeat fires with no explicit autoExtend", async () => {
    state.acquireResults = ["lv"];
    state.redisEvalResult = 1;
    const slow = createStep<number, number>(
      "slow-default-ext",
      async () => {
        await new Promise((r) => setTimeout(r, 1200));
        return 1;
      },
      undefined,
      { timeoutMs: 5000 },
    );
    const wf = createWorkflow<number, number>(
      "default-auto-extend",
      (input, ctx) => executeStep(slow, input, ctx),
      { timeoutMs: 5000 },
    );
    // No autoExtend in the config — the default keeps the lock alive.
    await wf.executeWithLock(1, { lockId: "id", ttlMs: 2000 });

    expect(redisEval).toHaveBeenCalled();
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it("autoExtend: false disables the heartbeat (no extend calls)", async () => {
    state.acquireResults = ["lv"];
    const slow = createStep<number, number>(
      "slow-no-ext",
      async () => {
        await new Promise((r) => setTimeout(r, 1200));
        return 1;
      },
      undefined,
      { timeoutMs: 5000 },
    );
    const wf = createWorkflow<number, number>(
      "no-auto-extend",
      (input, ctx) => executeStep(slow, input, ctx),
      { timeoutMs: 5000 },
    );
    await wf.executeWithLock(1, {
      lockId: "id",
      ttlMs: 2000,
      autoExtend: false,
    });

    expect(redisEval).not.toHaveBeenCalled();
  });

  it("a throwing lock release does NOT discard a successful workflow result", async () => {
    state.acquireResults = ["lv"];
    state.releaseThrows = true;
    const wf = createWorkflow<number, number>("release-throws", (n) =>
      Effect.succeed(n + 1),
    );
    const res = await wf.executeWithLock(1, { lockId: "id" });

    // The release failure is logged and swallowed — the lock expires via TTL.
    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(res.success).toBe(true);
    if (res.success) expect(res.result).toBe(2);
  });

  it("a throwing lock release does not mask a workflow FAILURE result either", async () => {
    state.acquireResults = ["lv"];
    state.releaseThrows = true;
    const wf = createWorkflow<number, number>("release-throws-fail", () =>
      Effect.fail(
        new StepExecutionError("s", "boom", undefined, "release-throws-fail"),
      ),
    );
    const res = await wf.executeWithLock(1, { lockId: "id" });

    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBeInstanceOf(StepExecutionError);
  });

  it("threads the resolved lockId into workflow metadata", async () => {
    state.acquireResults = ["lv"];
    let seenMeta: Record<string, unknown> | undefined;
    const probe = createStep<number, number>("p", async (n, ctx) => {
      seenMeta = ctx.metadata;
      return n;
    });
    const wf = createWorkflow<number, number>("meta-thread", (input, ctx) =>
      executeStep(probe, input, ctx),
    );
    await wf.executeWithLock(1, { lockId: "biz-123" }, { user: "u1" });

    expect(seenMeta).toEqual({ user: "u1", lockId: "biz-123" });
  });
});
