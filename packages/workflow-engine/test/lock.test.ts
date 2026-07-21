import { describe, it, expect, mock, beforeEach } from "bun:test";

// -----------------------------------------------------------------------------
// Mock @damatjs/redis BEFORE importing the lock module under test.
// No live Redis: acquireLock/releaseLock and the getRedis() client are fakes
// whose behavior we control per-test via the `state` object.
// -----------------------------------------------------------------------------

const state: {
  acquireResults: (string | null)[]; // queued return values for acquireLock
  releaseResult: boolean;
  redisGetValue: string | null;
  redisEvalResult: number;
} = {
  acquireResults: [],
  releaseResult: true,
  redisGetValue: null,
  redisEvalResult: 1,
};

const acquireLock = mock(async (_key: string, _ttl: number) => {
  // Pop the next queued result; default to a successful lock value.
  return state.acquireResults.length
    ? state.acquireResults.shift()!
    : "lock-value-default";
});

const releaseLock = mock(
  async (_key: string, _value: string) => state.releaseResult,
);

const redisGet = mock(async (_key: string) => state.redisGetValue);
const redisEval = mock(
  async (_script: string, ..._args: unknown[]) => state.redisEvalResult,
);
const getRedis = mock(() => ({ get: redisGet, eval: redisEval }));

mock.module("@damatjs/redis", () => ({
  acquireLock,
  releaseLock,
  getRedis,
}));

import {
  acquireWorkflowLock,
  releaseWorkflowLock,
  extendWorkflowLock,
  isWorkflowLocked,
  getLockKey,
  delay,
  WORKFLOW_LOCK_PREFIX,
  DEFAULT_LOCK_TTL_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
} from "../src/lock";

beforeEach(() => {
  state.acquireResults = [];
  state.releaseResult = true;
  state.redisGetValue = null;
  state.redisEvalResult = 1;
  acquireLock.mockClear();
  releaseLock.mockClear();
  redisGet.mockClear();
  redisEval.mockClear();
  getRedis.mockClear();
});

// =============================================================================
// lock/utils & constants
// =============================================================================

describe("lock/utils: getLockKey", () => {
  it("composes prefix:workflow:lockId", () => {
    expect(getLockKey("process-order", "abc123")).toBe(
      `${WORKFLOW_LOCK_PREFIX}process-order:abc123`,
    );
    expect(WORKFLOW_LOCK_PREFIX).toBe("workflow-lock:");
  });
});

describe("lock/constants", () => {
  it("exposes documented defaults", () => {
    expect(DEFAULT_LOCK_TTL_MS).toBe(300_000);
    expect(DEFAULT_MAX_RETRIES).toBe(0);
    expect(DEFAULT_RETRY_DELAY_MS).toBe(100);
  });
});

