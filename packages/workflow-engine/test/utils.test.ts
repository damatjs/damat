import { describe, it, expect } from "bun:test";
import { Effect, Scope, Exit, Cause } from "@damatjs/deps/effect";
import { createStep } from "../src/step";
import { runStep, skipStep, parallel, when, ifElse } from "../src/utils";
import { StepExecutionError } from "../src/index";
import type { WorkflowContext } from "../src/types";

const ctx = (): WorkflowContext => ({
  executionId: "exec-1",
  workflowName: "test-wf",
  startedAt: new Date(),
  attempt: 1,
  metadata: {},
});

function run<O, E>(eff: Effect.Effect<O, E, Scope.Scope>) {
  return Effect.runPromiseExit(Effect.scoped(eff));
}

// =============================================================================
// utils/runStep
// =============================================================================

describe("utils/runStep", () => {
  it("delegates to executeStep and returns the output", async () => {
    const step = createStep<number, number>("rs", async (n) => n * 3);
    const exit = await run(runStep(step, 4, ctx()));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe(12);
  });

  it("surfaces step failures as StepExecutionError", async () => {
    const step = createStep<number, number>("rs-fail", async () => {
      throw new Error("nope");
    });
    const exit = await run(runStep(step, 1, ctx()));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(StepExecutionError);
    }
  });
});

// =============================================================================
// utils/skipStep
// =============================================================================

describe("utils/skipStep", () => {
  it("succeeds immediately with the provided value", async () => {
    const exit = await run(skipStep({ done: true, n: 5 }));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toEqual({ done: true, n: 5 });
  });

  it("works with primitive values", async () => {
    const exit = await run(skipStep(42));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe(42);
  });

  it("never invokes any side effect (it is a pure Effect.succeed)", async () => {
    // skipStep takes a plain value, not a thunk, so there is nothing to run;
    // confirm it round-trips falsy values correctly too.
    const exit = await run(skipStep(0));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe(0);
  });
});

// =============================================================================
// utils/parallel
// =============================================================================

describe("utils/parallel", () => {
  it("runs all effects concurrently and returns a tuple of outputs in order", async () => {
    // Deterministic concurrency proof: every step blocks on a barrier that
    // only opens once ALL of them have started. Sequential execution would
    // deadlock (and fail via timeout) — no sleep-overlap timing to flake on.
    let started = 0;
    let release!: () => void;
    const allStarted = new Promise<void>((r) => (release = r));
    const mk = (val: number) =>
      runStep(
        createStep<void, number>(`s${val}`, async () => {
          started++;
          if (started === 3) release();
          await allStarted;
          return val;
        }),
        undefined as never,
        ctx(),
      );

    const exit = await run(parallel(mk(1), mk(2), mk(3)));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toEqual([1, 2, 3]);
    expect(started).toBe(3);
  });

  it("supports heterogeneous output types in the result tuple", async () => {
    const a = runStep(
      createStep<void, string>("a", async () => "x"),
      undefined as never,
      ctx(),
    );
    const b = runStep(
      createStep<void, number>("b", async () => 7),
      undefined as never,
      ctx(),
    );
    const exit = await run(parallel(a, b));
    if (Exit.isSuccess(exit)) expect(exit.value).toEqual(["x", 7]);
  });

  it("fails if any effect fails", async () => {
    const ok = runStep(
      createStep<void, number>("ok", async () => 1),
      undefined as never,
      ctx(),
    );
    const bad = runStep(
      createStep<void, number>("bad", async () => {
        throw new Error("parallel failure");
      }),
      undefined as never,
      ctx(),
    );
    const exit = await run(parallel(ok, bad));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toBeInstanceOf(StepExecutionError);
    }
  });

  it("handles a single effect", async () => {
    const a = runStep(
      createStep<void, number>("solo", async () => 99),
      undefined as never,
      ctx(),
    );
    const exit = await run(parallel(a));
    if (Exit.isSuccess(exit)) expect(exit.value).toEqual([99]);
  });
});

// =============================================================================
// utils/conditional: when
// =============================================================================

describe("utils/when", () => {
  it("executes the step when condition is true", async () => {
    let ran = false;
    const step = createStep<number, string>("w", async (n) => {
      ran = true;
      return `ran-${n}`;
    });
    const exit = await run(when(true, step, 8, ctx(), "default"));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("ran-8");
    expect(ran).toBe(true);
  });

  it("returns the default value (without running the step) when condition is false", async () => {
    let ran = false;
    const step = createStep<number, string>("w", async () => {
      ran = true;
      return "should-not-run";
    });
    const exit = await run(when(false, step, 8, ctx(), "default"));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("default");
    expect(ran).toBe(false);
  });

  it("propagates a step failure when condition is true", async () => {
    const step = createStep<number, string>("w-fail", async () => {
      throw new Error("boom");
    });
    const exit = await run(when(true, step, 1, ctx(), "default"));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

// =============================================================================
// utils/conditional: ifElse
// =============================================================================

describe("utils/ifElse", () => {
  it("runs the ifTrue branch when condition is true", async () => {
    const branches: string[] = [];
    const yes = createStep<number, string>("yes", async () => {
      branches.push("yes");
      return "YES";
    });
    const no = createStep<number, string>("no", async () => {
      branches.push("no");
      return "NO";
    });
    const exit = await run(ifElse(true, yes, no, 1, ctx()));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("YES");
    expect(branches).toEqual(["yes"]); // only the chosen branch ran
  });

  it("runs the ifFalse branch when condition is false", async () => {
    const branches: string[] = [];
    const yes = createStep<number, string>("yes", async () => {
      branches.push("yes");
      return "YES";
    });
    const no = createStep<number, string>("no", async () => {
      branches.push("no");
      return "NO";
    });
    const exit = await run(ifElse(false, yes, no, 1, ctx()));
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("NO");
    expect(branches).toEqual(["no"]);
  });

  it("propagates failure from the chosen branch", async () => {
    const yes = createStep<number, string>("yes", async () => {
      throw new Error("yes failed");
    });
    const no = createStep<number, string>("no", async () => "NO");
    const exit = await run(ifElse(true, yes, no, 1, ctx()));
    expect(Exit.isFailure(exit)).toBe(true);
  });
});
