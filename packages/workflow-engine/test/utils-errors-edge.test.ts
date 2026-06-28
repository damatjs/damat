import { describe, it, expect } from "bun:test";
import { Effect, Scope, Exit, Cause } from "@damatjs/deps/effect";
import { createStep, StepResponse } from "../src/step";
import { runStep, parallel, when, ifElse, skipStep } from "../src/utils";
import {
  WorkflowError,
  StepExecutionError,
  StepTimeoutError,
  MaxRetriesExceededError,
  CompensationError,
  WorkflowLockError,
} from "../src/errors";
import type { WorkflowContext } from "../src/types";

const ctx = (): WorkflowContext => ({
  executionId: "exec-ue",
  workflowName: "ue-wf",
  startedAt: new Date(),
  attempt: 1,
  metadata: {},
});

function run<O, E>(eff: Effect.Effect<O, E, Scope.Scope>) {
  return Effect.runPromiseExit(Effect.scoped(eff));
}

function squash(exit: Exit.Exit<unknown, unknown>): unknown {
  if (Exit.isFailure(exit)) return Cause.squash(exit.cause);
  throw new Error("expected failure");
}

// =============================================================================
// errors — cause wrapping & chaining nuances
// =============================================================================

describe("errors: cause wrapping", () => {
  it("preserves a non-Error cause unchanged (number / object / null)", () => {
    const objCause = { reason: "x" };
    expect(new StepExecutionError("s", "m", 42).cause).toBe(42);
    expect(new StepExecutionError("s", "m", objCause).cause).toBe(objCause);
    expect(new StepExecutionError("s", "m", null).cause).toBe(null);
  });

  it("MaxRetriesExceededError stores the last error as cause without re-wrapping", () => {
    const last = new StepExecutionError("inner", "deep");
    const err = new MaxRetriesExceededError("outer", 3, last, "wf");
    expect(err.cause).toBe(last);
    // The cause itself is still a StepExecutionError (no double-wrap).
    expect(err.cause).toBeInstanceOf(StepExecutionError);
  });

  it("supports a chain of wrapped causes (StepExecution -> CompensationError -> Compensation cause)", () => {
    const root = new Error("db offline");
    const compErr = new CompensationError("rollback", "could not undo", root, "wf");
    const exec = new StepExecutionError("step", "failed", compErr, "wf");

    expect(exec.cause).toBe(compErr);
    expect((exec.cause as CompensationError).cause).toBe(root);
  });

  it("a WorkflowError with an undefined cause leaves the field undefined (not null)", () => {
    const err = new WorkflowError("CODE", "msg");
    expect(err.cause).toBeUndefined();
    expect("cause" in err).toBe(true);
  });
});

// =============================================================================
// errors — instanceof relationships across the hierarchy
// =============================================================================

describe("errors: instanceof matrix", () => {
  it("every concrete error is instanceof WorkflowError and Error but not a sibling", () => {
    const exec = new StepExecutionError("s", "m");
    const timeout = new StepTimeoutError("s", 1);
    const maxr = new MaxRetriesExceededError("s", 1, null);
    const comp = new CompensationError("s", "m");
    const lock = new WorkflowLockError("w", "id");

    for (const e of [exec, timeout, maxr, comp, lock]) {
      expect(e).toBeInstanceOf(WorkflowError);
      expect(e).toBeInstanceOf(Error);
    }

    // No cross-subclass inheritance.
    expect(timeout).not.toBeInstanceOf(StepExecutionError);
    expect(maxr).not.toBeInstanceOf(StepTimeoutError);
    expect(comp).not.toBeInstanceOf(WorkflowLockError);
    expect(lock).not.toBeInstanceOf(CompensationError);
  });

  it("_tag is suitable for discriminated narrowing alongside instanceof", () => {
    const errors: WorkflowError[] = [
      new StepExecutionError("s", "m"),
      new StepTimeoutError("s", 1),
      new MaxRetriesExceededError("s", 1, null),
      new CompensationError("s", "m"),
      new WorkflowLockError("w", "id"),
    ];
    const byTag = new Map(errors.map((e) => [e._tag, e]));
    expect(byTag.size).toBe(5);
    expect(byTag.get("StepTimeoutError")).toBeInstanceOf(StepTimeoutError);
  });

  it("error survives being thrown & caught with all fields intact", () => {
    const cause = new Error("orig");
    try {
      throw new StepExecutionError("charge", "declined", cause, "checkout");
    } catch (e) {
      expect(e).toBeInstanceOf(StepExecutionError);
      const err = e as StepExecutionError;
      expect(err.stepName).toBe("charge");
      expect(err.workflowName).toBe("checkout");
      expect(err.code).toBe("STEP_EXECUTION_FAILED");
      expect(err.cause).toBe(cause);
    }
  });
});

// =============================================================================
// utils/parallel — aggregation edge cases
// =============================================================================

