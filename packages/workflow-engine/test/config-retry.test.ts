import { describe, it, expect } from "bun:test";
import {
  DEFAULT_RETRY_POLICY,
  DEFAULT_STEP_CONFIG,
  DEFAULT_WORKFLOW_CONFIG,
  RetryPolicies,
} from "../src/config";
import type { RetryPolicy } from "../src/types";

// =============================================================================
// config/retry — retry policy presets & defaults (pure, deterministic)
// =============================================================================

describe("config/retry: DEFAULT_RETRY_POLICY", () => {
  it("defaults to no retries with sane backoff bounds", () => {
    expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(0);
    expect(DEFAULT_RETRY_POLICY.initialDelayMs).toBe(100);
    expect(DEFAULT_RETRY_POLICY.maxDelayMs).toBe(5000);
    expect(DEFAULT_RETRY_POLICY.backoffMultiplier).toBe(2);
  });

  it("does not define a custom isRetryable predicate", () => {
    expect(DEFAULT_RETRY_POLICY.isRetryable).toBeUndefined();
  });

  it("has a fully-populated (Required) shape — every RetryPolicy field present", () => {
    const keys = Object.keys(DEFAULT_RETRY_POLICY).sort();
    expect(keys).toEqual(
      ["backoffMultiplier", "initialDelayMs", "maxAttempts", "maxDelayMs"].sort(),
    );
  });
});

describe("config/retry: DEFAULT_STEP_CONFIG", () => {
  it("uses 30s timeout, default retry policy, non-idempotent, empty description", () => {
    expect(DEFAULT_STEP_CONFIG.timeoutMs).toBe(30_000);
    expect(DEFAULT_STEP_CONFIG.retry).toBe(DEFAULT_RETRY_POLICY);
    expect(DEFAULT_STEP_CONFIG.idempotent).toBe(false);
    expect(DEFAULT_STEP_CONFIG.description).toBe("");
  });
});

describe("config/retry: DEFAULT_WORKFLOW_CONFIG", () => {
  it("uses 5min timeout and embeds the default step config", () => {
    expect(DEFAULT_WORKFLOW_CONFIG.timeoutMs).toBe(300_000);
    expect(DEFAULT_WORKFLOW_CONFIG.defaultStepConfig).toBe(DEFAULT_STEP_CONFIG);
  });
});

describe("config/retry: RetryPolicies presets", () => {
  it("exposes the five documented presets", () => {
    expect(Object.keys(RetryPolicies).sort()).toEqual(
      ["aggressive", "none", "once", "patient", "standard"].sort(),
    );
  });

  it("none = fail immediately (0 attempts)", () => {
    expect(RetryPolicies.none.maxAttempts).toBe(0);
  });

  it("once = single immediate retry (1 attempt, no delay)", () => {
    expect(RetryPolicies.once.maxAttempts).toBe(1);
    expect(RetryPolicies.once.initialDelayMs).toBe(0);
  });

  it("standard = 3 attempts, exponential backoff, 100ms->5s", () => {
    expect(RetryPolicies.standard).toEqual({
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
    });
  });

  it("aggressive = 5 attempts with longer max delay", () => {
    expect(RetryPolicies.aggressive.maxAttempts).toBe(5);
    expect(RetryPolicies.aggressive.maxDelayMs).toBe(10000);
    expect(RetryPolicies.aggressive.initialDelayMs).toBe(50);
  });

  it("patient = longer delays with multiplier 3 for rate-limited APIs", () => {
    expect(RetryPolicies.patient.maxAttempts).toBe(3);
    expect(RetryPolicies.patient.initialDelayMs).toBe(1000);
    expect(RetryPolicies.patient.maxDelayMs).toBe(30000);
    expect(RetryPolicies.patient.backoffMultiplier).toBe(3);
  });

  it("presets are partial — only override the fields they specify (rely on defaults for the rest)", () => {
    // `none` and `once` deliberately omit backoffMultiplier/maxDelayMs.
    expect(RetryPolicies.none.backoffMultiplier).toBeUndefined();
    expect(RetryPolicies.once.maxDelayMs).toBeUndefined();
  });

  it("merging a preset over DEFAULT_RETRY_POLICY yields a complete policy (the real merge pattern)", () => {
    const merged: RetryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...RetryPolicies.once,
    };
    expect(merged).toEqual({
      maxAttempts: 1,
      initialDelayMs: 0,
      maxDelayMs: 5000, // inherited from default
      backoffMultiplier: 2, // inherited from default
    });
  });
});