describe("lock/utils: delay", () => {
  it("resolves after roughly the requested time", async () => {
    const start = Date.now();
    await delay(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(8);
  });
});

// =============================================================================
// lock/acquire
// =============================================================================

describe("lock/acquire: acquireWorkflowLock", () => {
  it("returns acquired result when redis grants the lock", async () => {
    state.acquireResults = ["my-lock-value"];
    const res = await acquireWorkflowLock("wf", { lockId: "id-1" });

    expect(res.acquired).toBe(true);
    expect(res.lockId).toBe("id-1");
    expect(res.lockValue).toBe("my-lock-value");
    expect(res.lockKey).toBe(getLockKey("wf", "id-1"));
    expect(acquireLock).toHaveBeenCalledTimes(1);
    // Called with the full lock key and the requested TTL
    expect(acquireLock).toHaveBeenCalledWith(
      getLockKey("wf", "id-1"),
      DEFAULT_LOCK_TTL_MS,
    );
  });

  it("generates a random lockId when none is supplied", async () => {
    state.acquireResults = ["v"];
    const res = await acquireWorkflowLock("wf");
    expect(res.lockId).toBeTruthy();
    expect(typeof res.lockId).toBe("string");
    expect(res.lockKey).toContain(res.lockId);
  });

  it("passes a custom TTL through to redis acquireLock", async () => {
    state.acquireResults = ["v"];
    await acquireWorkflowLock("wf", { lockId: "id", ttlMs: 12345 });
    expect(acquireLock).toHaveBeenCalledWith(getLockKey("wf", "id"), 12345);
  });

  it("fails (acquired: false, no lockValue) when redis denies and no retries", async () => {
    state.acquireResults = [null];
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 0,
    });

    expect(res.acquired).toBe(false);
    expect(res.lockValue).toBeUndefined();
    expect(res.lockId).toBe("id");
    expect(res.lockKey).toBe(getLockKey("wf", "id"));
    expect(acquireLock).toHaveBeenCalledTimes(1); // attempt 0 only
  });

  it("retries up to maxRetries then gives up (attempts = maxRetries + 1)", async () => {
    state.acquireResults = [null, null, null]; // always denied
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 2,
      retryDelayMs: 0, // keep test instant
    });

    expect(res.acquired).toBe(false);
    // initial attempt + 2 retries = 3 calls
    expect(acquireLock).toHaveBeenCalledTimes(3);
  });

  it("succeeds on a later retry attempt", async () => {
    state.acquireResults = [null, null, "won-it"]; // succeed on 3rd try
    const res = await acquireWorkflowLock("wf", {
      lockId: "id",
      maxRetries: 5,
      retryDelayMs: 0,
    });

    expect(res.acquired).toBe(true);
    expect(res.lockValue).toBe("won-it");
    expect(acquireLock).toHaveBeenCalledTimes(3);
  });
});

// =============================================================================
// lock/release
// =============================================================================

describe("lock/release: releaseWorkflowLock", () => {
  it("delegates to redis releaseLock with the full key + value, returns true", async () => {
    state.releaseResult = true;
    const ok = await releaseWorkflowLock("wf", "id", "lock-value");

    expect(ok).toBe(true);
    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(releaseLock).toHaveBeenCalledWith(
      getLockKey("wf", "id"),
      "lock-value",
    );
  });

  it("returns false when the lock was not held / already expired", async () => {
    state.releaseResult = false;
    const ok = await releaseWorkflowLock("wf", "id", "stale-value");
    expect(ok).toBe(false);
  });
});

// =============================================================================
// lock/check
// =============================================================================

describe("lock/check: isWorkflowLocked", () => {
  it("returns true when redis has a value at the prefixed key", async () => {
    state.redisGetValue = "some-lock-value";
    const locked = await isWorkflowLocked("wf", "id");

    expect(locked).toBe(true);
    // check.ts prefixes the lock key with an extra "lock:" (matches redis lock layout)
    expect(redisGet).toHaveBeenCalledWith(`lock:${getLockKey("wf", "id")}`);
  });

  it("returns false when redis returns null", async () => {
    state.redisGetValue = null;
    const locked = await isWorkflowLocked("wf", "id");
    expect(locked).toBe(false);
  });
});

// =============================================================================
// lock/extend
// =============================================================================

describe("lock/extend: extendWorkflowLock", () => {
  it("returns true when the lua script reports the TTL was extended (1)", async () => {
    state.redisEvalResult = 1;
    const ok = await extendWorkflowLock("wf", "id", "lock-value", 60000);

    expect(ok).toBe(true);
    expect(redisEval).toHaveBeenCalledTimes(1);
    // eval(script, numKeys=1, key, lockValue, ttlString)
    const callArgs = redisEval.mock.calls[0];
    expect(callArgs[1]).toBe(1);
    expect(callArgs[2]).toBe(`lock:${getLockKey("wf", "id")}`);
    expect(callArgs[3]).toBe("lock-value");
    expect(callArgs[4]).toBe("60000"); // ttl stringified
  });

  it("returns false when the script reports not-held / expired (0)", async () => {
    state.redisEvalResult = 0;
    const ok = await extendWorkflowLock("wf", "id", "lock-value", 60000);
    expect(ok).toBe(false);
  });
});
