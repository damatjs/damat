import { describe, it, expect } from "bun:test";
import {
  WorkflowError,
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  CompensationError,
  WorkflowLockError,
} from "../src/errors";

// =============================================================================
// errors/* — class hierarchy, message formatting, captured fields, tags
// =============================================================================

describe("errors: WorkflowError (base)", () => {
  it("is an Error subclass with name, code, message and optional fields", () => {
    const cause = new Error("boom");
    const err = new WorkflowError(
      "CODE",
      "something broke",
      "wf",
      "step",
      cause,
    );

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WorkflowError);
    expect(err.name).toBe("WorkflowError");
    expect(err.message).toBe("something broke");
    expect(err.code).toBe("CODE");
    expect(err.workflowName).toBe("wf");
    expect(err.stepName).toBe("step");
    expect(err.cause).toBe(cause);
    expect(err._tag).toBe("WorkflowError");
  });

  it("leaves workflowName/stepName/cause undefined when omitted", () => {
    const err = new WorkflowError("CODE", "msg");
    expect(err.workflowName).toBeUndefined();
    expect(err.stepName).toBeUndefined();
    expect(err.cause).toBeUndefined();
  });

  it("carries a stack trace", () => {
    const err = new WorkflowError("CODE", "msg");
    expect(typeof err.stack).toBe("string");
  });
});

describe("errors: StepExecutionError", () => {
  it("formats with STEP_EXECUTION_FAILED code and preserves step/cause/workflow", () => {
    const cause = new Error("db down");
    const err = new StepExecutionError(
      "charge-card",
      "payment failed",
      cause,
      "checkout",
    );

    expect(err).toBeInstanceOf(WorkflowError);
    expect(err).toBeInstanceOf(StepExecutionError);
    expect(err.name).toBe("StepExecutionError");
    expect(err._tag).toBe("StepExecutionError");
    expect(err.code).toBe("STEP_EXECUTION_FAILED");
    expect(err.message).toBe("payment failed");
    expect(err.stepName).toBe("charge-card");
    expect(err.workflowName).toBe("checkout");
    expect(err.cause).toBe(cause);
  });

  it("works without cause/workflowName", () => {
    const err = new StepExecutionError("s", "m");
    expect(err.cause).toBeUndefined();
    expect(err.workflowName).toBeUndefined();
    expect(err.stepName).toBe("s");
  });
});

describe("errors: StepTimeoutError", () => {
  it("builds a descriptive message and stores timeoutMs", () => {
    const err = new StepTimeoutError("slow-step", 5000, "wf");

    expect(err).toBeInstanceOf(WorkflowError);
    expect(err).toBeInstanceOf(StepTimeoutError);
    expect(err.name).toBe("StepTimeoutError");
    expect(err._tag).toBe("StepTimeoutError");
    expect(err.code).toBe("STEP_TIMEOUT");
    expect(err.message).toBe("Step 'slow-step' timed out after 5000ms");
    expect(err.timeoutMs).toBe(5000);
    expect(err.stepName).toBe("slow-step");
    expect(err.workflowName).toBe("wf");
  });

  it("does not capture a cause (timeout has no underlying error)", () => {
    const err = new StepTimeoutError("s", 10);
    expect(err.cause).toBeUndefined();
  });
});

describe("errors: MaxRetriesExceededError", () => {
  it("formats with retry count and stores maxRetries + lastError as cause", () => {
    const lastError = new Error("still failing");
    const err = new MaxRetriesExceededError("flaky", 3, lastError, "wf");

    expect(err).toBeInstanceOf(WorkflowError);
    expect(err).toBeInstanceOf(MaxRetriesExceededError);
    expect(err.name).toBe("MaxRetriesExceededError");
    expect(err._tag).toBe("MaxRetriesExceededError");
    expect(err.code).toBe("MAX_RETRIES_EXCEEDED");
    expect(err.message).toBe("Step 'flaky' failed after 3 retries");
    expect(err.maxRetries).toBe(3);
    expect(err.stepName).toBe("flaky");
    expect(err.workflowName).toBe("wf");
    // lastError is threaded through as the WorkflowError cause
    expect(err.cause).toBe(lastError);
  });

  it("accepts a non-Error lastError", () => {
    const err = new MaxRetriesExceededError("s", 1, "string failure");
    expect(err.cause).toBe("string failure");
    expect(err.message).toBe("Step 's' failed after 1 retries");
  });
});

describe("errors: CompensationError", () => {
  it("formats with COMPENSATION_FAILED code and preserves step/cause/workflow", () => {
    const cause = new Error("rollback failed");
    const err = new CompensationError(
      "create-order",
      "could not cancel",
      cause,
      "checkout",
    );

    expect(err).toBeInstanceOf(WorkflowError);
    expect(err).toBeInstanceOf(CompensationError);
    expect(err.name).toBe("CompensationError");
    expect(err._tag).toBe("CompensationError");
    expect(err.code).toBe("COMPENSATION_FAILED");
    expect(err.message).toBe("could not cancel");
    expect(err.stepName).toBe("create-order");
    expect(err.workflowName).toBe("checkout");
    expect(err.cause).toBe(cause);
  });
});

describe("errors: WorkflowLockError", () => {
  it("auto-builds the 'already running' message and stores lockId", () => {
    const err = new WorkflowLockError("process-order", "order-123");

    expect(err).toBeInstanceOf(WorkflowError);
    expect(err).toBeInstanceOf(WorkflowLockError);
    expect(err.name).toBe("WorkflowLockError");
    expect(err._tag).toBe("WorkflowLockError");
    expect(err.code).toBe("WORKFLOW_LOCKED");
    expect(err.message).toBe(
      "Workflow 'process-order' is already running with lock ID 'order-123'",
    );
    expect(err.lockId).toBe("order-123");
    expect(err.workflowName).toBe("process-order");
    // No stepName / cause for a lock error
    expect(err.stepName).toBeUndefined();
    expect(err.cause).toBeUndefined();
  });
});

describe("errors: cross-class relationships", () => {
  it("all subclasses are instanceof WorkflowError and Error", () => {
    const errs = [
      new StepExecutionError("s", "m"),
      new StepTimeoutError("s", 1),
      new MaxRetriesExceededError("s", 1, new Error()),
      new CompensationError("s", "m"),
      new WorkflowLockError("w", "id"),
    ];
    for (const e of errs) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it("each subclass has a unique _tag for discriminated handling", () => {
    const tags = new Set([
      new WorkflowError("c", "m")._tag,
      new StepExecutionError("s", "m")._tag,
      new StepTimeoutError("s", 1)._tag,
      new MaxRetriesExceededError("s", 1, null)._tag,
      new CompensationError("s", "m")._tag,
      new WorkflowLockError("w", "id")._tag,
    ]);
    expect(tags.size).toBe(6);
  });

  it("subclasses are not instances of each other", () => {
    const exec = new StepExecutionError("s", "m");
    expect(exec).not.toBeInstanceOf(StepTimeoutError);
    expect(exec).not.toBeInstanceOf(CompensationError);
  });
});