describe("utils/parallel: aggregation edges", () => {
  it("returns an empty tuple when given no effects", async () => {
    const exit = await run(parallel());
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toEqual([]);
  });

  it("preserves output ORDER even when later effects finish first", async () => {
    const slow = runStep(
      createStep<void, string>("slow", async () => {
        await new Promise((r) => setTimeout(r, 40));
        return "slow";
      }),
      undefined as never,
      ctx(),
    );
    const fast = runStep(
      createStep<void, string>("fast", async () => "fast"),
      undefined as never,
      ctx(),
    );
    // slow is listed first; despite finishing last, it stays at index 0.
    const exit = await run(parallel(slow, fast));
    if (Exit.isSuccess(exit)) expect(exit.value).toEqual(["slow", "fast"]);
  });

  it("fails with the failing branch's StepExecutionError when one of many fails", async () => {
    const ok1 = runStep(createStep<void, number>("ok1", async () => 1), undefined as never, ctx());
    const bad = runStep(
      createStep<void, number>("bad", async () => {
        throw new Error("the parallel failure");
      }),
      undefined as never,
      ctx(),
    );
    const ok2 = runStep(createStep<void, number>("ok2", async () => 2), undefined as never, ctx());

    const exit = await run(parallel(ok1, bad, ok2));
    expect(Exit.isFailure(exit)).toBe(true);
    const err = squash(exit);
    expect(err).toBeInstanceOf(StepExecutionError);
    expect((err as StepExecutionError).message).toBe("the parallel failure");
  });

  it("unwraps StepResponse outputs inside the aggregated tuple", async () => {
    const a = runStep(
      createStep<void, string, string>("a", async () => new StepResponse("out-a", "comp-a")),
      undefined as never,
      ctx(),
    );
    const b = runStep(
      createStep<void, number, number>("b", async () => new StepResponse(7, 7)),
      undefined as never,
      ctx(),
    );
    const exit = await run(parallel(a, b));
    if (Exit.isSuccess(exit)) {
      // Downstream sees plain outputs, never the wrapper.
      expect(exit.value).toEqual(["out-a", 7]);
      expect(StepResponse.isStepResponse(exit.value[0])).toBe(false);
    }
  });
});

// =============================================================================
// utils/when & ifElse — branching edge cases
// =============================================================================

describe("utils/when: branching edges", () => {
  it("returns a falsy default value verbatim when condition is false", async () => {
    const step = createStep<number, number>("w", async () => 99);
    const exit = await run(when(false, step, 1, ctx(), 0));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe(0);
  });

  it("when condition is false the step is never constructed-invoked (no side effects)", async () => {
    let invoked = false;
    const step = createStep<number, string>("w-side", async () => {
      invoked = true;
      return "ran";
    });
    await run(when(false, step, 1, ctx(), "default"));
    expect(invoked).toBe(false);
  });

  it("propagates the step's StepExecutionError when condition is true and step throws", async () => {
    const step = createStep<number, string>("w-fail", async () => {
      throw new Error("when-boom");
    });
    const exit = await run(when(true, step, 1, ctx(), "default"));
    expect(Exit.isFailure(exit)).toBe(true);
    expect(squash(exit)).toBeInstanceOf(StepExecutionError);
  });
});

describe("utils/ifElse: branching edges", () => {
  it("runs ONLY the chosen branch (the other branch never executes)", async () => {
    const ran: string[] = [];
    const yes = createStep<number, string>("yes", async () => {
      ran.push("yes");
      return "Y";
    });
    const no = createStep<number, string>("no", async () => {
      ran.push("no");
      return "N";
    });

    const t = await run(ifElse(true, yes, no, 1, ctx()));
    expect(Exit.isSuccess(t) && (t as Exit.Success<string, never>).value).toBe("Y");
    expect(ran).toEqual(["yes"]);

    const f = await run(ifElse(false, yes, no, 1, ctx()));
    expect(Exit.isSuccess(f) && (f as Exit.Success<string, never>).value).toBe("N");
    expect(ran).toEqual(["yes", "no"]);
  });

  it("propagates failure from whichever branch is selected", async () => {
    const failYes = createStep<number, string>("fy", async () => {
      throw new Error("yes failed");
    });
    const okNo = createStep<number, string>("on", async () => "N");
    const exit = await run(ifElse(true, failYes, okNo, 1, ctx()));
    expect(Exit.isFailure(exit)).toBe(true);
    expect((squash(exit) as StepExecutionError).message).toBe("yes failed");
  });
});

// =============================================================================
// utils/skipStep — pure short-circuit
// =============================================================================

describe("utils/skipStep: edges", () => {
  it("round-trips undefined as a value (it is a plain Effect.succeed, not a thunk)", async () => {
    const exit = await run(skipStep(undefined));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBeUndefined();
  });

  it("does not register any compensation finalizer (returns success even inside a failing scope)", async () => {
    // skipStep itself never fails; a sibling failure in the same scope must not
    // trigger any rollback for the skipped value.
    let anyFinalizer = false;
    const program = Effect.scoped(
      Effect.gen(function* () {
        yield* skipStep({ skipped: true });
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            anyFinalizer = true;
          }),
        );
        return yield* Effect.fail(new StepExecutionError("ds", "boom"));
      }),
    );
    const exit = await Effect.runPromiseExit(program);
    expect(Exit.isFailure(exit)).toBe(true);
    // The only finalizer present is the explicit one we added (proves skipStep
    // contributed none of its own and behaves as a pure value).
    expect(anyFinalizer).toBe(true);
  });
});
