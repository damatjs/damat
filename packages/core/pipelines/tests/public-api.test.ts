import { expect, expectTypeOf, test } from "bun:test";
import type { PipelineInput } from "@damatjs/pipelines";
import * as pipelines from "../src";

declare module "@damatjs/pipelines" {
  interface PipelineMap {
    "typed.pipeline": {
      input: { orderId: string };
      output: { accepted: boolean };
    };
  }
}

test("exports code, runtime, authoring, and inspection contracts", () => {
  expect(pipelines.definePipeline).toBeFunction();
  expect(pipelines.startPipeline).toBeFunction();
  expect(pipelines.signalPipelineRun).toBeFunction();
  expect(pipelines.PipelineRouter).toBeFunction();
  expect(pipelines.createPipelineAuthoringClient).toBeFunction();
  expect(pipelines.createPipelineInspectionClient).toBeFunction();
  expect(pipelines.subscribePipelineInvalidations).toBeFunction();
  expect(pipelines.runPipelineRetention).toBeFunction();
  expectTypeOf<PipelineInput<"typed.pipeline">>().toEqualTypeOf<{
    orderId: string;
  }>();
});
