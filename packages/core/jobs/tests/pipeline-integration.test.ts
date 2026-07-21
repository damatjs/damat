import { afterEach, expect, test } from "bun:test";
import {
  clearJobTerminalListener,
  configureJobTerminalListener,
} from "../src/pipeline-integration";
import { pipelineJobBinding } from "../src/terminal/binding";
import { notifyJobTerminal } from "../src/terminal/listener";
import type { ClaimedJobRun } from "../src/worker/types";

afterEach(clearJobTerminalListener);

test("reads only complete pipeline bindings from job metadata", () => {
  expect(
    pipelineJobBinding({
      _damatPipeline: {
        runId: "run",
        nodeExecutionId: "node",
        pipeline: "onboarding",
      },
    }),
  ).toEqual({ runId: "run", nodeExecutionId: "node", pipeline: "onboarding" });
  expect(
    pipelineJobBinding({ _damatPipeline: { runId: "run" } }),
  ).toBeUndefined();
});

test("notifies the process listener only for pipeline-owned terminal jobs", async () => {
  const seen: unknown[] = [];
  configureJobTerminalListener((binding, status) =>
    seen.push({ binding, status }),
  );
  await notifyJobTerminal(claim({}), "succeeded");
  await notifyJobTerminal(
    claim({
      _damatPipeline: {
        runId: "run",
        nodeExecutionId: "node",
        pipeline: "onboarding",
      },
    }),
    "cancelled",
  );
  expect(seen).toEqual([
    {
      binding: {
        runId: "run",
        nodeExecutionId: "node",
        pipeline: "onboarding",
      },
      status: "cancelled",
    },
  ]);
});

test("listener failures never replace a committed terminal result", async () => {
  configureJobTerminalListener(() => {
    throw new Error("transport unavailable");
  });
  await expect(
    notifyJobTerminal(
      claim({
        _damatPipeline: {
          runId: "run",
          nodeExecutionId: "node",
          pipeline: "onboarding",
        },
      }),
      "dead_lettered",
    ),
  ).resolves.toBeUndefined();
});

function claim(metadata: Record<string, unknown>): ClaimedJobRun {
  return { metadata } as ClaimedJobRun;
}
