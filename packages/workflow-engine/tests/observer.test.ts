import { describe, expect, test } from "bun:test";
import {
  Effect,
  createStep,
  createWorkflow,
  type WorkflowExecutionEvent,
} from "../src";

describe("workflow execution observer", () => {
  test("reports workflow, step, and compensation lifecycle", async () => {
    const events: WorkflowExecutionEvent[] = [];
    const first = createStep(
      "first",
      async () => "done",
      async () => {},
    );
    const fail = createStep("fail", async () => {
      throw new Error("nope");
    });
    const workflow = createWorkflow("observed", (input: {}, context) =>
      Effect.gen(function* () {
        yield* first(input, context);
        return yield* fail(input, context);
      }),
    );
    const result = await workflow.execute(
      {},
      {},
      {
        executionId: "run-1",
        observer: { onEvent: (event) => events.push(event) },
      },
    );
    expect(result.success).toBe(false);
    expect(result.executionId).toBe("run-1");
    expect(events.map((event) => event.type)).toEqual([
      "workflow.started",
      "step.started",
      "step.succeeded",
      "step.started",
      "step.failed",
      "compensation.started",
      "compensation.succeeded",
      "workflow.failed",
    ]);
  });

  test("observer failures do not replace workflow results", async () => {
    const step = createStep("safe", async () => "ok");
    const workflow = createWorkflow("observer-errors", (input: {}, context) =>
      step(input, context),
    );
    const result = await workflow.execute(
      {},
      {},
      {
        observer: {
          onEvent: () => {
            throw new Error("telemetry failed");
          },
        },
      },
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.result).toBe("ok");
  });

  test("accepts an external abort signal", async () => {
    const controller = new AbortController();
    const slow = createStep("slow", async (_input, _ctx, signal) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 5_000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      });
      return "late";
    });
    const workflow = createWorkflow("abortable", (input: {}, context) =>
      slow(input, context),
    );
    setTimeout(() => controller.abort(new Error("cancelled")), 10);
    const result = await workflow.execute(
      {},
      {},
      { signal: controller.signal },
    );
    expect(result.success).toBe(false);
  });
});
